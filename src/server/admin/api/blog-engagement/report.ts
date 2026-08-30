import type { NextApiRequest, NextApiResponse } from 'next';

import { applyBlogEngagementRateLimit } from '@/lib/blogEngagementRateLimit';
import { submitCommentReport } from '@/lib/blogEngagement.server';
import { verifyTurnstileToken } from '../../../../../utils/security/formsProtection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!applyBlogEngagementRateLimit(req, res, 'comments_report')) {
    return res.status(429).json({ error: 'Too many report requests. Please try again shortly.' });
  }

  const turnstileToken = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken.trim() : '';
  const turnstileResult = await verifyTurnstileToken(turnstileToken, req);

  if (!turnstileResult.ok) {
    return res.status(403).json({ error: 'Security validation failed.' });
  }

  const commentId = Number(req.body?.commentId);

  if (!Number.isFinite(commentId) || commentId <= 0) {
    return res.status(400).json({ error: 'Comment ID is required.' });
  }

  try {
    await submitCommentReport({
      commentId,
      reason: String(req.body?.reason || ''),
      details: typeof req.body?.details === 'string' ? req.body.details : null,
      reporterEmail: typeof req.body?.reporterEmail === 'string' ? req.body.reporterEmail : null,
      headers: req.headers,
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to submit report.' });
  }
}
