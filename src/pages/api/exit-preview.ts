import type { NextApiRequest, NextApiResponse } from 'next';

function getSafeRedirectPath(input: string | string[] | undefined): string {
  const value = typeof input === 'string' ? input : '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  if (value.includes('\\')) return '/';
  return value;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = getSafeRedirectPath(req.query.slug);
  res.clearPreviewData();
  return res.redirect(slug);
}
