import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import AdminFrame from '@/components/admin/AdminFrame';
import JournalArticleLayout from '@/components/blog/JournalArticleLayout';
import { getAdminRole, hasAdminSession, type AdminRole } from '@/lib/adminAuth';
import { getReadingTimeMinutes, type BlogPost } from '@/lib/blogs';
import { getBlogById } from '@/lib/blogs.server';

type AdminBlogPreviewPageProps = {
  adminRole: AdminRole;
  post: BlogPost;
};

export default function AdminBlogPreviewPage({ adminRole, post }: AdminBlogPreviewPageProps) {
  const readingTimeMinutes = getReadingTimeMinutes({
    contentMarkdown: post.contentMarkdown,
    openingStory: post.openingStory,
  });

  return (
    <AdminFrame adminRole={adminRole} activeId="blog" title="Blog" subtitle="Preview your article across responsive breakpoints.">
      <div className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">This preview mirrors the public journal article view.</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/blog/${post.id}/edit`} className="inline-flex min-h-11 items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">
                Edit
              </Link>
              <Link href={`/journal/${post.slug}`} className="inline-flex min-h-11 items-center rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandBlue-dark">
                Open public page
              </Link>
            </div>
          </div>
        </div>

        <JournalArticleLayout article={post} readingTimeMinutes={readingTimeMinutes} previewViewport="desktop" />
      </div>
    </AdminFrame>
  );
}

export const getServerSideProps: GetServerSideProps<AdminBlogPreviewPageProps> = async ({ req, params }) => {
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

  const rawId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const id = Number(rawId);

  if (!Number.isFinite(id) || id <= 0) {
    return { notFound: true };
  }

  const post = await getBlogById(id);

  if (!post) {
    return { notFound: true };
  }

  return {
    props: {
      adminRole,
      post,
    },
  };
};
