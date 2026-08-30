import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiMonitoring } from '../../../utils/debug/server';

import { getAdminRole, isAuthenticatedRequest } from '../../lib/adminAuth';
import { mergeSiteDraft } from '../../lib/siteEditorContent';
import { defaultSiteDraft } from '../../lib/siteEditorContent';
import { getPublishedSiteDraft, savePublishedSiteDraft } from '../../lib/siteEditorContent.server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const published = await getPublishedSiteDraft();
      return res.status(200).json(published);
    } catch (error) {
      console.error('Failed to load site content', error);
      return res.status(200).json({ draft: defaultSiteDraft, updatedAt: null });
    }
  }

  if (req.method === 'PUT') {
    if (!isAuthenticatedRequest(req, 'full')) {
      return res.status(getAdminRole(req.headers.cookie) ? 403 : 401).json({ error: 'Unauthorized' });
    }

    const nextDraft = mergeSiteDraft(req.body?.draft);
    const published = await savePublishedSiteDraft(nextDraft);
    return res.status(200).json({ message: 'Published successfully', ...published });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

export default withApiMonitoring('site-content', handler, { capturePayload: true });