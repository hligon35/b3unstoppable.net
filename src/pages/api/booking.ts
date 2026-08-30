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

function emailShell(params: {
  eyebrow: string;
  title: string;
  subtitle: string;
  content: string;
  footer: string;
}) {
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
        .email-title { font-size: 24px !important; line-height: 1.2 !important; }
        .detail-table td { display:block !important; width:100% !important; box-sizing:border-box !important; }
        .detail-label { padding-bottom:2px !important; }
        .detail-value { padding-top:2px !important; padding-bottom:14px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f8fb;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:32px 16px;">
      <div class="email-card" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d7e5f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(10,26,42,0.12);">
        <div class="email-header" style="background:linear-gradient(135deg,#0A1A2A 0%,#173a58 100%);padding:28px 32px 24px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d7e5f0;font-weight:700;margin-bottom:10px;">${escapeHtml(params.eyebrow)}</div>
          <div class="email-title" style="font-size:30px;line-height:1.1;font-weight:700;margin:0 0 8px;">${escapeHtml(params.title)}</div>
          <div style="font-size:14px;line-height:1.6;color:#d7e5f0;">${escapeHtml(params.subtitle)}</div>
        </div>
        <div class="email-content" style="padding:32px;">${params.content}</div>
        <div class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
          ${params.footer}
        </div>
      </div>
    </div>
  </body>
</html>`;
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

  const detailHtml = rows.map(([label, value]) => `
    <tr>
      <td class="detail-label" style="width:38%;padding:10px 14px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;color:#CC5500;vertical-align:top;border-bottom:1px solid #e4edf4;">${escapeHtml(label)}</td>
      <td class="detail-value" style="padding:10px 14px;color:#36516a;vertical-align:top;border-bottom:1px solid #e4edf4;">${escapeHtml(value)}</td>
    </tr>`).join('');

  const teamHtml = emailShell({
    eyebrow: 'B3U Speaking Inquiry',
    title: 'New Dr. Bree Booking Request',
    subtitle: 'Transformational Speaker • U.S. Army Veteran • Author • Founder of B3U',
    content: `
      <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:12px;">Inquiry details</div>
      <table class="detail-table" role="presentation" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #e4edf4;border-radius:16px;overflow:hidden;margin:0 0 28px;">${detailHtml}</table>
      <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:10px;">Event Goals / Desired Audience Outcomes</div>
      <div style="border-left:4px solid #CC5500;background:#fff8f3;border-radius:16px;padding:18px 20px;margin:0 0 26px;color:#36516a;line-height:1.7;">${escapeHtml(data.eventGoals).replace(/\n/g, '<br>')}</div>
      <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:10px;">Additional Information</div>
      <div style="background:#f7fafc;border:1px solid #e4edf4;border-radius:16px;padding:18px 20px;color:#36516a;line-height:1.7;">${escapeHtml(data.message || 'None provided').replace(/\n/g, '<br>')}</div>`,
    footer: 'Reply directly to this email to respond to the prospective event organizer.',
  });

  const confirmationHtml = emailShell({
    eyebrow: 'B3U Speaking',
    title: 'Thank you for considering Dr. Bree Charles',
    subtitle: 'Helping leaders reclaim identity, voice, and purpose.',
    content: `
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#36516a;">Thank you for considering Dr. Bree Charles for your event. Your inquiry has been received, and a member of the B3U team will respond within two business days.</p>
      <div style="border-left:4px solid #CC5500;background:#fff8f3;border-radius:16px;padding:18px 20px;margin:0 0 24px;">
        <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:12px;">Your inquiry</div>
        <div style="font-size:15px;line-height:1.8;color:#36516a;"><strong style="color:#0A1A2A;">Event:</strong> ${escapeHtml(data.eventName)}<br><strong style="color:#0A1A2A;">Organization:</strong> ${escapeHtml(data.organizationName)}<br><strong style="color:#0A1A2A;">Event date:</strong> ${escapeHtml(data.eventDate)}</div>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#5a7389;">We appreciate the opportunity to learn more about your event and the impact you want to create for your audience.</p>`,
    footer: '<strong style="color:#0A1A2A;">Breaking Cycles. Building Legacies.</strong><br>Burn, Break, Become Unstoppable.',
  });

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
      html: confirmationHtml,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Booking submission failed', error);
    return res.status(502).json({ ok: false, error: 'booking-submit-failed' });
  }
}
