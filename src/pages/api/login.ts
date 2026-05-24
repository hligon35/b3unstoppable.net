import type { NextApiRequest, NextApiResponse } from 'next';

import { clearAdminSessionCookie, createAdminSessionCookie } from '../../lib/adminAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const csrfToken = process.env.CSRF_TOKEN;

  if (req.method === 'POST') {
    if (csrfToken) {
      const csrfHeader = req.headers['x-csrf-token'];

      if (csrfHeader !== csrfToken) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      }
    }

    const { username, password } = req.body ?? {};

    if (!adminUsername || !adminPassword) {
      const missing = [
        !adminUsername ? 'ADMIN_USERNAME' : null,
        !adminPassword ? 'ADMIN_PASSWORD' : null,
      ].filter(Boolean);

      return res.status(500).json({
        message: `Admin credentials are not configured${missing.length ? `: missing ${missing.join(', ')}` : ''}`,
      });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.setHeader('Set-Cookie', createAdminSessionCookie());
    return res.status(200).json({ message: 'Login successful' });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearAdminSessionCookie());
    return res.status(200).json({ message: 'Logged out' });
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}
