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
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 640px) {
        .email-shell { padding: 18px 10px !important; }
        .email-card { border-radius: 18px !important; }
        .email-header,
        .email-content,
        .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
        .email-title { font-size: 24px !important; line-height: 1.2 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f8fb;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:32px 16px;">
      <div class="email-card" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d7e5f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(10,26,42,0.12);">
        <div class="email-header" style="background:linear-gradient(135deg,#0A1A2A 0%,#173a58 100%);padding:28px 32px 24px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d7e5f0;font-weight:700;margin-bottom:10px;">The Take Back Weekly</div>
          <div class="email-title" style="font-size:30px;line-height:1.1;font-weight:700;margin:0 0 8px;">Burn, Break, Become Unstoppable</div>
          <div style="font-size:14px;line-height:1.6;color:#d7e5f0;">Breaking Cycles. Building Legacies.</div>
        </div>
        <div class="email-content" style="padding:32px;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:10px;">Newsletter</div>
          <div style="font-size:15px;line-height:1.8;color:#102437;">${formatNewsletterBody(bodyText)}</div>
        </div>
        <div class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
          You are receiving this email because you subscribed to B3U updates.<br>
          B3U exists to help people burn away fear, break destructive cycles, and become unstoppable.
        </div>
      </div>
    </div>
  </body>
</html>`;
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