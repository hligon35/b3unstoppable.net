import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '../../lib/adminAuth';
import { mergeSiteDraft } from '../../lib/siteEditorContent';
import { getPublishedSiteDraft, savePublishedSiteDraft } from '../../lib/siteEditorContent.server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const published = await getPublishedSiteDraft();
    return res.status(200).json(published);
  }

  if (req.method === 'PUT') {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const nextDraft = mergeSiteDraft(req.body?.draft);
    const published = await savePublishedSiteDraft(nextDraft);
    return res.status(200).json({ message: 'Published successfully', ...published });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}