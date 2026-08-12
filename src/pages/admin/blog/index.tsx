import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminFrame from '@/components/admin/AdminFrame';
import { getAdminRole, hasAdminSession, type AdminRole } from '@/lib/adminAuth';

type BlogListItem = {
  id: number;
  title: string;
  slug: string;
  deck: string;
  author: string;
  category: string;
  tags: string[];
  status: 'draft' | 'scheduled' | 'published';
  publishAt: string | null;
  featuredImageUrl: string | null;
  updatedAt: string;
  readingTimeMinutes: number;
};

type BlogListResponse = {
  posts: BlogListItem[];
  categories: string[];
};

type AdminBlogIndexProps = {
  adminRole: AdminRole;
};

const STATUS_FILTERS: Array<{ value: 'all' | 'draft' | 'scheduled' | 'published'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
];

function formatDateLabel(value: string | null) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusBadgeClass(status: BlogListItem['status']) {
  if (status === 'published') {
    return 'bg-brandBlue-light/25 text-navy';
  }

  if (status === 'scheduled') {
    return 'bg-brandOrange/15 text-brandOrange-dark';
  }

  return 'bg-slate-200 text-slate-700';
}

export default function AdminBlogIndex({ adminRole }: AdminBlogIndexProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [category, setCategory] = useState('all');
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'error'>('info');

  const categoryOptions = useMemo(() => ['all', ...categories], [categories]);
  const draftCount = useMemo(() => posts.filter((post) => post.status === 'draft').length, [posts]);
  const totalCount = posts.length;

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const queryStatus = Array.isArray(router.query.status) ? router.query.status[0] : router.query.status;
    const queryCategory = Array.isArray(router.query.category) ? router.query.category[0] : router.query.category;
    const querySearch = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q;

    if (queryStatus === 'draft' || queryStatus === 'scheduled' || queryStatus === 'published' || queryStatus === 'all') {
      setStatus(queryStatus);
    }

    if (typeof queryCategory === 'string' && queryCategory) {
      setCategory(queryCategory);
    }

    if (typeof querySearch === 'string') {
      setSearchInput(querySearch);
      setQuery(querySearch);
    }
  }, [router.isReady, router.query.category, router.query.q, router.query.status]);

  const loadPosts = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set('q', query.trim());
      }

      if (status !== 'all') {
        params.set('status', status);
      }

      if (category !== 'all') {
        params.set('category', category);
      }

      const response = await fetch(`/api/blogs?${params.toString()}`);
      const body = (await response.json().catch(() => null)) as Partial<BlogListResponse> & { error?: string };

      if (!response.ok) {
        throw new Error((body as { error?: string })?.error || `Blog API returned ${response.status}`);
      }

      setPosts(Array.isArray(body.posts) ? body.posts : []);
      setCategories(Array.isArray(body.categories) ? body.categories : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to load blog posts.');
      setNoticeTone('error');
    } finally {
      setLoading(false);
    }
  }, [category, query, status]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function handleDelete(post: BlogListItem) {
    const confirmed = window.confirm(`Delete blog \"${post.title}\"?`);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/blogs/${post.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || `Blog API returned ${response.status}`);
      }

      setNotice('Blog post deleted successfully.');
      setNoticeTone('success');
      await loadPosts();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to delete blog post.');
      setNoticeTone('error');
    }
  }

  async function handleDuplicate(post: BlogListItem) {
    try {
      const sourceResponse = await fetch(`/api/blogs/${post.id}`);
      const sourceBody = await sourceResponse.json().catch(() => null);

      if (!sourceResponse.ok) {
        throw new Error(sourceBody?.error || `Blog API returned ${sourceResponse.status}`);
      }

      const duplicatePayload = {
        ...sourceBody,
        title: `${sourceBody.title} (Copy)`,
        slug: `${sourceBody.slug}-copy-${Date.now().toString().slice(-5)}`,
        status: 'draft',
        publishAt: null,
      };

      const createResponse = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload),
      });
      const createBody = await createResponse.json().catch(() => null);

      if (!createResponse.ok) {
        throw new Error(createBody?.error || `Blog API returned ${createResponse.status}`);
      }

      setNotice('Blog post duplicated as a draft.');
      setNoticeTone('success');
      await loadPosts();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to duplicate blog post.');
      setNoticeTone('error');
    }
  }

  return (
    <AdminFrame adminRole={adminRole} activeId="blog" title="Blog" subtitle="Create, schedule, and publish journal articles.">
      <div className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">Blog</h2>
              <span className="inline-flex min-h-9 items-center rounded-full border border-brandBlue/25 bg-brandBlue-light/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-navy">
                {draftCount} draft{draftCount === 1 ? '' : 's'} · {totalCount} total
              </span>
            </div>
            <Link href="/admin/blog/new" className="inline-flex min-h-11 items-center rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandBlue-dark">
              New Blog
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Search by title</span>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search posts"
                  className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setQuery(searchInput)}
                  className="min-h-11 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                >
                  Search
                </button>
              </div>
            </label>

            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Status</span>
              <div className="inline-flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatus(filter.value)}
                    className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition ${status === filter.value ? 'bg-slate-950 text-white' : 'border border-gray-300 text-gray-700 hover:border-brandBlue hover:text-brandBlue'}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 lg:min-w-48">
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option === 'all' ? 'All categories' : option}</option>
                ))}
              </select>
            </label>
          </div>

          {notice ? (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${noticeTone === 'success' ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy' : noticeTone === 'error' ? 'border-brandOrange/25 bg-brandOrange/10 text-navy' : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'}`}>
              {notice}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          {loading ? <p className="p-4 text-sm text-gray-600">Loading blogs...</p> : null}

          {!loading && !posts.length ? (
            <div className="rounded-3xl border border-dashed border-brandBlue/25 bg-brandBlue-light/10 p-8 text-center">
              <h3 className="text-xl font-semibold text-slate-900">No blog posts yet</h3>
              <p className="mt-2 text-sm text-slate-600">Create your first blog to start publishing journal stories.</p>
              <Link href="/admin/blog/new" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandBlue-dark">
                Create your first blog
              </Link>
            </div>
          ) : null}

          {!loading && posts.length ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Image</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Author</th>
                      <th className="px-3 py-2">Publish Date</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="rounded-2xl border border-gray-200 bg-slate-50 align-top">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{post.title}</p>
                          <p className="mt-1 text-xs text-slate-500">/{post.slug} · {post.readingTimeMinutes} min read</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-16 w-28 overflow-hidden rounded-lg bg-slate-200">
                            {post.featuredImageUrl ? <img src={post.featuredImageUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">{post.category || 'Uncategorized'}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(post.status)}`}>{post.status}</span></td>
                        <td className="px-3 py-3 text-sm text-slate-700">{post.author || 'B3U Editorial'}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{formatDateLabel(post.publishAt)}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{formatDateLabel(post.updatedAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/admin/blog/${post.id}/edit`} className="min-h-11 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">Edit</Link>
                            <Link href={`/admin/blog/${post.id}/preview`} className="min-h-11 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">Preview</Link>
                            <button type="button" onClick={() => void handleDuplicate(post)} className="min-h-11 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">Duplicate</button>
                            <button type="button" onClick={() => void handleDelete(post)} className="min-h-11 rounded-full border border-brandOrange/30 px-3 py-2 text-xs font-semibold text-brandOrange transition hover:bg-brandOrange hover:text-white">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-24 overflow-hidden rounded-lg bg-slate-200">
                        {post.featuredImageUrl ? <img src={post.featuredImageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{post.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">/{post.slug}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(post.status)}`}>{post.status}</span>
                          <span className="text-xs text-slate-600">{post.category || 'Uncategorized'}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">{post.author || 'B3U Editorial'} · {post.readingTimeMinutes} min read</p>
                    <p className="mt-1 text-xs text-slate-500">Publish: {formatDateLabel(post.publishAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">Updated: {formatDateLabel(post.updatedAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/admin/blog/${post.id}/edit`} className="min-h-11 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Edit</Link>
                      <Link href={`/admin/blog/${post.id}/preview`} className="min-h-11 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Preview</Link>
                      <button type="button" onClick={() => void handleDuplicate(post)} className="min-h-11 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Duplicate</button>
                      <button type="button" onClick={() => void handleDelete(post)} className="min-h-11 rounded-full border border-brandOrange/30 px-3 py-2 text-xs font-semibold text-brandOrange">Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </AdminFrame>
  );
}

export const getServerSideProps: GetServerSideProps<AdminBlogIndexProps> = async ({ req }) => {
  if (!hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/login?redirect=/admin/blog',
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
    },
  };
};
