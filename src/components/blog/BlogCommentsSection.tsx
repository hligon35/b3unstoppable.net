import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import TurnstileField from '@/components/TurnstileField';
import type { CommentReactionType, PublicComment } from '@/lib/blogEngagementShared';

const REACTION_TYPES: Array<{ value: CommentReactionType; label: string }> = [
  { value: 'support', label: 'Support' },
  { value: 'insight', label: 'Insight' },
  { value: 'fire', label: 'Fire' },
];

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

type BlogCommentsSectionProps = {
  postSlug: string;
};

export default function BlogCommentsSection({ postSlug }: BlogCommentsSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reportFor, setReportFor] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [formData, setFormData] = useState({
    authorName: '',
    authorEmail: '',
    authorWebsite: '',
    body: '',
  });
  const [reportData, setReportData] = useState({ reason: 'spam', details: '', reporterEmail: '' });

  const totalComments = useMemo(() => {
    let count = 0;

    for (const comment of comments) {
      count += 1 + comment.replies.length;
    }

    return count;
  }, [comments]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog-engagement/comments?slug=${encodeURIComponent(postSlug)}`);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || 'Unable to load comments.');
      }

      setComments(Array.isArray(body?.comments) ? body.comments : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load comments.');
    } finally {
      setLoading(false);
    }
  }, [postSlug]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    const token = typeof router.query.commentToken === 'string' ? router.query.commentToken : '';

    if (!token) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/blog-engagement/comments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(body?.error || 'Verification failed.');
        }

        if (!cancelled) {
          setNotice('Email verified. Your comment is now waiting for moderation approval.');
          await loadComments();
        }
      } catch (verifyError) {
        if (!cancelled) {
          setError(verifyError instanceof Error ? verifyError.message : 'Verification failed.');
        }
      }

      try {
        const nextQuery = { ...router.query };
        delete nextQuery.commentToken;
        await router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [loadComments, router]);

  async function handleSubmitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/blog-engagement/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: postSlug,
          parentCommentId: replyTo,
          authorName: formData.authorName,
          authorEmail: formData.authorEmail,
          authorWebsite: formData.authorWebsite,
          body: formData.body,
          turnstileToken,
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || 'Unable to submit comment.');
      }

      setNotice('Check your email for a verification link to publish your comment.');
      setFormData({ authorName: '', authorEmail: '', authorWebsite: '', body: '' });
      setReplyTo(null);
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit comment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReact(commentId: number, reactionType: CommentReactionType) {
    try {
      const response = await fetch('/api/blog-engagement/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reactionType }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Reaction failed.');
      }

      await loadComments();
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : 'Reaction failed.');
    }
  }

  async function handleReportComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reportFor) {
      return;
    }

    try {
      const response = await fetch('/api/blog-engagement/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: reportFor,
          reason: reportData.reason,
          details: reportData.details,
          reporterEmail: reportData.reporterEmail,
          turnstileToken,
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || 'Unable to report comment.');
      }

      setNotice('Report submitted. Our moderation team will review it.');
      setReportFor(null);
      setReportData({ reason: 'spam', details: '', reporterEmail: '' });
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Unable to report comment.');
    }
  }

  function renderComment(comment: PublicComment) {
    return (
      <article key={comment.id} className="rounded-2xl border border-[#d9e9f2] bg-white p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-[#10162A]">{comment.authorName}</p>
            <p className="text-xs text-[#56697a]">{formatDateTime(comment.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReplyTo((value) => (value === comment.id ? null : comment.id))}
              className="rounded-full border border-[#b8d8ea] px-3 py-1 text-xs font-semibold text-[#003E68]"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => setReportFor(comment.id)}
              className="rounded-full border border-[#ffd0be] px-3 py-1 text-xs font-semibold text-[#a43e1e]"
            >
              Report
            </button>
          </div>
        </header>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-[#1f3346]">{comment.body}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {REACTION_TYPES.map((reaction) => (
            <button
              key={reaction.value}
              type="button"
              onClick={() => void handleReact(comment.id, reaction.value)}
              className="rounded-full border border-[#d1e5f2] px-3 py-1 text-xs font-semibold text-[#21435f]"
            >
              {reaction.label} ({comment.reactions[reaction.value] || 0})
            </button>
          ))}
        </div>

        {comment.replies.length > 0 ? (
          <div className="mt-4 space-y-3 border-l-2 border-[#d9e9f2] pl-4">
            {comment.replies.map((reply) => (
              <article key={reply.id} className="rounded-xl border border-[#e2edf4] bg-[#f8fbfd] p-4">
                <p className="font-semibold text-[#163049]">{reply.authorName}</p>
                <p className="text-xs text-[#5a6e80]">{formatDateTime(reply.createdAt)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#29465f]">{reply.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REACTION_TYPES.map((reaction) => (
                    <button
                      key={reaction.value}
                      type="button"
                      onClick={() => void handleReact(reply.id, reaction.value)}
                      className="rounded-full border border-[#d1e5f2] px-3 py-1 text-[11px] font-semibold text-[#21435f]"
                    >
                      {reaction.label} ({reply.reactions[reaction.value] || 0})
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section className="mt-12 rounded-3xl border border-[#d9e9f2] bg-[#f4f9fd] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#003E68]">Community</p>
          <h2 className="mt-2 text-3xl font-[Georgia,Times_New_Roman,serif] text-[#10162A]">Comments ({totalComments})</h2>
          <p className="mt-2 text-sm text-[#4a6074]">Comments publish after email verification and moderation approval.</p>
        </div>
      </div>

      {notice ? <p className="mt-4 rounded-xl border border-[#b9d8e8] bg-[#eaf6fb] px-4 py-3 text-sm text-[#113956]">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-[#ffd2c5] bg-[#fff2ed] px-4 py-3 text-sm text-[#8f371c]">{error}</p> : null}

      <form className="mt-5 space-y-3 rounded-2xl border border-[#d5e7f2] bg-white p-4 sm:p-5" onSubmit={handleSubmitComment}>
        {replyTo ? <p className="text-xs font-semibold text-[#24516d]">Replying to comment #{replyTo}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={formData.authorName}
            onChange={(event) => setFormData((current) => ({ ...current, authorName: event.target.value }))}
            placeholder="Your name"
            className="min-h-11 rounded-xl border border-[#c8deec] px-3 text-sm"
          />
          <input
            type="email"
            required
            minLength={6}
            maxLength={254}
            value={formData.authorEmail}
            onChange={(event) => setFormData((current) => ({ ...current, authorEmail: event.target.value }))}
            placeholder="Your email"
            className="min-h-11 rounded-xl border border-[#c8deec] px-3 text-sm"
          />
        </div>
        <input
          type="url"
          value={formData.authorWebsite}
          onChange={(event) => setFormData((current) => ({ ...current, authorWebsite: event.target.value }))}
          placeholder="Website (optional, must begin with https://)"
          className="min-h-11 w-full rounded-xl border border-[#c8deec] px-3 text-sm"
        />
        <textarea
          required
          minLength={8}
          maxLength={2500}
          value={formData.body}
          onChange={(event) => setFormData((current) => ({ ...current, body: event.target.value }))}
          placeholder="Share your thoughts"
          className="min-h-[120px] w-full rounded-xl border border-[#c8deec] px-3 py-2 text-sm"
        />
        <TurnstileField token={turnstileToken} onTokenChange={setTurnstileToken} resetKey={turnstileResetKey} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="rounded-full bg-[#007CB8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003E68] disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit comment'}
          </button>
          {replyTo ? (
            <button type="button" onClick={() => setReplyTo(null)} className="rounded-full border border-[#c8deec] px-5 py-2 text-sm font-semibold text-[#234862]">
              Cancel reply
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {loading ? <p className="text-sm text-[#4a6074]">Loading comments...</p> : null}
        {!loading && comments.length === 0 ? <p className="text-sm text-[#4a6074]">No approved comments yet. Be the first to start the conversation.</p> : null}
        {!loading ? comments.map(renderComment) : null}
      </div>

      {reportFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleReportComment} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-semibold text-[#10162A]">Report comment #{reportFor}</h3>
            <p className="mt-2 text-sm text-[#4a6074]">Help us keep the discussion safe.</p>
            <div className="mt-4 space-y-3">
              <select
                value={reportData.reason}
                onChange={(event) => setReportData((current) => ({ ...current, reason: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-[#c8deec] px-3 text-sm"
              >
                <option value="spam">Spam</option>
                <option value="abuse">Abuse</option>
                <option value="off_topic">Off topic</option>
                <option value="other">Other</option>
              </select>
              <textarea
                value={reportData.details}
                onChange={(event) => setReportData((current) => ({ ...current, details: event.target.value }))}
                placeholder="Additional details (optional)"
                className="min-h-[96px] w-full rounded-xl border border-[#c8deec] px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={reportData.reporterEmail}
                onChange={(event) => setReportData((current) => ({ ...current, reporterEmail: event.target.value }))}
                placeholder="Your email (optional)"
                className="min-h-11 w-full rounded-xl border border-[#c8deec] px-3 text-sm"
              />
              <TurnstileField token={turnstileToken} onTokenChange={setTurnstileToken} resetKey={turnstileResetKey} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="rounded-full bg-[#a43e1e] px-5 py-2 text-sm font-semibold text-white">Submit report</button>
              <button
                type="button"
                onClick={() => {
                  setReportFor(null);
                  setReportData({ reason: 'spam', details: '', reporterEmail: '' });
                }}
                className="rounded-full border border-[#c8deec] px-5 py-2 text-sm font-semibold text-[#234862]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
