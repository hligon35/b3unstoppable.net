import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '/';
  const previewSecret = process.env.SANITY_PREVIEW_SECRET;

  if (!previewSecret || secret !== previewSecret) {
    return res.status(401).json({ message: 'Invalid preview secret.' });
  }

  if (!slug.startsWith('/')) {
    return res.status(400).json({ message: 'Invalid slug.' });
  }

  res.setPreviewData({});
  return res.redirect(slug);
}
