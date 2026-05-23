import type { NextApiRequest, NextApiResponse } from 'next';

const REVALIDATE_SECRET = process.env.SANITY_REVALIDATE_SECRET;

type WebhookBody = {
  path?: string;
  paths?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const secret = req.headers['x-vercel-reval-key'];
  if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const body = (req.body || {}) as WebhookBody;
  const candidatePaths = [
    ...(typeof body.path === 'string' ? [body.path] : []),
    ...(Array.isArray(body.paths) ? body.paths : []),
  ];
  const paths = (candidatePaths.length ? candidatePaths : ['/']).filter((path) => typeof path === 'string' && path.startsWith('/'));

  if (!paths.length) {
    res.status(400).json({ ok: false, error: 'no-valid-paths' });
    return;
  }

  try {
    await Promise.all([...new Set(paths)].map((path) => res.revalidate(path)));
    res.status(200).json({ revalidated: true, paths });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'revalidate-failed', details: String(error) });
  }
}
