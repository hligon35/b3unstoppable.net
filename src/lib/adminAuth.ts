import type { NextApiRequest } from 'next';

const ADMIN_COOKIE_NAME = 'admin_auth';

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

export function hasAdminSession(cookieHeader?: string) {
  return parseCookieHeader(cookieHeader)[ADMIN_COOKIE_NAME] === 'true';
}

export function isAuthenticatedRequest(req: NextApiRequest) {
  return hasAdminSession(req.headers.cookie);
}

export function createAdminSessionCookie() {
  const maxAge = 60 * 60 * 2;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${ADMIN_COOKIE_NAME}=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearAdminSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
