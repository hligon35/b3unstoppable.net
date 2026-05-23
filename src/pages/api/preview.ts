import type { NextApiRequest, NextApiResponse } from 'next';

const PREVIEW_SECRET = process.env.SANITY_PREVIEW_SECRET;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';
  if (!PREVIEW_SECRET || secret !== PREVIEW_SECRET) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  res.setPreviewData({});
  res.writeHead(307, { Location: '/' });
  res.end();
}
