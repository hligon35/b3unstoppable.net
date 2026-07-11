import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_COOKIE = 'google_oauth_state';
const REDIRECT_COOKIE = 'google_oauth_redirect';

function getBaseUrl(req: NextApiRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`;
  }

  const host = req.headers.host || 'localhost:3000';
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || (host.includes('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

function getRedirectUri(req: NextApiRequest) {
  return process.env.GOOGLE_REDIRECT_URI?.trim() || `${getBaseUrl(req)}/api/auth/google/callback`;
}

function getSafeRedirectTarget(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/admin';
  }

  return value;
}

function buildCookie(name: string, value: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return res.status(500).json({ message: 'Google login is not configured: missing GOOGLE_CLIENT_ID.' });
  }

  const state = randomBytes(24).toString('base64url');
  const redirectTarget = getSafeRedirectTarget(req.query.redirect);
  const authUrl = new URL(AUTH_URL);

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  res.setHeader('Set-Cookie', [buildCookie(STATE_COOKIE, state), buildCookie(REDIRECT_COOKIE, redirectTarget)]);
  return res.redirect(authUrl.toString());
}
