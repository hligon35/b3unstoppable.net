import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '../../lib/adminAuth';
import { deleteQueuedNewsletter, listNewsletterQueue, queueNewsletter, updateQueuedNewsletter } from '../../lib/newsletters';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthenticatedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      return res.status(200).json(await listNewsletterQueue());
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load newsletter queue', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'POST') {
    const { subject, bodyText, scheduledFor, recipientEmails } = req.body ?? {};

    try {
      const created = await queueNewsletter({
        subject: typeof subject === 'string' ? subject : '',
        bodyText: typeof bodyText === 'string' ? bodyText : '',
        scheduledFor: typeof scheduledFor === 'string' ? scheduledFor : '',
        recipientEmails: Array.isArray(recipientEmails) ? recipientEmails.map(String) : [],
      });

      return res.status(201).json(created);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to queue newsletter' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, subject, bodyText, scheduledFor, recipientEmails } = req.body ?? {};

    try {
      const updated = await updateQueuedNewsletter({
        id: Number(id),
        subject: typeof subject === 'string' ? subject : '',
        bodyText: typeof bodyText === 'string' ? bodyText : '',
        scheduledFor: typeof scheduledFor === 'string' ? scheduledFor : '',
        recipientEmails: Array.isArray(recipientEmails) ? recipientEmails.map(String) : [],
      });

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update newsletter queue item' });
    }
  }

  if (req.method === 'DELETE') {
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

    try {
      await deleteQueuedNewsletter(Number(rawId));
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete newsletter queue item' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}