import { monitoredServerFetch } from '../../utils/debug/server';
import {
  claimScheduledNewsletterRecord,
  createScheduledNewsletterRecord,
  deleteScheduledNewsletterRecord,
  getDueScheduledNewsletterRecords,
  getScheduledNewsletterRecordById,
  getScheduledNewsletterRecords,
  markScheduledNewsletterRecordFailed,
  markScheduledNewsletterRecordSent,
  updateScheduledNewsletterRecord,
} from './db';

const MAX_SUBJECT_LENGTH = 160;
const MAX_BODY_LENGTH = 20000;
const SENDGRID_BATCH_SIZE = 500;

type ScheduledNewsletterRecord = {
  id: number;
  subject: string;
  body_text: string;
  recipient_emails_json: string;
  recipient_count: number;
  scheduled_for: string;
  status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

export type NewsletterQueueItem = {
  id: number;
  subject: string;
  bodyText: string;
  recipientEmails: string[];
  recipientCount: number;
  scheduledFor: string;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

export async function listNewsletterQueue(limit = 20) {
  const rows = await getScheduledNewsletterRecords(limit);
  return rows.map(mapNewsletterRow);
}

export async function updateQueuedNewsletter(params: {
  id: number;
  subject: string;
  bodyText: string;
  scheduledFor: string;
  recipientEmails: string[];
}) {
  const existingRecord = await getScheduledNewsletterRecordById(params.id);

  if (!existingRecord) {
    throw new Error('That newsletter queue item no longer exists.');
  }

  if (!['scheduled', 'failed'].includes(existingRecord.status)) {
    throw new Error('Only scheduled or failed newsletters can be edited.');
  }

  const subject = params.subject.trim();
  const bodyText = params.bodyText.trim();
  const recipientEmails = normalizeRecipientEmails(params.recipientEmails);
  const scheduledFor = normalizeScheduledFor(params.scheduledFor);

  validateNewsletterDraft({ subject, bodyText, recipientEmails });

  const updated = await updateScheduledNewsletterRecord({
    id: params.id,
    subject,
    bodyText,
    recipientEmailsJson: JSON.stringify(recipientEmails),
    recipientCount: recipientEmails.length,
    scheduledFor,
  });

  if (!updated) {
    throw new Error('Unable to update that newsletter queue item.');
  }

  const savedRecord = await getScheduledNewsletterRecordById(params.id);

  if (!savedRecord) {
    throw new Error('Updated newsletter queue item could not be reloaded.');
  }

  return mapNewsletterRow(savedRecord);
}

export async function deleteQueuedNewsletter(id: number) {
  const deleted = await deleteScheduledNewsletterRecord(id);

  if (!deleted) {
    throw new Error('Unable to delete that newsletter queue item.');
  }
}

export async function queueNewsletter(params: {
  subject: string;
  bodyText: string;
  scheduledFor: string;
  recipientEmails: string[];
}) {
  const subject = params.subject.trim();
  const bodyText = params.bodyText.trim();
  const recipientEmails = normalizeRecipientEmails(params.recipientEmails);
  const scheduledFor = normalizeScheduledFor(params.scheduledFor);

  validateNewsletterDraft({ subject, bodyText, recipientEmails });

  if (!hasNewsletterSendConfig()) {
    throw new Error('SendGrid newsletter delivery is not configured on this environment.');
  }

  const record = await createScheduledNewsletterRecord({
    subject,
    bodyText,
    recipientEmailsJson: JSON.stringify(recipientEmails),
    recipientCount: recipientEmails.length,
    scheduledFor,
  });

  if (!record) {
    throw new Error('Failed to create the scheduled newsletter record.');
  }

  return mapNewsletterRow(record);
}

export async function processDueNewsletters(limit = 8) {
  const dueNewsletters = await getDueScheduledNewsletterRecords(limit);
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const newsletter of dueNewsletters) {
    const claimed = await claimScheduledNewsletterRecord(newsletter.id);
    if (!claimed) {
      continue;
    }

    processed += 1;

    try {
      const recipients = parseRecipientEmails(newsletter.recipient_emails_json);

      if (recipients.length === 0) {
        throw new Error('No recipient emails were stored for this newsletter.');
      }

      await sendNewsletterEmail({
        subject: newsletter.subject,
        bodyText: newsletter.body_text,
        recipientEmails: recipients,
      });

      await markScheduledNewsletterRecordSent(newsletter.id);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown newsletter delivery error';
      await markScheduledNewsletterRecordFailed(newsletter.id, truncateError(message));
      failed += 1;
    }
  }

  return { processed, sent, failed };
}

function mapNewsletterRow(row: ScheduledNewsletterRecord): NewsletterQueueItem {
  return {
    id: row.id,
    subject: row.subject,
    bodyText: row.body_text,
    recipientEmails: parseRecipientEmails(row.recipient_emails_json),
    recipientCount: row.recipient_count,
    scheduledFor: toUtcIsoString(row.scheduled_for),
    status: row.status,
    lastError: row.last_error,
    createdAt: toUtcIsoString(row.created_at),
    updatedAt: toUtcIsoString(row.updated_at),
    sentAt: row.sent_at ? toUtcIsoString(row.sent_at) : null,
  };
}

function toUtcIsoString(value: string) {
  const normalizedValue = value.trim().replace(' ', 'T');
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(normalizedValue) ? normalizedValue : `${normalizedValue}Z`;
}

function normalizeRecipientEmails(recipientEmails: string[]) {
  return Array.from(
    new Set(
      recipientEmails
        .map((email) => String(email || '').trim().toLowerCase())
        .filter((email) => email.includes('@')),
    ),
  );
}

function validateNewsletterDraft(params: {
  subject: string;
  bodyText: string;
  recipientEmails: string[];
}) {
  if (!params.subject) {
    throw new Error('Newsletter subject is required.');
  }

  if (params.subject.length > MAX_SUBJECT_LENGTH) {
    throw new Error(`Newsletter subject must be ${MAX_SUBJECT_LENGTH} characters or less.`);
  }

  if (!params.bodyText) {
    throw new Error('Newsletter content is required.');
  }

  if (params.bodyText.length > MAX_BODY_LENGTH) {
    throw new Error(`Newsletter content must be ${MAX_BODY_LENGTH} characters or less.`);
  }

  if (params.recipientEmails.length === 0) {
    throw new Error('Select at least one subscriber before scheduling a newsletter.');
  }
}

function normalizeScheduledFor(value: string) {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);

  if (!hasTimezone) {
    throw new Error('Schedule time must include timezone information. Refresh the dashboard and try again.');
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Choose a valid date and time for the newsletter.');
  }

  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

function parseRecipientEmails(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeRecipientEmails(parsed);
  } catch {
    return [];
  }
}

function truncateError(message: string) {
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function hasNewsletterSendConfig() {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
}

async function sendNewsletterEmail(params: {
  subject: string;
  bodyText: string;
  recipientEmails: string[];
}) {
  if (!hasNewsletterSendConfig()) {
    throw new Error('SendGrid newsletter delivery is not configured on this environment.');
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL as string;
  const fromName = process.env.SENDGRID_FROM_NAME || 'B3U';
  const replyTo = process.env.SENDGRID_REPLY_TO;
  const html = buildNewsletterHtml(params.bodyText);
  const personalizations = params.recipientEmails.map((email) => ({ to: [{ email }] }));

  for (let index = 0; index < personalizations.length; index += SENDGRID_BATCH_SIZE) {
    const batch = personalizations.slice(index, index + SENDGRID_BATCH_SIZE);

    const response = await monitoredServerFetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: batch,
        from: { email: fromEmail, name: fromName },
        ...(replyTo ? { reply_to: { email: replyTo } } : {}),
        subject: params.subject,
        content: [{ type: 'text/html', value: html }],
      }),
    }, { label: 'Scheduled newsletter send', route: 'newsletter-queue', source: 'newsletter-queue' });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`scheduled-newsletter-${response.status}:${detail}`);
    }
  }
}

function buildNewsletterHtml(bodyText: string) {
  const trimmedBody = bodyText.trim();

  if (/^<!doctype html>/i.test(trimmedBody) || /^<html[\s>]/i.test(trimmedBody)) {
    return trimmedBody;
  }

  return buildTakeBackWeeklyLetterHtml(trimmedBody);
}

function buildTakeBackWeeklyLetterHtml(bodyText: string) {
  const sections = bodyText
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  const headerTitle = sections[0] || 'The Take Back Weekly';
  const metaLine = sections[1] || 'By Dr. Bree Charles';
  const tagline = sections[2] || 'Breaking Cycles. Building Legacies.';
  const mainTitle = sections[3] || 'The Take Back Weekly';
  const footerLine = sections.at(-1)?.includes('b3unstoppable') ? sections.at(-1) as string : 'www.b3unstoppable.net | B3U — Burn. Break. Become Unstoppable.';
  const contentSections = sections.slice(4, sections.at(-1) === footerLine ? -1 : undefined);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 700px) {
        .letter-shell { padding: 18px 10px !important; }
        .letter-card { max-width: 100% !important; }
        .letter-header { padding: 24px 22px !important; }
        .letter-main { padding: 28px 24px !important; }
        .letter-title { font-size: 28px !important; line-height: 1.05 !important; }
        .letter-logo-cell { width: 72px !important; }
        .letter-logo { width: 64px !important; height: auto !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;color:#3d3d45;font-family:Arial,Helvetica,sans-serif;">
    <div class="letter-shell" style="padding:32px 16px;background:#f1f5f9;">
      <div class="letter-card" style="max-width:760px;margin:0 auto;background:#ffffff;overflow:hidden;box-shadow:0 18px 48px rgba(10,26,42,0.18);">
        <div class="letter-header" style="border-bottom:4px solid #d0ad4b;background:#17182b;padding:28px 40px;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td class="letter-logo-cell" style="width:88px;vertical-align:top;padding-top:4px;">
                <img class="letter-logo" src="https://www.b3unstoppable.net/images/logos/B3U3D.png" alt="B3U" width="76" style="display:block;width:76px;height:auto;border:0;outline:none;text-decoration:none;">
              </td>
              <td style="vertical-align:top;text-align:right;">
                <h1 class="letter-title" style="margin:0;font-size:31px;line-height:1;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;color:#ffffff;">${escapeHtml(headerTitle)}</h1>
                <p style="margin:12px 0 0;font-size:12px;line-height:1.5;font-weight:700;color:#d4a536;">${escapeHtml(metaLine)}</p>
              </td>
            </tr>
          </table>
        </div>

        <div class="letter-main" style="background:#ffffff;padding:28px 52px;color:#3d3d45;">
          <p style="margin:0 0 32px;text-align:center;font-size:16px;line-height:1.5;color:#d4a536;">${escapeHtml(tagline)}</p>
          <h2 style="margin:0;font-size:20px;line-height:1.2;font-weight:800;color:#17182b;">${escapeHtml(mainTitle)}</h2>
          <div style="margin-top:8px;width:160px;height:1px;background:#c89b2d;"></div>
          <div style="margin-top:24px;font-size:13px;line-height:1.5;letter-spacing:0.01em;color:#3d3d45;">
            ${formatTakeBackWeeklySections(contentSections)}
          </div>
        </div>

        <div style="background:#17182b;padding:18px 32px;text-align:center;color:#ffffff;font-size:11px;line-height:1.6;font-weight:700;">
          ${escapeHtml(footerLine)}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function formatTakeBackWeeklySections(sections: string[]) {
  return sections
    .map((section) => {
      const lines = section.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) {
        return '';
      }

      if (lines.length > 1 && isLikelySectionHeading(lines[0])) {
        const [heading, ...bodyLines] = lines;
        return `${goldRule()}${sectionHeading(heading)}${formatNewsletterBody(bodyLines.join('\n'))}`;
      }

      return formatNewsletterBody(section);
    })
    .join('');
}

function isLikelySectionHeading(value: string) {
  const normalized = value.trim();
  return normalized.length <= 60 && (
    /^featured/i.test(normalized) ||
    /^book/i.test(normalized) ||
    /^what/i.test(normalized) ||
    /affirmation/i.test(normalized) ||
    normalized === normalized.toUpperCase()
  );
}

function goldRule() {
  return '<div style="margin:32px 0;height:1px;width:100%;background:#d1aa45;"></div>';
}

function sectionHeading(value: string) {
  return `<h3 style="margin:0;font-size:20px;line-height:1.2;font-weight:800;color:#17182b;">${escapeHtml(value)}</h3><div style="margin-top:8px;margin-bottom:20px;width:160px;height:1px;background:#c89b2d;"></div>`;
}

function formatNewsletterBody(bodyText: string) {
  return escapeHtml(bodyText)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
