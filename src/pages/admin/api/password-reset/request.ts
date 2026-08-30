import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getAdminResetEmail,
  getAdminResetFromEmail,
  getConfiguredAdminUsername,
  getPasswordResetExpiryMinutes,
  getSiteUrl,
  issueAdminPasswordReset,
} from '../../../lib/adminPassword';
import { monitoredServerFetch, withApiMonitoring } from '../../../../utils/debug/server';

const GENERIC_SUCCESS_MESSAGE = 'If that account can be reset, a one-time link has been sent.';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const csrfToken = process.env.CSRF_TOKEN;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  if (csrfToken) {
    const csrfHeader = req.headers['x-csrf-token'];

    if (csrfHeader !== csrfToken) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const configuredUsername = getConfiguredAdminUsername();

  if (!configuredUsername) {
    return res.status(500).json({ message: 'Admin username is not configured' });
  }

  if (username !== configuredUsername) {
    return res.status(200).json({ message: GENERIC_SUCCESS_MESSAGE });
  }

  const siteUrl = getSiteUrl() || getRequestOrigin(req);

  if (!siteUrl) {
    return res.status(500).json({ message: 'Password reset site URL is not configured' });
  }

  const { token, expiresAt } = await issueAdminPasswordReset(username);
  const resetUrl = `${siteUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const apiKey = process.env.SENDGRID_API_KEY;
  const toEmail = getAdminResetEmail();
  const fromEmail = getAdminResetFromEmail();

  if (apiKey && toEmail && fromEmail) {
    await sendPasswordResetEmail({
      apiKey,
      toEmail,
      fromEmail,
      resetUrl,
      username,
      expiresInMinutes: getPasswordResetExpiryMinutes(),
    });

    return res.status(200).json({ message: GENERIC_SUCCESS_MESSAGE });
  }

  if (process.env.NODE_ENV !== 'production') {
    return res.status(200).json({
      message: GENERIC_SUCCESS_MESSAGE,
      previewUrl: resetUrl,
      expiresAt: expiresAt.toISOString(),
    });
  }

  return res.status(500).json({ message: 'Password reset email is not configured' });
}

function getRequestOrigin(req: NextApiRequest) {
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0]?.trim() || 'https';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]?.trim() || '';

  return host ? `${protocol}://${host}` : '';
}

async function sendPasswordResetEmail(params: {
  apiKey: string;
  toEmail: string;
  fromEmail: string;
  resetUrl: string;
  username: string;
  expiresInMinutes: number;
}) {
  const response = await monitoredServerFetch(
    'https://api.sendgrid.com/v3/mail/send',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${params.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.toEmail }] }],
        from: { email: params.fromEmail, name: 'B3U Admin Security' },
        subject: 'B3U admin password reset',
        content: [
          {
            type: 'text/html',
            value: buildPasswordResetEmailHtml(params),
          },
        ],
      }),
    },
    {
      label: 'Admin password reset email',
      route: 'password-reset-request',
      source: 'admin-auth',
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`admin-password-reset-email-${response.status}:${detail}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPasswordResetEmailHtml(params: {
  resetUrl: string;
  username: string;
  expiresInMinutes: number;
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
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f8fb;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:32px 16px;">
      <div class="email-card" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d7e5f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(10,26,42,0.12);">
        <div class="email-header" style="background:linear-gradient(135deg,#0A1A2A 0%,#173a58 100%);padding:28px 32px 24px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d7e5f0;font-weight:700;margin-bottom:10px;">B3U Admin Security</div>
          <div class="email-title" style="font-size:30px;line-height:1.1;font-weight:700;margin:0 0 8px;">Password reset requested</div>
          <div style="font-size:14px;line-height:1.6;color:#d7e5f0;">Burn, Break, Become Unstoppable</div>
        </div>
        <div class="email-content" style="padding:32px;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:10px;">One-time access</div>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#36516a;">A password reset was requested for the admin username <strong style="color:#0A1A2A;">${escapeHtml(params.username)}</strong>.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#36516a;">Use the secure link below within ${params.expiresInMinutes} minutes. Once the password is changed, this link expires immediately.</p>
          <p style="margin:0 0 24px;"><a href="${params.resetUrl}" style="display:inline-block;background:#CC5500;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700;">Reset admin password</a></p>
          <div style="border-left:4px solid #CC5500;background:#fff8f3;border-radius:16px;padding:18px 20px;margin:0 0 16px;">
            <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#CC5500;font-weight:700;margin-bottom:8px;">Backup link</div>
            <div style="word-break:break-all;"><a href="${params.resetUrl}" style="color:#173a58;text-decoration:none;">${params.resetUrl}</a></div>
          </div>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#5a7389;">If you did not request this change, you can ignore this email.</p>
        </div>
        <div class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
          This message was sent because of activity on the B3U admin dashboard.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export default withApiMonitoring('password-reset-request', handler, { capturePayload: false });