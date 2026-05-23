import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = typeof req.query.slug === 'string' && req.query.slug.startsWith('/') ? req.query.slug : '/';
  res.clearPreviewData();
  return res.redirect(slug);
}
