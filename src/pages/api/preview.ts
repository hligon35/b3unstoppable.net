import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const previewSecret = process.env.SANITY_PREVIEW_SECRET;

  if (!previewSecret || secret !== previewSecret) {
    return res.status(401).json({ message: 'Invalid preview secret.' });
  }

  res.setPreviewData({});
  return res.redirect('/');
}
