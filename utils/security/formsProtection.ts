import type { NextApiRequest, NextApiResponse } from 'next';

type ProtectedRoute = 'contact' | 'newsletter' | 'submit';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

type TurnstileVerificationResult = {
  ok: boolean;
  codes: string[];
};

const RATE_LIMIT_STORE_KEY = '__B3U_FORMS_RATE_LIMIT__';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMITS: Record<ProtectedRoute, number> = {
  contact: 5,
  newsletter: 8,
  submit: 4,
};

export function applyFormsRateLimit(req: NextApiRequest, res: NextApiResponse, route: ProtectedRoute): boolean {
  const limit = readPositiveInt(process.env[`FORMS_RATE_LIMIT_${route.toUpperCase()}_MAX`], DEFAULT_LIMITS[route]);
  const windowMs = readPositiveInt(process.env.FORMS_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const now = Date.now();
  const store = getRateLimitStore();
  pruneRateLimitStore(store, now);

  const key = `${route}:${getClientFingerprint(req)}`;
  const current = store.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    setRateLimitHeaders(res, limit, 0, bucket.resetAt, retryAfterSeconds);
    return false;
  }

  bucket.count += 1;
  store.set(key, bucket);
  setRateLimitHeaders(res, limit, Math.max(0, limit - bucket.count), bucket.resetAt);
  return true;
}

export async function verifyTurnstileToken(token: string, req: NextApiRequest): Promise<TurnstileVerificationResult> {
  const secret = readString(process.env.TURNSTILE_SECRET_KEY);
  if (!secret) {
    return { ok: true, codes: [] };
  }

  if (!token) {
    return { ok: false, codes: ['missing-input-response'] };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);

  const ip = getClientIp(req);
  if (ip) {
    body.set('remoteip', ip);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    return { ok: false, codes: [`turnstile-http-${response.status}`] };
  }

  const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
  return {
    ok: Boolean(result.success),
    codes: Array.isArray(result['error-codes']) ? result['error-codes'] : [],
  };
}

function getRateLimitStore(): RateLimitStore {
  const scope = globalThis as typeof globalThis & { [RATE_LIMIT_STORE_KEY]?: RateLimitStore };
  if (!scope[RATE_LIMIT_STORE_KEY]) {
    scope[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitBucket>();
  }
  return scope[RATE_LIMIT_STORE_KEY] as RateLimitStore;
}

function pruneRateLimitStore(store: RateLimitStore, now: number) {
  if (store.size < 250) {
    return;
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function getClientFingerprint(req: NextApiRequest): string {
  const ip = getClientIp(req) || 'unknown-ip';
  const userAgent = readString(req.headers['user-agent']);
  return `${ip}:${userAgent.slice(0, 160)}`;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (firstForwarded) {
    return String(firstForwarded).split(',')[0].trim();
  }

  const realIp = readString(req.headers['x-real-ip']);
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = readString(req.headers['cf-connecting-ip']);
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const socketAddress = (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress;
  if (socketAddress) {
    return socketAddress;
  }

  const connectionAddress = ((req as NextApiRequest & { connection?: { remoteAddress?: string } }).connection)?.remoteAddress;
  return connectionAddress || '';
}

function setRateLimitHeaders(
  res: NextApiResponse,
  limit: number,
  remaining: number,
  resetAt: number,
  retryAfterSeconds?: number,
) {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  if (retryAfterSeconds) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim();
}