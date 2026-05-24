import type { NextApiRequest, NextApiResponse } from 'next';

import { clearAdminSessionCookie, createAdminSessionCookie } from '../../lib/adminAuth';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CSRF_TOKEN = process.env.CSRF_TOKEN;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (CSRF_TOKEN) {
      const csrfHeader = req.headers['x-csrf-token'];

      if (csrfHeader !== CSRF_TOKEN) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      }
    }

    const { username, password } = req.body ?? {};

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(500).json({ message: 'Admin credentials are not configured' });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
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
