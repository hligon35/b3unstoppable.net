import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const slug = typeof req.query.slug === 'string' && req.query.slug.startsWith('/') ? req.query.slug : '/';
  res.clearPreviewData();
  res.writeHead(307, { Location: slug });
  res.end();
}
