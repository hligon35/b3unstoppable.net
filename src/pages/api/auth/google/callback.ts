import type { NextApiRequest, NextApiResponse } from 'next';

import { createAdminSessionCookie } from '../../../../lib/adminAuth';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const STATE_COOKIE = 'google_oauth_state';
const REDIRECT_COOKIE = 'google_oauth_redirect';

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function parseCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, pair) => {
    const separatorIndex = pair.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function clearCookie(name: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

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

function getAllowedAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getSafeRedirectTarget(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/admin';
  }

  return value;
}

function redirectToLogin(res: NextApiResponse, message: string) {
  return res.redirect(`/login?error=${encodeURIComponent(message)}`);
}

async function exchangeCodeForTokens(req: NextApiRequest, code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Google login is not configured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(req),
      grant_type: 'authorization_code',
    }),
  });

  const data = (await response.json().catch(() => null)) as TokenResponse | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || `Google token exchange failed with ${response.status}.`);
  }

  return data;
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await response.json().catch(() => null)) as GoogleUserInfo | null;

  if (!response.ok || !data?.email) {
    throw new Error(`Google profile lookup failed with ${response.status}.`);
  }

  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const cookies = parseCookieHeader(req.headers.cookie);
  const expectedState = cookies[STATE_COOKIE];
  const incomingState = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const redirectTarget = getSafeRedirectTarget(cookies[REDIRECT_COOKIE]);

  res.setHeader('Set-Cookie', [clearCookie(STATE_COOKIE), clearCookie(REDIRECT_COOKIE)]);

  if (!expectedState || !incomingState || expectedState !== incomingState) {
    return redirectToLogin(res, 'Google login expired. Please try again.');
  }

  if (!code) {
    return redirectToLogin(res, 'Google did not return a login code. Please try again.');
  }

  try {
    const allowedEmails = getAllowedAdminEmails();

    if (!allowedEmails.length) {
      return redirectToLogin(res, 'Google login is not configured: missing ADMIN_ALLOWED_EMAILS.');
    }

    const tokens = await exchangeCodeForTokens(req, code);
    const profile = await fetchGoogleUserInfo(tokens.access_token as string);
    const email = profile.email?.toLowerCase() || '';

    if (!profile.email_verified) {
      return redirectToLogin(res, 'This Google account email is not verified.');
    }

    if (!allowedEmails.includes(email)) {
      return redirectToLogin(res, 'This Google account is not approved for admin access.');
    }

    res.setHeader('Set-Cookie', createAdminSessionCookie());
    return res.redirect(redirectTarget);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google login failed.';
    return redirectToLogin(res, message);
  }
}
