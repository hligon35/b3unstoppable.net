import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '@/lib/adminAuth';
import {
  buildDefaultBlogInput,
  getReadingTimeMinutes,
  type BlogInput,
} from '@/lib/blogs';
import { deleteBlog, getBlogById, updateBlog } from '@/lib/blogs.server';

function getNumericId(req: NextApiRequest) {
  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number(rawId);

  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseRequestBody(body: unknown): BlogInput {
  const candidate = body && typeof body === 'object' ? (body as Partial<BlogInput>) : {};

  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.map((value) => String(value || '').trim()).filter(Boolean)
    : String(candidate.tags || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  return buildDefaultBlogInput({ ...candidate, tags });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthenticatedRequest(req, 'full')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = getNumericId(req);

  if (!id) {
    return res.status(400).json({ error: 'Invalid blog post id.' });
  }

  if (req.method === 'GET') {
    try {
      const blog = await getBlogById(id);

      if (!blog) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      return res.status(200).json({
        ...blog,
        readingTimeMinutes: getReadingTimeMinutes({
          contentMarkdown: blog.contentMarkdown,
          openingStory: blog.openingStory,
        }),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load blog post', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const payload = parseRequestBody(req.body);
      const updated = await updateBlog(id, payload);

      if (!updated) {
        return res.status(404).json({ error: 'Blog post not found or not updated' });
      }

      const refreshed = await getBlogById(id);
      return res.status(200).json({
        ...refreshed,
        readingTimeMinutes: getReadingTimeMinutes({
          contentMarkdown: refreshed?.contentMarkdown ?? '',
          openingStory: refreshed?.openingStory ?? '',
        }),
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update blog post' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const deleted = await deleteBlog(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete blog post', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
