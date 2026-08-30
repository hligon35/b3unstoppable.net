import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '@/lib/adminAuth';
import {
  buildDefaultBlogInput,
  getReadingTimeMinutes,
  slugifyBlogTitle,
  type BlogInput,
} from '@/lib/blogs';
import { createBlog, listBlogCategories, listBlogs } from '@/lib/blogs.server';

function parseRequestBody(body: unknown): BlogInput {
  const candidate = body && typeof body === 'object' ? (body as Partial<BlogInput>) : {};

  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.map((value) => String(value || '').trim()).filter(Boolean)
    : String(candidate.tags || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  return buildDefaultBlogInput({
    ...candidate,
    tags,
    slug: candidate.slug ? String(candidate.slug) : slugifyBlogTitle(String(candidate.title || '')),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAuthenticatedRequest(req, 'full')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const category = typeof req.query.category === 'string' ? req.query.category : '';
      const posts = await listBlogs({ query, status: status as 'all', category });
      const categories = await listBlogCategories();

      return res.status(200).json({
        posts: posts.map((post) => ({
          ...post,
          readingTimeMinutes: getReadingTimeMinutes({
            contentMarkdown: post.contentMarkdown,
            openingStory: post.openingStory,
          }),
        })),
        categories,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load blog posts', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = parseRequestBody(req.body);
      const created = await createBlog(payload);

      if (!created) {
        return res.status(500).json({ error: 'Failed to create blog post' });
      }

      return res.status(201).json({
        ...created,
        readingTimeMinutes: getReadingTimeMinutes({
          contentMarkdown: created.contentMarkdown,
          openingStory: created.openingStory,
        }),
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create blog post' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
