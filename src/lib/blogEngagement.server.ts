import { createHash, randomBytes } from 'node:crypto';

import { monitoredServerFetch } from '../../utils/debug/server';
import {
  addBlogCommentReactionRow,
  createBlogCommentModerationEventRow,
  createBlogCommentReportRow,
  createBlogCommentRow,
  createBlogCommentVerificationRow,
  getBlogCommentReactionForFingerprint,
  getBlogCommentRowById,
  getBlogCommentVerificationByTokenHash,
  listBlogCommentReactionRowsByCommentIds,
  listBlogCommentReportRowsByStatus,
  listBlogCommentRowsByPostId,
  listBlogCommentRowsForModeration,
  markBlogCommentEmailVerified,
  markBlogCommentVerificationUsed,
  removeBlogCommentReactionRow,
  updateBlogCommentReportStatus,
  updateBlogCommentStatus,
} from './db';
import {
  buildCommentTree,
  isValidEmail,
  maskEmail,
  sanitizeOptionalUrl,
  sanitizePlainText,
  sanitizeSingleLineText,
  type CommentReactionType,
  type CommentReportReason,
  type ModerationComment,
  type PublicComment,
} from './blogEngagementShared';

const COMMENT_TOKEN_BYTES = 32;
const COMMENT_VERIFY_MINUTES = 30;
const COMMENT_REASONS = new Set<CommentReportReason>(['spam', 'abuse', 'off_topic', 'other']);
const COMMENT_REACTIONS = new Set<CommentReactionType>(['support', 'insight', 'fire']);

export function hashValue(value: string) {
  return createHash('sha256').update(value).digest('base64url');
}

export function createCommentVerificationToken() {
  return randomBytes(COMMENT_TOKEN_BYTES).toString('base64url');
}

export function hashCommentVerificationToken(token: string) {
  return hashValue(token);
}

function getClientIp(headers: Record<string, string | string[] | undefined>) {
  const forwarded = headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (firstForwarded) {
    return firstForwarded.split(',')[0].trim();
  }

  const cfIp = headers['cf-connecting-ip'];
  const firstCfIp = Array.isArray(cfIp) ? cfIp[0] : cfIp;
  return firstCfIp ? String(firstCfIp).trim() : '';
}

function getUserAgent(headers: Record<string, string | string[] | undefined>) {
  const raw = headers['user-agent'];
  return Array.isArray(raw) ? String(raw[0] || '').trim() : String(raw || '').trim();
}

function normalizeCommentBody(value: string) {
  return sanitizePlainText(value).slice(0, 2500);
}

function normalizeName(value: string) {
  return sanitizeSingleLineText(value).slice(0, 80);
}

function normalizeEmail(value: string) {
  return sanitizeSingleLineText(value).toLowerCase().slice(0, 254);
}

function normalizeWebsite(value: unknown) {
  const parsed = sanitizeOptionalUrl(value);
  return parsed ? parsed.slice(0, 300) : null;
}

function buildVerificationExpiryDate() {
  return new Date(Date.now() + COMMENT_VERIFY_MINUTES * 60_000);
}

export function getCommentVerificationExpiryMinutes() {
  return COMMENT_VERIFY_MINUTES;
}

export async function submitCommentForVerification(params: {
  postId: number;
  parentCommentId: number | null;
  authorName: string;
  authorEmail: string;
  authorWebsite?: string | null;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}) {
  const authorName = normalizeName(params.authorName);
  const authorEmail = normalizeEmail(params.authorEmail);
  const authorWebsite = normalizeWebsite(params.authorWebsite);
  const body = normalizeCommentBody(params.body);

  if (authorName.length < 2) {
    throw new Error('Name must be at least 2 characters.');
  }

  if (!isValidEmail(authorEmail)) {
    throw new Error('A valid email address is required.');
  }

  if (body.length < 8) {
    throw new Error('Comment must be at least 8 characters.');
  }

  if (params.parentCommentId) {
    const parent = await getBlogCommentRowById(params.parentCommentId);

    if (!parent || parent.post_id !== params.postId) {
      throw new Error('The parent comment no longer exists.');
    }

    if (parent.parent_comment_id !== null) {
      throw new Error('Replies can only be one level deep.');
    }
  }

  const ipHash = hashValue(getClientIp(params.headers));
  const userAgentHash = hashValue(getUserAgent(params.headers));

  const comment = await createBlogCommentRow({
    postId: params.postId,
    parentCommentId: params.parentCommentId,
    authorName,
    authorEmail,
    authorWebsite,
    body,
    ipHash,
    userAgentHash,
  });

  if (!comment) {
    throw new Error('Unable to create comment.');
  }

  const token = createCommentVerificationToken();
  const tokenHash = hashCommentVerificationToken(token);
  const expiresAt = buildVerificationExpiryDate();

  await createBlogCommentVerificationRow({
    commentId: comment.id,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    commentId: comment.id,
    token,
    expiresAt,
    authorEmail,
    authorName,
  };
}

export async function verifyCommentToken(token: string) {
  const tokenHash = hashCommentVerificationToken(token);
  const verification = await getBlogCommentVerificationByTokenHash(tokenHash);

  if (!verification || verification.used_at) {
    return { ok: false as const, reason: 'invalid-token' as const };
  }

  if (new Date(verification.expires_at).getTime() <= Date.now()) {
    return { ok: false as const, reason: 'expired-token' as const };
  }

  const marked = await markBlogCommentVerificationUsed(verification.id);

  if (!marked) {
    return { ok: false as const, reason: 'already-used' as const };
  }

  await markBlogCommentEmailVerified(verification.comment_id);

  return { ok: true as const, commentId: verification.comment_id };
}

export async function sendCommentVerificationEmail(params: {
  token: string;
  toEmail: string;
  authorName: string;
  postSlug: string;
  postTitle: string;
  siteUrl: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || process.env.MONITORING_FROM_EMAIL?.trim() || '';

  if (!apiKey || !fromEmail) {
    return { ok: false as const, reason: 'missing-email-config' as const };
  }

  const verifyUrl = `${params.siteUrl.replace(/\/$/, '')}/journal/${params.postSlug}/?commentToken=${encodeURIComponent(params.token)}`;

  const response = await monitoredServerFetch(
    'https://api.sendgrid.com/v3/mail/send',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.toEmail }] }],
        from: { email: fromEmail, name: 'B3U Journal' },
        subject: `Confirm your B3U Journal comment: ${params.postTitle}`,
        content: [
          {
            type: 'text/html',
            value: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f7fbff;padding:18px;"><div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d5e8f5;border-radius:16px;overflow:hidden;"><div style="background:#0a1a2a;color:#fff;padding:18px 24px;"><p style="margin:0;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;">B3U Journal</p><h1 style="margin:8px 0 0;font-size:22px;">Confirm your comment</h1></div><div style="padding:24px;"><p style="margin:0 0 14px;color:#20384c;line-height:1.6;">Hi ${params.authorName.replace(/</g, '&lt;')}, thanks for joining the conversation on <strong>${params.postTitle.replace(/</g, '&lt;')}</strong>.</p><p style="margin:0 0 18px;color:#20384c;line-height:1.6;">To publish your comment, confirm your email with the button below. This link expires in ${COMMENT_VERIFY_MINUTES} minutes and can only be used once.</p><p style="margin:0 0 18px;"><a href="${verifyUrl}" style="display:inline-block;background:#007cb8;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700;">Verify and submit comment</a></p><p style="margin:0;color:#506980;font-size:13px;word-break:break-all;">${verifyUrl}</p></div></div></body></html>`,
          },
        ],
      }),
    },
    {
      label: 'Blog comment verification email',
      route: 'blog-comment-verification',
      source: 'blog-engagement',
    },
  );

  return { ok: response.ok as boolean };
}

export async function listPublicCommentsForPost(postId: number) {
  const rows = await listBlogCommentRowsByPostId(postId, ['approved']);
  const commentIds = rows.map((row) => row.id);
  const reactions = await listBlogCommentReactionRowsByCommentIds(commentIds);

  const reactionMap = new Map<number, Record<CommentReactionType, number>>();

  for (const row of rows) {
    reactionMap.set(row.id, { support: 0, insight: 0, fire: 0 });
  }

  for (const reaction of reactions) {
    if (!COMMENT_REACTIONS.has(reaction.reaction_type as CommentReactionType)) {
      continue;
    }

    const aggregate = reactionMap.get(reaction.comment_id);

    if (!aggregate) {
      continue;
    }

    const key = reaction.reaction_type as CommentReactionType;
    aggregate[key] += 1;
  }

  const comments: PublicComment[] = rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    parentCommentId: row.parent_comment_id,
    authorName: row.author_name,
    authorWebsite: row.author_website,
    body: row.body,
    createdAt: row.created_at,
    reactions: reactionMap.get(row.id) || { support: 0, insight: 0, fire: 0 },
    replies: [],
  }));

  return buildCommentTree(comments);
}

export async function submitCommentReport(params: {
  commentId: number;
  reason: string;
  details?: string | null;
  reporterEmail?: string | null;
  headers: Record<string, string | string[] | undefined>;
}) {
  const reason = sanitizeSingleLineText(params.reason) as CommentReportReason;

  if (!COMMENT_REASONS.has(reason)) {
    throw new Error('Invalid report reason.');
  }

  const details = sanitizePlainText(params.details || '').slice(0, 1200) || null;
  const reporterEmail = params.reporterEmail ? normalizeEmail(params.reporterEmail) : null;

  if (reporterEmail && !isValidEmail(reporterEmail)) {
    throw new Error('Reporter email is invalid.');
  }

  const comment = await getBlogCommentRowById(params.commentId);

  if (!comment) {
    throw new Error('Comment not found.');
  }

  const reporterIpHash = hashValue(getClientIp(params.headers));

  return createBlogCommentReportRow({
    commentId: params.commentId,
    reason,
    details,
    reporterEmail,
    reporterIpHash,
  });
}

export async function toggleCommentReaction(params: {
  commentId: number;
  reactionType: string;
  headers: Record<string, string | string[] | undefined>;
}) {
  const reactionType = sanitizeSingleLineText(params.reactionType) as CommentReactionType;

  if (!COMMENT_REACTIONS.has(reactionType)) {
    throw new Error('Invalid reaction type.');
  }

  const comment = await getBlogCommentRowById(params.commentId);

  if (!comment || comment.status !== 'approved') {
    throw new Error('Comment is not available for reactions.');
  }

  const fingerprintHash = hashValue(`${getClientIp(params.headers)}|${getUserAgent(params.headers).slice(0, 160)}`);

  const existing = await getBlogCommentReactionForFingerprint({
    commentId: params.commentId,
    reactionType,
    fingerprintHash,
  });

  if (existing) {
    await removeBlogCommentReactionRow({
      commentId: params.commentId,
      reactionType,
      fingerprintHash,
    });

    return { active: false };
  }

  await addBlogCommentReactionRow({
    commentId: params.commentId,
    reactionType,
    fingerprintHash,
  });

  return { active: true };
}

export async function listModerationQueue(status: string) {
  const comments = await listBlogCommentRowsForModeration({
    status,
    limit: 250,
  });

  return comments.map((row): ModerationComment => ({
    id: row.id,
    postId: row.post_id,
    parentCommentId: row.parent_comment_id,
    status: row.status as ModerationComment['status'],
    isEmailVerified: Boolean(row.is_email_verified),
    authorName: row.author_name,
    authorEmailMasked: maskEmail(row.author_email),
    authorWebsite: row.author_website,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function moderateComment(params: {
  commentId: number;
  action: 'approve' | 'reject' | 'hide' | 'delete' | 'restore';
  adminUsername: string;
  note?: string;
}) {
  const statusByAction: Record<typeof params.action, string> = {
    approve: 'approved',
    reject: 'rejected',
    hide: 'hidden',
    delete: 'deleted',
    restore: 'approved',
  };

  const nextStatus = statusByAction[params.action];

  const updated = await updateBlogCommentStatus({
    id: params.commentId,
    status: nextStatus,
    markApproved: nextStatus === 'approved',
  });

  if (!updated) {
    throw new Error('Comment could not be updated.');
  }

  await createBlogCommentModerationEventRow({
    commentId: params.commentId,
    adminUsername: params.adminUsername,
    action: params.action,
    note: sanitizePlainText(params.note || '').slice(0, 800) || null,
  });

  return { ok: true as const };
}

export async function resolveReport(params: {
  reportId: number;
  status: 'resolved' | 'dismissed';
  adminUsername: string;
}) {
  const updated = await updateBlogCommentReportStatus({
    id: params.reportId,
    status: params.status,
    resolvedBy: params.adminUsername,
  });

  if (!updated) {
    throw new Error('Report not found.');
  }

  return { ok: true as const };
}

export async function listOpenReports() {
  return listBlogCommentReportRowsByStatus('open', 250);
}
