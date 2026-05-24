import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '../../lib/adminAuth';
import { getSubscribers, insertSubscriber } from '../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email } = req.body ?? {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    try {
      void insertSubscriber(email);
      return res.status(200).json({ message: 'Subscribed successfully' });
    } catch (error) {
      console.error('Failed to subscribe', error);
      return res.status(500).json({ error: 'Failed to subscribe', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'GET') {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    void (async () => {
      try {
        return res.status(200).json(await getSubscribers());
      } catch (error) {
        console.error('Failed to fetch subscribers', error);
        return res.status(500).json({ error: 'Failed to fetch subscribers', details: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return;
    }
  }

  res.setHeader('Allow', ['POST', 'GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
