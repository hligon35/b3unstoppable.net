type Route = 'contact' | 'newsletter' | 'submit' | 'stories' | 'moderate' | '';

type Env = {
  CUSTOM_DOMAIN?: string;
  FORMS_BACKUP_URL?: string;
  FORMS_SIGNING_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  SENDGRID_FROM_NAME?: string;
  SENDGRID_MARKETING_LIST_IDS?: string;
  SENDGRID_REPLY_TO?: string;
  SENDGRID_TO_EMAIL?: string;
};

type PagesHandlerContext<TEnv> = {
  request: Request;
  env: TEnv;
};

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
};

const NAME_FIELD_MIN = 2;
const NAME_FIELD_MAX = 128;
const EMAIL_FIELD_MIN = 6;
const EMAIL_FIELD_MAX = 254;
const SUBJECT_FIELD_MIN = 12;
const SUBJECT_FIELD_MAX = 128;
const LONG_FIELD_MIN = 30;
const LONG_FIELD_MAX = 240;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'Accept, Content-Type',
  vary: 'Origin',
};

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'Accept, Content-Type',
  vary: 'Origin',
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
};

export const onRequest = async (context: PagesHandlerContext<Env>) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const route = resolveRoute(url);

  if (request.method === 'GET') {
    return handleGet(route, url, env);
  }

  if (request.method === 'POST') {
    return handlePost(route, request, env);
  }

  return json({ ok: false, error: 'method-not-allowed' }, 405);
};

async function handleGet(route: Route, url: URL, env: Env): Promise<Response> {
  if (!route) {
    return json({
      ok: true,
      routes: ['contact', 'newsletter', 'submit', 'stories', 'moderate'],
      backupConfigured: Boolean(normalizeUrl(env.FORMS_BACKUP_URL)),
      sendgridConfigured: hasSendGridConfig(env),
    });
  }

  if (route !== 'stories' && route !== 'moderate') {
    return json({ ok: false, error: 'unknown-get-endpoint', route }, 404);
  }

  return proxyGetToBackup(route, url, env);
}

async function handlePost(route: Route, request: Request, env: Env): Promise<Response> {
  if (route !== 'contact' && route !== 'newsletter' && route !== 'submit') {
    return json({ ok: false, error: 'unknown-post-endpoint', route }, 404);
  }

  const formData = await request.formData();
  const payload = parsePayload(formData);
  const backupUrl = normalizeUrl(env.FORMS_BACKUP_URL);
  const sendGridReady = hasSendGridConfig(env);

  if (payload.honeypot) {
    return json({ ok: true, engine: 'filtered' });
  }

  if (payload.timingRejected) {
    return json({ ok: true, engine: 'filtered' });
  }

  const missing = validatePayload(route, payload);
  if (missing.length > 0) {
    return json({ ok: false, error: 'missing-fields', fields: missing }, 400);
  }

  const tooLong = validateFieldLengths(route, payload);
  if (tooLong.length > 0) {
    return json({ ok: false, error: 'field-too-long', fields: tooLong }, 400);
  }

  const tooShort = validateFieldMinimums(route, payload);
  if (tooShort.length > 0) {
    return json({ ok: false, error: 'field-too-short', fields: tooShort }, 400);
  }

  if (route === 'submit' && !backupUrl) {
    return json({ ok: false, error: 'backup-required-for-story-submissions' }, 503);
  }

  if (!sendGridReady && !backupUrl) {
    return json({ ok: false, error: 'no-form-backend-configured' }, 503);
  }

  if (!sendGridReady && backupUrl) {
    const relay = await relayToAppsScript(route, payload, env, { sendEmails: true, persist: true });
    if (!relay.ok) {
      return json({ ok: false, error: 'backup-submit-failed' }, 502);
    }
    return json({ ok: true, engine: 'google-app-script' });
  }

  let persisted = false;
  if (backupUrl) {
    const persistRelay = await relayToAppsScript(route, payload, env, { sendEmails: false, persist: true });
    persisted = persistRelay.ok;
    if (route === 'submit' && !persisted) {
      return json({ ok: false, error: 'story-persist-failed' }, 502);
    }
  }

  try {
    await sendViaSendGrid(route, payload, env);
    return json({ ok: true, engine: 'sendgrid', persisted });
  } catch (error) {
    if (backupUrl) {
      const fallbackRelay = await relayToAppsScript(route, payload, env, { sendEmails: true, persist: !persisted });
      if (fallbackRelay.ok) {
        return json({ ok: true, engine: 'google-app-script', fallback: true, persisted: true });
      }
    }

    return json({
      ok: false,
      error: 'sendgrid-submit-failed',
      detail: payload.debug ? String(error) : undefined,
    }, 502);
  }
}

function resolveRoute(url: URL): Route {
  const cleanPath = url.pathname.replace(/\/+$/, '');
  const prefix = '/api/forms';
  let tail = cleanPath.startsWith(prefix) ? cleanPath.slice(prefix.length) : '';
  tail = tail.replace(/^\//, '');
  const candidate = (tail.split('/')[0] || url.searchParams.get('endpoint') || '').toLowerCase();
  if (candidate === 'contact' || candidate === 'newsletter' || candidate === 'submit' || candidate === 'stories' || candidate === 'moderate') {
    return candidate;
  }
  return '';
}

function parsePayload(formData: FormData): SubmissionPayload & { honeypot: string; timingRejected: boolean; fillMs: number | null } {
  const submittedAt = Date.now();
  const t0Raw = String(formData.get('t0') || '').trim();
  const t0 = Number(t0Raw || '0');
  const fillMs = t0 > 0 ? submittedAt - t0 : null;
  const honeypot = String(formData.get('hp') || '').trim();
  const timingRejected = Boolean(fillMs !== null && (fillMs < 800 || fillMs > 86_400_000));

  return {
    id: String(formData.get('id') || crypto.randomUUID()),
    createdAt: new Date().toISOString(),
    name: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    subject: String(formData.get('subject') || '').trim(),
    message: String(formData.get('message') || '').trim(),
    story: String(formData.get('story') || '').trim(),
    consent: formData.get('consent') === 'on' || formData.get('consent') === 'true' || formData.get('consent') === '1',
    debug: isTruthy(formData.get('debug')),
    honeypot,
    timingRejected,
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

async function proxyGetToBackup(route: Extract<Route, 'stories' | 'moderate'>, url: URL, env: Env): Promise<Response> {
  const backupUrl = normalizeUrl(env.FORMS_BACKUP_URL);
  if (!backupUrl) {
    if (route === 'moderate') {
      return html('<p>Google Apps Script backup is not configured.</p>', 503);
    }
    return json({ ok: false, error: 'backup-not-configured' }, 503);
  }

  const target = new URL(backupUrl);
  for (const [key, value] of url.searchParams.entries()) {
    target.searchParams.set(key, value);
  }
  target.searchParams.set('endpoint', route);

  const response = await fetch(target.toString(), { method: 'GET' });
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'Accept, Content-Type');
  headers.set('vary', 'Origin');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

async function relayToAppsScript(
  route: Extract<Route, 'contact' | 'newsletter' | 'submit'>,
  payload: SubmissionPayload,
  env: Env,
  options: { sendEmails: boolean; persist: boolean },
): Promise<{ ok: boolean }> {
  const backupUrl = normalizeUrl(env.FORMS_BACKUP_URL);
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

  const response = await fetch(target.toString(), {
    method: 'POST',
    body: formData,
  });

  return { ok: response.ok };
}

function hasSendGridConfig(env: Env): boolean {
  return Boolean(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL && env.SENDGRID_TO_EMAIL);
}

async function sendViaSendGrid(route: Extract<Route, 'contact' | 'newsletter' | 'submit'>, payload: SubmissionPayload, env: Env): Promise<void> {
  const fromEmail = env.SENDGRID_FROM_EMAIL as string;
  const fromName = env.SENDGRID_FROM_NAME || 'B3U';
  const moderatorEmail = env.SENDGRID_TO_EMAIL as string;
  const replyTo = env.SENDGRID_REPLY_TO;

  if (route === 'contact') {
    await sendGridEmail(env, {
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

    await sendGridEmail(env, {
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
    await upsertSendGridMarketingContact(env, {
      email: payload.email,
      firstName: payload.name || undefined,
      createdAt: payload.createdAt,
    });

    await sendGridEmail(env, {
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

    await sendGridEmail(env, {
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

  const moderateUrl = await buildModerationUrl(payload.id, env);

  await sendGridEmail(env, {
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

  await sendGridEmail(env, {
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

async function upsertSendGridMarketingContact(
  env: Env,
  params: { email: string; firstName?: string; createdAt?: string },
): Promise<void> {
  const listIds = parseSendGridListIds(env.SENDGRID_MARKETING_LIST_IDS);
  const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${env.SENDGRID_API_KEY}`,
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
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`sendgrid-marketing-${response.status}:${detail}`);
  }
}

async function buildModerationUrl(id: string, env: Env): Promise<{ approve: string; deny: string } | null> {
  const backupUrl = normalizeUrl(env.FORMS_BACKUP_URL);
  const signingSecret = env.FORMS_SIGNING_SECRET;
  if (!backupUrl || !signingSecret) {
    return null;
  }

  const token = await signValue(id, signingSecret);
  const base = backupUrl.replace(/\/+$/, '');
  return {
    approve: `${base}/moderate?id=${encodeURIComponent(id)}&action=approve&token=${encodeURIComponent(token)}`,
    deny: `${base}/moderate?id=${encodeURIComponent(id)}&action=deny&token=${encodeURIComponent(token)}`,
  };
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64Url(signature);
}

function base64Url(buffer: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sendGridEmail(
  env: Env,
  params: {
    to: string;
    fromEmail: string;
    fromName: string;
    replyTo?: string;
    subject: string;
    html: string;
  },
): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: params.fromEmail, name: params.fromName },
      ...(params.replyTo ? { reply_to: { email: params.replyTo } } : {}),
      subject: params.subject,
      content: [{ type: 'text/html', value: params.html }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`sendgrid-${response.status}:${detail}`);
  }
}

function brandedEmailTemplate(params: {
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
  ctaHtml?: string;
}): string {
  const logoUrl = getEmailLogoUrl();
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f8fb;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:32px 16px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d7e5f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(10,26,42,0.12);">
        <div style="background:linear-gradient(135deg,#0A1A2A 0%,#173a58 100%);padding:28px 32px 24px;color:#ffffff;">
          <div style="margin:0 0 16px;">
            <img src="${logoUrl}" alt="B3U" width="84" height="84" style="display:block;width:84px;height:auto;border:0;outline:none;text-decoration:none;" />
          </div>
          <div style="font-size:30px;line-height:1.1;font-weight:700;margin:0 0 8px;">Burn, Break, Become Unstoppable</div>
          <div style="font-size:14px;line-height:1.6;color:#d7e5f0;">Breaking Cycles. Building Legacies.</div>
        </div>
        <div style="padding:32px;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:10px;">${params.eyebrow}</div>
          <h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:#0A1A2A;">${params.title}</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#36516a;">${params.lead}</p>
          <div style="font-size:15px;line-height:1.7;color:#102437;">${params.body}</div>
          ${params.ctaHtml ? `<div style="margin-top:24px;">${params.ctaHtml}</div>` : ''}
        </div>
        <div style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
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
  const siteUrl = normalizeUrl('https://b3unstoppable.net');
  if (siteUrl) {
    const baseUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    return `${baseUrl}/images/logos/B3U3D.png`;
  }

  return 'https://b3unstoppable.net/images/logos/B3U3D.png';
}

function parseSendGridListIds(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTruthy(value: FormDataEntryValue | null): boolean {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function html(body: string, status = 200): Response {
  return new Response(`<!doctype html><html><body>${body}</body></html>`, {
    status,
    headers: HTML_HEADERS,
  });
}