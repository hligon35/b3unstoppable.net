import type { GetServerSideProps } from 'next';
import { useCallback, useEffect, useState } from 'react';

import AdminFrame from '@/components/admin/AdminFrame';
import { getAdminRole, hasAdminSession, type AdminRole } from '@/lib/adminAuth';
import type { ModerationComment } from '@/lib/blogEngagementShared';

type OpenReport = {
  id: number;
  comment_id: number;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  created_at: string;
  status: 'open' | 'resolved' | 'dismissed';
};

type AdminBlogModerationProps = {
  adminRole: AdminRole;
  csrfToken: string;
};

export default function AdminBlogModerationPage({ adminRole, csrfToken }: AdminBlogModerationProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [reports, setReports] = useState<OpenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadModerationQueue = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/blog-engagement/admin/moderation?status=${encodeURIComponent(statusFilter)}`);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || 'Unable to load moderation queue.');
      }

      setComments(Array.isArray(body.comments) ? body.comments : []);
      setReports(Array.isArray(body.reports) ? body.reports : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load moderation queue.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadModerationQueue();
  }, [loadModerationQueue]);

  async function moderateComment(commentId: number, action: 'approve' | 'reject' | 'hide' | 'delete' | 'restore') {
    try {
      const response = await fetch('/api/blog-engagement/admin/moderation', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ commentId, action, targetType: 'comment' }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || 'Moderation action failed.');
      }

      setNotice(`Action applied: ${action}`);
      await loadModerationQueue();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Moderation action failed.');
    }
  }

  async function resolveReport(reportId: number, status: 'resolved' | 'dismissed') {
    try {
      const response = await fetch('/api/blog-engagement/admin/moderation', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ targetType: 'report', reportId, status }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || 'Report update failed.');
      }

      setNotice(`Report marked ${status}.`);
      await loadModerationQueue();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Report update failed.');
    }
  }

  return (
    <AdminFrame
      adminRole={adminRole}
      activeId="blog"
      title="Blog Moderation"
      subtitle="Review verified comments, process reports, and manage community safety."
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Moderation Queue</h2>
              <p className="mt-1 text-sm text-slate-600">Email-verified comments move into this queue before publication.</p>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending_moderation">Pending moderation</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="hidden">Hidden</option>
              <option value="deleted">Deleted</option>
              <option value="pending_verification">Pending verification</option>
            </select>
          </div>

          {notice ? <p className="mt-4 rounded-xl border border-[#d4e8f4] bg-[#eef7fc] px-4 py-3 text-sm text-[#183d56]">{notice}</p> : null}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          {loading ? <p className="p-4 text-sm text-slate-600">Loading queue...</p> : null}

          {!loading && comments.length === 0 ? <p className="p-4 text-sm text-slate-600">No comments in this queue.</p> : null}

          {!loading && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <article key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Comment #{comment.id}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{comment.authorName} · {comment.authorEmailMasked}</h3>
                      <p className="text-xs text-slate-500">Post #{comment.postId} · Status: {comment.status} · Verified: {comment.isEmailVerified ? 'yes' : 'no'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void moderateComment(comment.id, 'approve')} className="min-h-11 rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Approve</button>
                      <button type="button" onClick={() => void moderateComment(comment.id, 'reject')} className="min-h-11 rounded-full border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">Reject</button>
                      <button type="button" onClick={() => void moderateComment(comment.id, 'hide')} className="min-h-11 rounded-full border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700">Hide</button>
                      <button type="button" onClick={() => void moderateComment(comment.id, 'delete')} className="min-h-11 rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Delete</button>
                      <button type="button" onClick={() => void moderateComment(comment.id, 'restore')} className="min-h-11 rounded-full border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700">Restore</button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.body}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="px-2 text-xl font-semibold text-slate-950">Open Reports</h2>
          {!loading && reports.length === 0 ? <p className="p-4 text-sm text-slate-600">No open reports.</p> : null}

          {reports.length > 0 ? (
            <div className="space-y-3 p-2">
              {reports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Report #{report.id}</p>
                  <p className="mt-1 text-sm text-slate-700">Comment #{report.comment_id} · Reason: {report.reason}</p>
                  {report.details ? <p className="mt-2 text-sm text-slate-700">{report.details}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">Reporter: {report.reporter_email || 'Anonymous'} · {new Date(report.created_at).toLocaleString()}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void resolveReport(report.id, 'resolved')} className="min-h-11 rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Resolve</button>
                    <button type="button" onClick={() => void resolveReport(report.id, 'dismissed')} className="min-h-11 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Dismiss</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </AdminFrame>
  );
}

export const getServerSideProps: GetServerSideProps<AdminBlogModerationProps> = async ({ req }) => {
  if (!hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/login?redirect=/admin/blog/moderation',
        permanent: false,
      },
    };
  }

  const adminRole = getAdminRole(req.headers.cookie) ?? 'full';

  if (adminRole !== 'full') {
    return {
      redirect: {
        destination: '/admin?tab=newsletter',
        permanent: false,
      },
    };
  }

  return {
    props: {
      adminRole,
      csrfToken: process.env.CSRF_TOKEN || '',
    },
  };
};
