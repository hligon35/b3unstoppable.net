import type { NextApiRequest, NextApiResponse } from 'next';

import { applyBlogEngagementRateLimit } from '@/lib/blogEngagementRateLimit';
import { toggleCommentReaction } from '@/lib/blogEngagement.server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!applyBlogEngagementRateLimit(req, res, 'comments_react')) {
    return res.status(429).json({ error: 'Too many reaction requests. Please wait and try again.' });
  }

  const commentId = Number(req.body?.commentId);

  if (!Number.isFinite(commentId) || commentId <= 0) {
    return res.status(400).json({ error: 'Comment ID is required.' });
  }

  try {
    const result = await toggleCommentReaction({
      commentId,
      reactionType: String(req.body?.reactionType || ''),
      headers: req.headers,
    });

    return res.status(200).json({ ok: true, active: result.active });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to react to this comment.' });
  }
}
