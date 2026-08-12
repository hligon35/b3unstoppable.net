export type CommentStatus =
  | 'pending_verification'
  | 'pending_moderation'
  | 'approved'
  | 'rejected'
  | 'hidden'
  | 'deleted';

export type CommentReactionType = 'support' | 'insight' | 'fire';

export type PublicComment = {
  id: number;
  postId: number;
  parentCommentId: number | null;
  authorName: string;
  authorWebsite: string | null;
  body: string;
  createdAt: string;
  reactions: Record<CommentReactionType, number>;
  replies: PublicComment[];
};

export type ModerationComment = {
  id: number;
  postId: number;
  parentCommentId: number | null;
  status: CommentStatus;
  isEmailVerified: boolean;
  authorName: string;
  authorEmailMasked: string;
  authorWebsite: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentReportReason = 'spam' | 'abuse' | 'off_topic' | 'other';

export function sanitizePlainText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value
    .replace(/\u0000/g, '')
    .replace(/[\r\t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeSingleLineText(value: unknown, fallback = '') {
  return sanitizePlainText(value, fallback).replace(/\n+/g, ' ').replace(/ {2,}/g, ' ').trim();
}

export function sanitizeOptionalUrl(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@');

  if (!local || !domain) {
    return 'hidden';
  }

  const localMasked = `${local.slice(0, 1)}***${local.slice(-1)}`;
  return `${localMasked}@${domain}`;
}

export function buildCommentTree(comments: PublicComment[]) {
  const byId = new Map<number, PublicComment>();
  const roots: PublicComment[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of byId.values()) {
    if (!comment.parentCommentId) {
      roots.push(comment);
      continue;
    }

    const parent = byId.get(comment.parentCommentId);

    if (!parent || parent.parentCommentId !== null) {
      roots.push({ ...comment, parentCommentId: null });
      continue;
    }

    parent.replies.push(comment);
  }

  return roots;
}
