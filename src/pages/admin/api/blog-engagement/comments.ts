import type { NextApiRequest, NextApiResponse } from 'next';

import { getBlogBySlug } from '@/lib/blogs.server';
import { applyBlogEngagementRateLimit } from '@/lib/blogEngagementRateLimit';
import {
  listPublicCommentsForPost,
  sendCommentVerificationEmail,
  submitCommentForVerification,
  verifyCommentToken,
} from '@/lib/blogEngagement.server';
import { verifyTurnstileToken } from '../../../../../utils/security/formsProtection';

function getSiteUrl(req: NextApiRequest) {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envSite) {
    return envSite.startsWith('http') ? envSite : `https://${envSite}`;
  }

  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function getSlug(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const slug = getSlug(req.query.slug);

    if (!slug) {
      return res.status(400).json({ error: 'Blog slug is required.' });
    }

    const post = await getBlogBySlug(slug);

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    const comments = await listPublicCommentsForPost(post.id);
    return res.status(200).json({ comments });
  }

  if (req.method === 'POST') {
    if (!applyBlogEngagementRateLimit(req, res, 'comments_submit')) {
      return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    }

    const slug = getSlug(req.body?.slug);

    if (!slug) {
      return res.status(400).json({ error: 'Blog slug is required.' });
    }

    const post = await getBlogBySlug(slug);

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    const turnstileToken = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken.trim() : '';
    const turnstileResult = await verifyTurnstileToken(turnstileToken, req);

    if (!turnstileResult.ok) {
      return res.status(403).json({ error: 'Security validation failed.' });
    }

    try {
      const submitted = await submitCommentForVerification({
        postId: post.id,
        parentCommentId: Number.isFinite(Number(req.body?.parentCommentId)) && Number(req.body?.parentCommentId) > 0
          ? Number(req.body?.parentCommentId)
          : null,
        authorName: String(req.body?.authorName || ''),
        authorEmail: String(req.body?.authorEmail || ''),
        authorWebsite: typeof req.body?.authorWebsite === 'string' ? req.body.authorWebsite : null,
        body: String(req.body?.body || ''),
        headers: req.headers,
      });

      const siteUrl = getSiteUrl(req);

      if (!siteUrl) {
        return res.status(500).json({ error: 'Site URL is not configured for verification email links.' });
      }

      const emailResult = await sendCommentVerificationEmail({
        token: submitted.token,
        toEmail: submitted.authorEmail,
        authorName: submitted.authorName,
        postSlug: post.slug,
        postTitle: post.title,
        siteUrl,
      });

      if (!emailResult.ok && process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Comment email verification is temporarily unavailable.' });
      }

      return res.status(202).json({
        ok: true,
        message: 'Check your email to verify and publish your comment.',
        previewVerificationToken: process.env.NODE_ENV !== 'production' ? submitted.token : undefined,
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to submit comment.' });
    }
  }

  if (req.method === 'PATCH') {
    if (!applyBlogEngagementRateLimit(req, res, 'comments_verify')) {
      return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    }

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const result = await verifyCommentToken(token);

    if (!result.ok) {
      return res.status(400).json({ error: result.reason });
    }

    return res.status(200).json({ ok: true, commentId: result.commentId });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
