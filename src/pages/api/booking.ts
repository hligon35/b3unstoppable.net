import type { NextApiRequest, NextApiResponse } from 'next';

type BookingBody = {
  organizationName?: string;
  name?: string;
  contactTitle?: string;
  email?: string;
  telephone?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  deliveryFormat?: string;
  audienceSize?: string;
  presentationType?: string;
  speakerBudget?: string;
  eventGoals?: string;
  message?: string;
  turnstileToken?: string;
  hp?: string;
};

function clean(value: unknown, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char] || char));
}

async function verifyTurnstile(token: string, req: NextApiRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  if (ip) body.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return Boolean(result.success);
}

async function sendEmail(options: { to: string; replyTo?: string; subject: string; html: string }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'B3U';
  if (!apiKey || !fromEmail) throw new Error('SendGrid is not configured');

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: fromEmail, name: fromName },
      reply_to: options.replyTo ? { email: options.replyTo } : undefined,
      subject: options.subject,
      content: [{ type: 'text/html', value: options.html }],
    }),
  });

  if (!response.ok) throw new Error(`SendGrid error ${response.status}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }

  const body = (req.body || {}) as BookingBody;
  if (clean(body.hp)) return res.status(200).json({ ok: true });

  const data = {
    organizationName: clean(body.organizationName, 180),
    name: clean(body.name, 128),
    contactTitle: clean(body.contactTitle, 128),
    email: clean(body.email, 254),
    telephone: clean(body.telephone, 64),
    eventName: clean(body.eventName, 180),
    eventDate: clean(body.eventDate, 40),
    eventLocation: clean(body.eventLocation, 240),
    deliveryFormat: clean(body.deliveryFormat, 60),
    audienceSize: clean(body.audienceSize, 40),
    presentationType: clean(body.presentationType, 120),
    speakerBudget: clean(body.speakerBudget, 80),
    eventGoals: clean(body.eventGoals, 4000),
    message: clean(body.message, 4000),
    turnstileToken: clean(body.turnstileToken, 3000),
  };

  const required = ['organizationName', 'name', 'email', 'telephone', 'eventName', 'eventDate', 'eventLocation', 'deliveryFormat', 'presentationType', 'eventGoals'] as const;
  const missing = required.filter((field) => !data[field]);
  if (missing.length) return res.status(400).json({ ok: false, error: 'missing-fields', fields: missing });

  const turnstileOk = await verifyTurnstile(data.turnstileToken, req);
  if (!turnstileOk) return res.status(403).json({ ok: false, error: 'turnstile-verification-failed' });

  const teamEmail = process.env.SENDGRID_TO_EMAIL;
  if (!teamEmail) return res.status(503).json({ ok: false, error: 'booking-email-not-configured' });

  const rows = [
    ['Organization', data.organizationName],
    ['Contact Name', data.name],
    ['Contact Title', data.contactTitle || 'Not provided'],
    ['Email', data.email],
    ['Telephone', data.telephone],
    ['Event Name', data.eventName],
    ['Event Date', data.eventDate],
    ['Event Location', data.eventLocation],
    ['Format', data.deliveryFormat],
    ['Estimated Audience Size', data.audienceSize || 'Not provided'],
    ['Presentation Type', data.presentationType],
    ['Proposed Speaker Budget', data.speakerBudget || 'Not provided'],
  ];

  const detailHtml = rows.map(([label, value]) => `<tr><td style="padding:7px 12px;font-weight:700;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:7px 12px;">${escapeHtml(value)}</td></tr>`).join('');
  const teamHtml = `<div style="font-family:Arial,sans-serif;color:#10243b;line-height:1.55"><h1>New Dr. Bree Speaking Inquiry</h1><table style="border-collapse:collapse;width:100%;max-width:760px">${detailHtml}</table><h2>Event Goals / Desired Audience Outcomes</h2><p>${escapeHtml(data.eventGoals).replace(/\n/g, '<br>')}</p><h2>Additional Information</h2><p>${escapeHtml(data.message || 'None provided').replace(/\n/g, '<br>')}</p></div>`;

  try {
    await sendEmail({
      to: teamEmail,
      replyTo: data.email,
      subject: `[Speaking Inquiry] ${data.organizationName} - ${data.eventName}`,
      html: teamHtml,
    });

    await sendEmail({
      to: data.email,
      replyTo: process.env.SENDGRID_REPLY_TO || teamEmail,
      subject: 'Dr. Bree Charles speaking inquiry received',
      html: `<div style="font-family:Arial,sans-serif;color:#10243b;line-height:1.6"><h1>Thank you for considering Dr. Bree Charles</h1><p>Your inquiry has been received, and a member of the B3U team will respond within two business days.</p><p><strong>Event:</strong> ${escapeHtml(data.eventName)}<br><strong>Organization:</strong> ${escapeHtml(data.organizationName)}<br><strong>Event date:</strong> ${escapeHtml(data.eventDate)}</p><p>Breaking Cycles. Building Legacies.</p></div>`,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Booking submission failed', error);
    return res.status(502).json({ ok: false, error: 'booking-submit-failed' });
  }
}
