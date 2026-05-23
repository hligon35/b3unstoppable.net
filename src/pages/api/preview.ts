import type { NextApiRequest, NextApiResponse } from 'next';

function getSafeRedirectPath(input: string | string[] | undefined): string {
  const value = typeof input === 'string' ? input : '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  if (value.includes('\\')) return '/';
  return value;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const slug = getSafeRedirectPath(req.query.slug);
  const previewSecret = process.env.SANITY_PREVIEW_SECRET;

  if (!previewSecret || secret !== previewSecret) {
    return res.status(401).json({ message: 'Invalid preview secret.' });
  }

  res.setPreviewData({});
  return res.redirect(slug);
}
