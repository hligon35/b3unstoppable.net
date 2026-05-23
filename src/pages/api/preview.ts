import type { NextApiRequest, NextApiResponse } from 'next';

const PREVIEW_SECRET = process.env.SANITY_PREVIEW_SECRET;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '/';

  if (!PREVIEW_SECRET || secret !== PREVIEW_SECRET) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  if (!slug.startsWith('/')) {
    res.status(400).json({ ok: false, error: 'invalid-slug' });
    return;
  }

  res.setPreviewData({});
  res.writeHead(307, { Location: slug });
  res.end();
}
