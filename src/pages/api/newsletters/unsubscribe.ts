import type { NextApiRequest, NextApiResponse } from 'next';

import { deleteSubscriber } from '@/lib/db';
import { verifyNewsletterUnsubscribeToken } from '@/lib/newsletterUnsubscribe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to unsubscribe.' });
  }

  const tokenFromBody = typeof req.body?.token === 'string' ? req.body.token : undefined;
  const tokenFromQuery = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  const subscriberId = verifyNewsletterUnsubscribeToken(tokenFromBody || tokenFromQuery);

  if (!subscriberId) {
    return res.status(400).json({ error: 'This unsubscribe link is invalid or expired.' });
  }

  try {
    // Deleting an already-removed subscriber is intentionally idempotent.
    await deleteSubscriber(subscriberId);
    return res.status(200).json({ ok: true, message: 'You have been unsubscribed from The Take Back Weekly.' });
  } catch (error) {
    console.error('[newsletter] unsubscribe failed', {
      subscriberId,
      error: error instanceof Error ? error.message : 'Unknown unsubscribe error',
    });
    return res.status(500).json({ error: 'We could not complete your unsubscribe. Please try again.' });
  }
}
