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
            value: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d1d5db;border-radius:18px;padding:32px;box-shadow:0 16px 36px rgba(15,23,42,0.08);">
      <p style="margin:0 0 12px;font-size:13px;letter-spacing:1.4px;text-transform:uppercase;color:#2563eb;font-weight:700;">B3U Admin Security</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#111827;">Password reset requested</h1>
      <p style="margin:0 0 16px;line-height:1.7;color:#374151;">A password reset was requested for the admin username <strong>${escapeHtml(params.username)}</strong>.</p>
      <p style="margin:0 0 24px;line-height:1.7;color:#374151;">Use the secure link below within ${params.expiresInMinutes} minutes. Once the password is changed, this link expires immediately.</p>
      <p style="margin:0 0 24px;"><a href="${params.resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:700;">Reset admin password</a></p>
      <p style="margin:0 0 12px;line-height:1.7;color:#374151;">If the button does not work, copy and paste this URL into your browser:</p>
      <p style="margin:0 0 24px;word-break:break-all;"><a href="${params.resetUrl}" style="color:#2563eb;">${params.resetUrl}</a></p>
      <p style="margin:0;line-height:1.7;color:#6b7280;">If you did not request this change, you can ignore this email.</p>
    </div>
  </body>
</html>`,
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

export default withApiMonitoring('password-reset-request', handler, { capturePayload: false });