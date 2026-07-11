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
 