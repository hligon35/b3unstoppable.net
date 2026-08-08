import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { monitoredServerFetch, registerServerProcessMonitoring, withApiMonitoring } from '../../../../utils/debug/server';
import { applyFormsRateLimit, verifyTurnstileToken } from '../../../../utils/security/formsProtection';
import { insertSubscriber } from '../../../lib/db';

type Route = 'contact' | 'newsletter' | 'submit' | 'stories' | 'moderate' | '';

type SubmissionPayload = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  story: string;
  consent: boolean;
  debug: boolean;
  turnstileToken: string;
  honeypot: string;
  timingRejected: boolean;
  fillMs: number | null;
};

const NAME_FIELD_MIN = 2;
const NAME_FIELD_MAX = 128;
const EMAIL_FIELD_MIN = 6;
const EMAIL_FIELD_MAX = 254;
const SUBJECT_FIELD_MIN = 2;
const SUBJECT_FIELD_MAX = 128;
const LONG_FIELD_MIN = 10;
const LONG_FIELD_MAX = 300;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

registerServerProcessMonitoring();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const route = resolveRoute(req);

  if (req.method === 'GET') {
    await handleGet(req, res, route);
    return;
  }

  if (req.method === 'POST') {
    await handlePost(req, res, route);
    return;
  }

  res.status(405).json({ ok: false, error: 'method-not-allowed' });
}

export default withApiMonitoring('forms-api', handler, { capturePayload: true });

async function handleGet(req: NextApiRequest, res: NextApiResponse, route: Route) {
  if (!route) {
    res.status(200).json({
      ok: true,
      routes: ['contact', 'newsletter', 'submit', 'stories', 'moderate'],
      backupConfigured: Boolean(normalizeUrl(process.env.FORMS_BACKUP_URL)),
      sendgridConfigured: hasSendGridConfig(),
      turnstileSiteKey: String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim(),
      runtime: 'node',
    });
    return;
  }

  if (route !== 'stories' && route !== 'moderate') {
    res.status(404).json({ ok: false, error: 'unknown-get-endpoint', route });
    return;
  }

  await proxyGetToBackup(req, res, route);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, route: Route) {
  if (route !== 'contact' && route !== 'newsletter' && route !== 'submit') {
    res.status(404).json({ ok: false, error: 'unknown-post-endpoint', route });
    return;
  }

  const payload = parsePayload(req.body || {});
  const backupUrl = normalizeUrl(process.env.FORMS_BACKUP_URL);
  const sendGridReady = hasSendGridConfig();

  if (!applyFormsRateLimit(req, res, route)) {
    res.status(429).json({ ok: false, error: 'rate-limit-exceeded' });
    return;
  }

  if (payload.honeypot || payload.timingRejected) {
    res.status(200).json({ ok: true, engine: 'filtered' });
    return;
  }

  const missing = validatePayload(route, payload);
  if (missing.length > 0) {
    res.status(400).json({ ok: false, error: 'missing-fields', fields: missing });
    return;
  }

  const tooLong = validateFieldLengths(route, payload);
  if (tooLong.length > 0) {
    res.status(400).json({ ok: false, error: 'field-too-long', fields: tooLong });
    return;
  }

  const tooShort = validateFieldMinimums(route, payload);
  if (tooShort.length > 0) {
    res.status(400).json({ ok: false, error: 'field-too-short', fields: tooShort });
    return;
  }

  if (route === 'contact' || route === 'newsletter' || route === 'submit') {
    const turnstileResult = await verifyTurnstileToken(payload.turnstileToken, req);
    if (!turnstileResult.ok) {
      res.status(403).json({
        ok: false,
        error: 'turnstile-verification-failed',
        codes: payload.debug ? turnstileResult.codes : undefined,
      });
      return;
    }
  }

  if (route === 'submit' && !backupUrl) {
    res.status(503).json({ ok: false, error: 'backup-required-for-story-submissions' });
    return;
  }

  if (!sendGridReady && !backupUrl) {
    res.status(503).json({ ok: false, error: 'no-form-backend-configured' });
    return;
  }

  let localPersisted = false;
  if (route === 'newsletter') {
    try {
      await insertSubscriber(payload.email);
      localPersisted = true;
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: 'newsletter-persist-failed',
        detail: payload.debug ? String(error) : undefined,
      });
      return;
    }
  }

  if (!sendGridReady && backupUrl) {
    const relay = await relayToAppsScript(route, payload, { sendEmails: true, persist: true });
    if (!relay.ok) {
      res.status(502).json({ ok: false, error: 'backup-submit-failed' });
      return;
    }
    res.status(200).json({ ok: true, engine: 'google-app-script', persisted: localPersisted });
    return;
  }

  let persisted = false;
  if (backupUrl) {
    const persistRelay = await relayToAppsScript(route, payload, { sendEmails: false, persist: true });
    persisted = persistRelay.ok;
    if (route === 'submit' && !persisted) {
      res.status(502).json({ ok: false, error: 'story-persist-failed' });
      return;
    }
  }

  try {
    await sendViaSendGrid(route, payload);
    res.status(200).json({ ok: true, engine: 'sendgrid', persisted: persisted || localPersisted });
  } catch (error) {
    if (backupUrl) {
      const fallbackRelay = await relayToAppsScript(route, payload, { sendEmails: true, persist: !persisted });
      if (fallbackRelay.ok) {
        res.status(200).json({ ok: true, engine: 'google-app-script', fallback: true, persisted: true });
        return;
      }
    }

    res.status(502).json({
      ok: false,
      error: 'sendgrid-submit-failed',
      detail: payload.debug ? String(error) : undefined,
    });
  }
}

function applyCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  res.setHeader('Vary', 'Origin');
}

function resolveRoute(req: NextApiRequest): Route {
  const pathValue = req.query.path;
  const firstPath = Array.isArray(pathValue) ? pathValue[0] : pathValue;
  const endpointValue = req.query.endpoint;
  const firstEndpoint = Array.isArray(endpointValue) ? endpointValue[0] : endpointValue;
  const candidate = String(firstPath || firstEndpoint || '').toLowerCase();
  if (candidate === 'contact' || candidate === 'newsletter' || candidate === 'submit' || candidate === 'stories' || candidate === 'moderate') {
    return candidate;
  }
  return '';
}

function parsePayload(input: Record<string, unknown>): SubmissionPayload {
  const submittedAt = Date.now();
  const t0 = Number(String(input.t0 || '0'));
  const fillMs = t0 > 0 ? submittedAt - t0 : null;
  const honeypot = String(input.hp || '').trim();
  return {
    id: String(input.id || crypto.randomUUID()),
    createdAt: String(input.createdAt || new Date().toISOString()),
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim(),
    subject: String(input.subject || '').trim(),
    message: String(input.message || '').trim(),
    story: String(input.story || '').trim(),
    consent: isTruthy(input.consent),
    debug: isTruthy(input.debug),
    turnstileToken: String(input.turnstileToken || input['cf-turnstile-response'] || '').trim(),
    honeypot,
    timingRejected: Boolean(fillMs !== null && (fillMs < 800 || fillMs > 86_400_000)),
    fillMs,
  };
}

function validatePayload(route: Route, payload: SubmissionPayload): string[] {
  if (route === 'contact') {
    return ['name', 'email', 'message'].filter((key) => !payload[key as keyof SubmissionPayload]);
  }
  if (route === 'newsletter') {
    return payload.email ? [] : ['email'];
  }
  if (route === 'submit') {
    return ['name', 'email', 'story'].filter((key) => !payload[key as keyof SubmissionPayload]);
  }
  return ['route'];
}

function validateFieldLengths(route: Route, payload: SubmissionPayload): string[] {
  const tooLong: string[] = [];

  const check = (field: keyof SubmissionPayload, max: number) => {
    if (String(payload[field] || '').length > max) {
      tooLong.push(String(field));
    }
  };

  if (route === 'contact') {
    check('name', NAME_FIELD_MAX);
    check('email', EMAIL_FIELD_MAX);
    check('subject', SUBJECT_FIELD_MAX);
    check('message', LONG_FIELD_MAX);
  }

  if (route === 'newsletter') {
    check('email', EMAIL_FIELD_MAX);
  }

  if (route === 'submit') {
    check('name', NAME_FIELD_MAX);
    check('email', EMAIL_FIELD_MAX);
    check('story', LONG_FIELD_MAX);
  }

  return tooLong;
}

function validateFieldMinimums(route: Route, payload: SubmissionPayload): string[] {
  const tooShort: string[] = [];

  const check = (field: keyof SubmissionPayload, min: number, required = true) => {
    const value = String(payload[field] || '').trim();
    if (!value && !required) {
      return;
    }
    if (value.length < min) {
      tooShort.push(String(field));
    }
  };

  if (route === 'contact') {
    check('name', NAME_FIELD_MIN);
    check('email', EMAIL_FIELD_MIN);
    check('subject', SUBJECT_FIELD_MIN, false);
    check('message', LONG_FIELD_MIN);
  }

  if (route === 'newsletter') {
    check('email', EMAIL_FIELD_MIN);
  }

  if (route === 'submit') {
    check('name', NAME_FIELD_MIN);
    check('email', EMAIL_FIELD_MIN);
    check('story', LONG_FIELD_MIN);
  }

  return tooShort;
}

async function proxyGetToBackup(req: NextApiRequest, res: NextApiResponse, route: Extract<Route, 'stories' | 'moderate'>) {
  const backupUrl = normalizeUrl(process.env.FORMS_BACKUP_URL);
  if (!backupUrl) {
    if (route === 'moderate') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(503).send('<!doctype html><html><body><p>Google Apps Script backup is not configured.</p></body></html>');
      return;
    }
    res.status(503).json({ ok: false, error: 'backup-not-configured' });
    return;
  }

  const target = new URL(backupUrl);
  for (const [key, raw] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(raw)) {
      raw.forEach((value) => target.searchParams.append(key, value));
    } else if (typeof raw === 'string') {
      target.searchParams.set(key, raw);
    }
  }
  target.searchParams.set('endpoint', route);

  res.redirect(307, target.toString());
}

async function relayToAppsScript(
  route: Extract<Route, 'contact' | 'newsletter' | 'submit'>,
  payload: SubmissionPayload,
  options: { sendEmails: boolean; persist: boolean },
): Promise<{ ok: boolean }> {
  const backupUrl = normalizeUrl(process.env.FORMS_BACKUP_URL);
  if (!backupUrl) {
    return { ok: false };
  }

  const target = new URL(backupUrl);
  target.searchParams.set('endpoint', route);

  const formData = new FormData();
  formData.set('id', payload.id);
  formData.set('createdAt', payload.createdAt);
  if (payload.name) formData.set('name', payload.name);
  if (payload.email) formData.set('email', payload.email);
  if (payload.subject) formData.set('subject', payload.subject);
  if (payload.message) formData.set('message', payload.message);
  if (payload.story) formData.set('story', payload.story);
  if (payload.consent) formData.set('consent', 'on');
  if (!options.sendEmails) formData.set('skipEmails', '1');
  if (!options.persist) formData.set('skipPersist', '1');
  if (payload.debug) formData.set('debug', '1');

  const response = await monitoredServerFetch(target.toString(), {
    method: 'POST',
    body: formData,
  }, { label: 'Forms backup POST relay', route, source: 'forms-api' });

  return { ok: response.ok };
}

function hasSendGridConfig(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL && process.env.SENDGRID_TO_EMAIL);
}

async function sendViaSendGrid(route: Extract<Route, 'contact' | 'newsletter' | 'submit'>, payload: SubmissionPayload): Promise<void> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL as string;
  const fromName = process.env.SENDGRID_FROM_NAME || 'B3U';
  const moderatorEmail = process.env.SENDGRID_TO_EMAIL as string;
  const replyTo = process.env.SENDGRID_REPLY_TO;

  if (route === 'contact') {
    await sendGridEmail({
      to: moderatorEmail,
      fromEmail,
      fromName,
      replyTo: payload.email,
      subject: `[Contact] ${payload.subject || 'Contact Form'} - ${payload.name}`,
      html: brandedEmailTemplate({
        eyebrow: 'Contact Request',
        title: `New message from ${escapeHtml(payload.name)}`,
        lead: 'A new inquiry came in through the B3U website contact form.',
        body: `${detailList([
          ['Name', escapeHtml(payload.name)],
          ['Email', escapeHtml(payload.email)],
          ['Subject', escapeHtml(payload.subject || 'Contact Form')],
        ])}${contentCard('Message', nl2br(payload.message))}`,
      }),
    });

    await sendGridEmail({
      to: payload.email,
      fromEmail,
      fromName,
      replyTo: replyTo || moderatorEmail,
      subject: 'We received your message - B3U',
      html: brandedEmailTemplate({
        eyebrow: 'Message Received',
        title: `Thanks for reaching out, ${escapeHtml(payload.name)}`,
        lead: 'Your message is in our inbox. We typically reply within 1-2 business days.',
        body: `<p style="margin:0 0 16px;">We appreciate you taking the time to connect with B3U. If your note is time-sensitive, reply directly to this email and our team will see it.</p>${contentCard('What you sent', `<p style="margin:0 0 8px;"><strong>Subject:</strong> ${escapeHtml(payload.subject || 'Contact Form')}</p><div>${nl2br(payload.message)}</div>`)}`,
      }),
    });
    return;
  }

  if (route === 'newsletter') {
    await upsertSendGridMarketingContact({
      email: payload.email,
      firstName: payload.name || undefined,
      createdAt: payload.createdAt,
    });

    await sendGridEmail({
      to: moderatorEmail,
      fromEmail,
      fromName,
      replyTo: payload.email,
      subject: `[Newsletter] New subscription: ${payload.email}`,
      html: brandedEmailTemplate({
        eyebrow: 'Newsletter Signup',
        title: 'A new subscriber joined The Take Back Weekly',
        lead: 'B3U has a new newsletter subscription.',
        body: detailList([['Subscriber', escapeHtml(payload.email)]]),
      }),
    });

    await sendGridEmail({
      to: payload.email,
      fromEmail,
      fromName,
      replyTo: replyTo || moderatorEmail,
      subject: 'You are subscribed - B3U',
      html: brandedEmailTemplate({
        eyebrow: 'Welcome To B3U',
        title: 'You are subscribed to The Take Back Weekly',
        lead: 'You are officially on the list for new episodes, community updates, and encouragement from B3U.',
        body: '<p style="margin:0 0 16px;">Expect thoughtful updates built around the B3U mission: Burn, Break, Become Unstoppable.</p><p style="margin:0;">We are glad you are here.</p>',
      }),
    });
    return;
  }

  const moderateUrl = await buildModerationUrl(payload.id);

  await sendGridEmail({
    to: payload.email,
    fromEmail,
    fromName,
    replyTo: replyTo || moderatorEmail,
    subject: 'We received your story - B3U',
    html: brandedEmailTemplate({
      eyebrow: 'Story Received',
      title: `Thank you for sharing, ${escapeHtml(payload.name)}`,
      lead: 'Your story has been received by B3U and is now in review.',
      body: `<p style="margin:0 0 16px;">We know these submissions are personal. Thank you for trusting us with yours.</p>${contentCard('Your submission', nl2br(payload.story))}<p style="margin:16px 0 0;">We will follow up after review.</p>`,
    }),
  });

  await sendGridEmail({
    to: moderatorEmail,
    fromEmail,
    fromName,
    replyTo: payload.email,
    subject: `New Story Submission from ${payload.name}`,
    html: brandedEmailTemplate({
      eyebrow: 'Story Submission',
      title: `New community story from ${escapeHtml(payload.name)}`,
      lead: 'A new story is ready for moderation.',
      body: `${detailList([
        ['Name', escapeHtml(payload.name)],
        ['Email', escapeHtml(payload.email)],
      ])}${contentCard('Story', nl2br(payload.story))}`,
      ctaHtml: moderateUrl ? `${buttonLink(moderateUrl.approve, 'Approve Story', '#0A8F5A')} ${buttonLink(moderateUrl.deny, 'Deny Story', '#B42318')}` : '',
    }),
  });
}

async function upsertSendGridMarketingContact(params: { email: string; firstName?: string; createdAt?: string }): Promise<void> {
  const listIds = parseSendGridListIds(process.env.SENDGRID_MARKETING_LIST_IDS);
  const response = await monitoredServerFetch('https://api.sendgrid.com/v3/marketing/contacts', {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ...(listIds.length > 0 ? { list_ids: listIds } : {}),
      contacts: [
        {
          email: params.email,
          ...(params.firstName ? { first_name: params.firstName } : {}),
        },
      ],
    }),
  }, { label: 'SendGrid marketing contact upsert', route: 'forms-api', source: 'forms-api' });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`sendgrid-marketing-${response.status}:${detail}`);
  }
}

async function buildModerationUrl(id: string): Promise<{ approve: string; deny: string } | null> {
  const backupUrl = normalizeUrl(process.env.FORMS_BACKUP_URL);
  const signingSecret = process.env.FORMS_SIGNING_SECRET;
  if (!backupUrl || !signingSecret) {
    return null;
  }

  const token = crypto.createHmac('sha256', signingSecret).update(id).digest('base64url');
  const base = backupUrl.replace(/\/+$/, '');
  return {
    approve: `${base}/moderate?id=${encodeURIComponent(id)}&action=approve&token=${encodeURIComponent(token)}`,
    deny: `${base}/moderate?id=${encodeURIComponent(id)}&action=deny&token=${encodeURIComponent(token)}`,
  };
}

async function sendGridEmail(params: {
  to: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await monitoredServerFetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: params.fromEmail, name: params.fromName },
      ...(params.replyTo ? { reply_to: { email: params.replyTo } } : {}),
      subject: params.subject,
      content: [{ type: 'text/html', value: params.html }],
    }),
  }, { label: 'SendGrid mail send', route: 'forms-api', source: 'forms-api' });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`sendgrid-${response.status}:${detail}`);
  }
}

function brandedEmailTemplate(params: { eyebrow: string; title: string; lead: string; body: string; ctaHtml?: string }): string {
  const logoUrl = getEmailLogoUrl();
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
        .email-header { padding-top: 22px !important; }
        .email-logo { width: 64px !important; }
        .email-title { font-size: 24px !important; line-height: 1.2 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f8fb;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:32px 16px;">
      <div class="email-card" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d7e5f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(10,26,42,0.12);">
        <div class="email-header" style="background:linear-gradient(135deg,#0A1A2A 0%,#173a58 100%);padding:28px 32px 24px;color:#ffffff;">
          <div style="margin:0 0 16px;">
            <img class="email-logo" src="${logoUrl}" alt="B3U" width="84" height="84" style="display:block;width:84px;height:auto;border:0;outline:none;text-decoration:none;" />
          </div>
          <div class="email-title" style="font-size:30px;line-height:1.1;font-weight:700;margin:0 0 8px;">Burn, Break, Become Unstoppable</div>
          <div style="font-size:14px;line-height:1.6;color:#d7e5f0;">Breaking Cycles. Building Legacies.</div>
        </div>
        <div class="email-content" style="padding:32px;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:10px;">${params.eyebrow}</div>
          <h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:#0A1A2A;">${params.title}</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#36516a;">${params.lead}</p>
          <div style="font-size:15px;line-height:1.7;color:#102437;">${params.body}</div>
          ${params.ctaHtml ? `<div style="margin-top:24px;">${params.ctaHtml}</div>` : ''}
        </div>
        <div class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
          You are receiving this email because of activity on B3U.<br>
          B3U exists to help people burn away fear, break destructive cycles, and become unstoppable.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function detailList(rows: Array<[string, string]>): string {
  return `<div style="border:1px solid #d7e5f0;border-radius:18px;background:#f8fbfe;padding:18px 20px;margin:0 0 18px;">${rows
    .map(([label, value]) => `<div style="margin:0 0 10px;"><strong style="display:block;color:#0A1A2A;margin-bottom:2px;">${label}</strong><span style="color:#36516a;">${value}</span></div>`)
    .join('')}</div>`;
}

function contentCard(title: string, content: string): string {
  return `<div style="border-left:4px solid #CC5500;background:#fff8f3;border-radius:16px;padding:18px 20px;margin:0 0 16px;"><div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:8px;">${title}</div><div style="color:#102437;">${content}</div></div>`;
}

function buttonLink(url: string, label: string, background: string): string {
  return `<a href="${url}" style="display:inline-block;margin-right:10px;margin-bottom:10px;padding:12px 18px;border-radius:999px;background:${background};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${label}</a>`;
}

function normalizeUrl(value?: string): string {
  return String(value || '').trim().replace(/\/$/, '');
}

function getEmailLogoUrl(): string {
  const siteUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.CUSTOM_DOMAIN,
  );

  if (siteUrl && !isLocalHostname(siteUrl)) {
    const baseUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    return `${baseUrl}/images/logos/B3U3D.png`;
  }

  return 'https://b3unstoppable.net/images/logos/B3U3D.png';
}

function isLocalHostname(value: string): boolean {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function parseSendGridListIds(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTruthy(value: unknown): boolean {
  if (value == null) return false;
  const normalized = String(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}