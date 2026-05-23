import type { NextApiRequest, NextApiResponse } from 'next';

function getPath(req: NextApiRequest): string {
  const bodyPath = typeof req.body?.path === 'string' ? req.body.path : '';
  const queryPath = typeof req.query.path === 'string' ? req.query.path : '';
  const path = bodyPath || queryPath || '/';
  return path.startsWith('/') ? path : '/';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  const secretFromQuery = typeof req.query.secret === 'string' ? req.query.secret : '';
  const secretFromHeader = typeof req.headers['x-revalidate-secret'] === 'string' ? req.headers['x-revalidate-secret'] : '';
  const secret = secretFromHeader || secretFromQuery;

  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid revalidation secret.' });
  }

  const path = getPath(req);

  try {
    await res.revalidate(path);
    return res.status(200).json({ revalidated: true, path });
  } catch {
    return res.status(500).json({ message: 'Revalidation failed.', path });
  }
}
