import type { NextApiRequest, NextApiResponse } from 'next';

import { createAdminSessionCookie } from '../../../lib/adminAuth';
import { consumePasswordReset } from '../../../lib/adminPassword';
import { withApiMonitoring } from '../../../../utils/debug/server';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

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

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (!token) {
    return res.status(400).json({ message: 'Reset token is required' });
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const result = await consumePasswordReset(token, password);

  if (!result.ok) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  }

  res.setHeader('Set-Cookie', createAdminSessionCookie());
  return res.status(200).json({ message: 'Password updated successfully', redirect: '/admin' });
}

export default withApiMonitoring('password-reset-confirm', handler, { capturePayload: false });