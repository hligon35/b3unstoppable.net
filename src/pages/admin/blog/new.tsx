import type { GetServerSideProps } from 'next';

import AdminFrame from '@/components/admin/AdminFrame';
import BlogEditorScreen from '@/components/blog/BlogEditorScreen';
import { getAdminRole, hasAdminSession, type AdminRole } from '@/lib/adminAuth';
import { buildDefaultBlogInput, type BlogInput } from '@/lib/blogs';

type AdminNewBlogPageProps = {
  adminRole: AdminRole;
};

export default function AdminNewBlogPage({ adminRole }: AdminNewBlogPageProps) {
  async function handlePersist(payload: BlogInput) {
    try {
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        return { ok: false, message: body?.error || `Blog API returned ${response.status}` };
      }

      return { ok: true, message: 'Blog post created.', id: body?.id as number | undefined };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Failed to create blog post.' };
    }
  }

  return (
    <AdminFrame adminRole={adminRole} activeId="blog" title="Blog" subtitle="Create a new journal article.">
      <BlogEditorScreen backHref="/admin/blog" mode="new" initialPost={buildDefaultBlogInput()} onPersist={handlePersist} />
    </AdminFrame>
  );
}

export const getServerSideProps: GetServerSideProps<AdminNewBlogPageProps> = async ({ req }) => {
  if (!hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/login?redirect=/admin/blog/new',
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
