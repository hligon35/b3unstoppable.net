import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '../../../lib/adminAuth';
import { processDueNewsletters } from '../../../lib/newsletters';

function isAuthorizedProcessRequest(req: NextApiRequest) {
  if (isAuthenticatedRequest(req)) {
    return true;
  }

  const cronToken = process.env.MONITORING_CRON_TOKEN?.trim();
  const requestToken = String(req.headers['x-cron-token'] || '').trim();

  return Boolean(cronToken && requestToken && cronToken === requestToken);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!isAuthorizedProcessRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await processDueNewsletters(8);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process scheduled newsletters', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}