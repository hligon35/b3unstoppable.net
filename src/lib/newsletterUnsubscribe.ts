import { createHmac, timingSafeEqual } from 'node:crypto';

function unsubscribeSecret() {
  const secret =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ||
    process.env.FORMS_SIGNING_SECRET ||
    process.env.RESEND_API_KEY;

  if (!secret) {
    throw new Error('Newsletter unsubscribe signing is not configured.');
  }

  return secret;
}

export function createNewsletterUnsubscribeToken(subscriberId: number) {
  if (!Number.isInteger(subscriberId) || subscriberId <= 0) {
    throw new Error('A valid subscriber id is required to create an unsubscribe link.');
  }

  const signature = createHmac('sha256', unsubscribeSecret())
    .update(`b3u-newsletter-unsubscribe:v1:${subscriberId}`)
    .digest('base64url');

  return `${subscriberId}.${signature}`;
}

export function verifyNewsletterUnsubscribeToken(token: unknown) {
  if (typeof token !== 'string') {
    return null;
  }

  const match = token.match(/^(\d+)\.([A-Za-z0-9_-]{43})$/);
  if (!match) {
    return null;
  }

  const subscriberId = Number(match[1]);
  if (!Number.isSafeInteger(subscriberId) || subscriberId <= 0) {
    return null;
  }

  try {
    const expectedSignature = createHmac('sha256', unsubscribeSecret())
      .update(`b3u-newsletter-unsubscribe:v1:${subscriberId}`)
      .digest();
    const providedSignature = Buffer.from(match[2], 'base64url');

    if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
      return null;
    }

    return subscriberId;
  } catch {
    return null;
  }
}

export function getNewsletterUnsubscribeUrl(token: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://b3unstoppable.net';
  const siteUrl = configuredSiteUrl.trim().replace(/\/+$/, '');
  return `${siteUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}
