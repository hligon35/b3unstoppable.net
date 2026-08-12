import type { NextApiRequest, NextApiResponse } from 'next';

type Bucket = {
  count: number;
  resetAt: number;
};

const STORE_KEY = '__B3U_BLOG_ENGAGEMENT_RATE_LIMIT__';
const WINDOW_MS = 15 * 60 * 1000;

const LIMITS: Record<string, number> = {
  comments_submit: 5,
  comments_verify: 12,
  comments_report: 6,
  comments_react: 80,
  admin_moderation_write: 50,
};

function getStore() {
  const scope = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, Bucket> };

  if (!scope[STORE_KEY]) {
    scope[STORE_KEY] = new Map<string, Bucket>();
  }

  return scope[STORE_KEY] as Map<string, Bucket>;
}

function getClientFingerprint(req: NextApiRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = firstForwarded ? String(firstForwarded).split(',')[0].trim() : String(req.headers['cf-connecting-ip'] || 'unknown-ip');
  const userAgent = Array.isArray(req.headers['user-agent']) ? String(req.headers['user-agent'][0] || '') : String(req.headers['user-agent'] || '');

  return `${ip}:${userAgent.slice(0, 160)}`;
}

export function applyBlogEngagementRateLimit(req: NextApiRequest, res: NextApiResponse, key: keyof typeof LIMITS) {
  const store = getStore();
  const now = Date.now();
  const limit = LIMITS[key] || 10;

  if (store.size > 500) {
    for (const [entryKey, bucket] of store.entries()) {
      if (bucket.resetAt <= now) {
        store.delete(entryKey);
      }
    }
  }

  const bucketKey = `${key}:${getClientFingerprint(req)}`;
  const current = store.get(bucketKey);

  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : current;

  if (bucket.count >= limit) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
    return false;
  }

  bucket.count += 1;
  store.set(bucketKey, bucket);
  return true;
}
