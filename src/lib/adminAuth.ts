import type { NextApiRequest } from 'next';

const ADMIN_COOKIE_NAME = 'admin_auth';
const NEWSLETTER_ONLY_EMAILS = new Set(['cohost@b3unstoppable.net']);

export type AdminRole = 'full' | 'newsletter';

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

function normalizeAdminRole(value?: string): AdminRole | null {
  if (value === 'newsletter') {
    return 'newsletter';
  }

  if (value === 'full' || value === 'true') {
    return 'full';
  }

  return null;
}

function roleRank(role: AdminRole) {
  return role === 'full' ? 2 : 1;
}

export function hasAdminSession(cookieHeader?: string) {
  return normalizeAdminRole(parseCookieHeader(cookieHeader)[ADMIN_COOKIE_NAME]) !== null;
}

export function getAdminRole(cookieHeader?: string): AdminRole | null {
  return normalizeAdminRole(parseCookieHeader(cookieHeader)[ADMIN_COOKIE_NAME]);
}

export function hasRequiredAdminRole(cookieHeader: string | undefined, requiredRole: AdminRole = 'newsletter') {
  const currentRole = getAdminRole(cookieHeader);

  if (!currentRole) {
    return false;
  }

  return roleRank(currentRole) >= roleRank(requiredRole);
}

export function isAuthenticatedRequest(req: NextApiRequest, requiredRole: AdminRole = 'newsletter') {
  return hasRequiredAdminRole(req.headers.cookie, requiredRole);
}

export function getAdminRoleForEmail(email: string): AdminRole {
  return NEWSLETTER_ONLY_EMAILS.has(email.trim().toLowerCase()) ? 'newsletter' : 'full';
}

export function createAdminSessionCookie(role: AdminRole = 'full') {
  const maxAge = 60 * 60 * 2;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${ADMIN_COOKIE_NAME}=${role}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearAdminSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
