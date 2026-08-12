import type { GetServerSideProps } from 'next';

import AdminFrame from '@/components/admin/AdminFrame';
import BlogEditorScreen from '@/components/blog/BlogEditorScreen';
import { getAdminRole, hasAdminSession, type AdminRole } from '@/lib/adminAuth';
import { buildDefaultBlogInput, type BlogInput, type BlogPost } from '@/lib/blogs';
import { getBlogById } from '@/lib/blogs.server';

type AdminEditBlogPageProps = {
  adminRole: AdminRole;
  post: BlogPost;
};

export default function AdminEditBlogPage({ adminRole, post }: AdminEditBlogPageProps) {
  async function handlePersist(payload: BlogInput) {
    try {
      const response = await fetch(`/api/blogs/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        return { ok: false, message: body?.error || `Blog API returned ${response.status}` };
      }

      return { ok: true, message: 'Blog post saved.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Failed to save blog post.' };
    }
  }

  return (
    <AdminFrame adminRole={adminRole} activeId="blog" title="Blog" subtitle="Edit your journal article with live preview.">
      <BlogEditorScreen
        backHref="/admin/blog"
        mode="edit"
        initialPost={buildDefaultBlogInput(post)}
        existingPost={post}
        onPersist={handlePersist}
      />
    </AdminFrame>
  );
}

export const getServerSideProps: GetServerSideProps<AdminEditBlogPageProps> = async ({ req, params }) => {
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
