import type { NextApiRequest, NextApiResponse } from 'next';

import { getAdminRole, isAuthenticatedRequest } from '@/lib/adminAuth';
import { applyBlogEngagementRateLimit } from '@/lib/blogEngagementRateLimit';
import { listModerationQueue, listOpenReports, moderateComment, resolveReport } from '@/lib/blogEngagement.server';

function readCsrfHeader(req: NextApiRequest) {
  const value = req.headers['x-csrf-token'];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthenticatedRequest(req, 'full')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const comments = await listModerationQueue(status);
    const reports = await listOpenReports();

    return res.status(200).json({ comments, reports });
  }

  if (req.method === 'PATCH') {
    if (!applyBlogEngagementRateLimit(req, res, 'admin_moderation_write')) {
      return res.status(429).json({ error: 'Too many moderation requests. Try again shortly.' });
    }

    const csrfToken = process.env.CSRF_TOKEN;

    if (csrfToken && readCsrfHeader(req) !== csrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    const adminRole = getAdminRole(req.headers.cookie);

    if (adminRole !== 'full') {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const targetType = typeof req.body?.targetType === 'string' ? req.body.targetType : 'comment';

    try {
      if (targetType === 'report') {
        const reportId = Number(req.body?.reportId);
        const status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';

        if (!Number.isFinite(reportId) || reportId <= 0) {
          return res.status(400).json({ error: 'Valid report ID is required.' });
        }

        await resolveReport({ reportId, status, adminUsername });
        return res.status(200).json({ ok: true });
      }

      const commentId = Number(req.body?.commentId);
      const action = String(req.body?.action || '') as 'approve' | 'reject' | 'hide' | 'delete' | 'restore';
      const note = typeof req.body?.note === 'string' ? req.body.note : '';

      if (!Number.isFinite(commentId) || commentId <= 0) {
        return res.status(400).json({ error: 'Valid comment ID is required.' });
      }

      if (!['approve', 'reject', 'hide', 'delete', 'restore'].includes(action)) {
        return res.status(400).json({ error: 'Invalid moderation action.' });
      }

      await moderateComment({ commentId, action, adminUsername, note });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Moderation request failed.' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
