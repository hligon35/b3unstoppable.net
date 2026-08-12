import {
  createBlogPostRow,
  deleteBlogPostRow,
  getBlogPostRowById,
  getBlogPostRowBySlug,
  listBlogPostCategories,
  listBlogPostRows,
  updateBlogPostRow,
} from './db';
import { normalizeBlogInput, type BlogInput, type BlogListFilters, type BlogPost, type BlogStatus } from './blogs';

function sanitizeStatus(value: unknown): BlogStatus {
  if (value === 'scheduled' || value === 'published' || value === 'draft') {
    return value;
  }

  return 'draft';
}

function sanitizeTags(tags: unknown) {
  if (!Array.isArray(tags)) {
    return [] as string[];
  }

  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter(Boolean)
    .slice(0, 20);
}

function mapRowToBlogPost(row: Awaited<ReturnType<typeof getBlogPostRowById>>) {
  if (!row) {
    return null;
  }

  let tags: string[] = [];

  try {
    const parsed = JSON.parse(row.tags_json) as unknown;
    tags = sanitizeTags(parsed);
  } catch {
    tags = [];
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    deck: row.deck,
    author: row.author,
    category: row.category,
    tags,
    status: sanitizeStatus(row.status),
    publishAt: row.publish_at,
    featuredImageUrl: row.featured_image_url,
    featuredImageAlt: row.featured_image_alt,
    featuredImageCaption: row.featured_image_caption,
    socialImageUrl: row.social_image_url,
    contentMarkdown: row.content_markdown,
    openingStory: row.opening_story,
    burnTitle: row.burn_title,
    burnBody: row.burn_body,
    breakTitle: row.break_title,
    breakBody: row.break_body,
    becomeTitle: row.become_title,
    becomeBody: row.become_body,
    pullQuote: row.pull_quote,
    reflectionQuestion: row.reflection_question,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    relatedPodcastTitle: row.related_podcast_title,
    relatedPodcastUrl: row.related_podcast_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    canonicalUrl: row.canonical_url,
    socialCaption: row.social_caption,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies BlogPost;
}

export async function listBlogs(filters?: BlogListFilters) {
  const rows = await listBlogPostRows(filters);
  return rows
    .map((row) => mapRowToBlogPost(row))
    .filter((row): row is BlogPost => Boolean(row));
}

export async function listBlogCategories() {
  const rows = await listBlogPostCategories();
  return rows.map((row) => row.category).filter(Boolean);
}

export async function getBlogById(id: number) {
  return mapRowToBlogPost(await getBlogPostRowById(id));
}

export async function getBlogBySlug(slug: string) {
  return mapRowToBlogPost(await getBlogPostRowBySlug(slug));
}

export async function createBlog(input: BlogInput) {
  const normalized = normalizeBlogInput(input);

  const created = await createBlogPostRow({
    title: normalized.title,
    slug: normalized.slug,
    deck: normalized.deck,
    author: normalized.author,
    category: normalized.category,
    tagsJson: JSON.stringify(normalized.tags),
    status: normalized.status,
    publishAt: normalized.publishAt,
    featuredImageUrl: normalized.featuredImageUrl,
    featuredImageAlt: normalized.featuredImageAlt,
    featuredImageCaption: normalized.featuredImageCaption,
    socialImageUrl: normalized.socialImageUrl,
    contentMarkdown: normalized.contentMarkdown,
    openingStory: normalized.openingStory,
    burnTitle: normalized.burnTitle,
    burnBody: normalized.burnBody,
    breakTitle: normalized.breakTitle,
    breakBody: normalized.breakBody,
    becomeTitle: normalized.becomeTitle,
    becomeBody: normalized.becomeBody,
    pullQuote: normalized.pullQuote,
    reflectionQuestion: normalized.reflectionQuestion,
    ctaLabel: normalized.ctaLabel,
    ctaUrl: normalized.ctaUrl,
    relatedPodcastTitle: normalized.relatedPodcastTitle,
    relatedPodcastUrl: normalized.relatedPodcastUrl,
    seoTitle: normalized.seoTitle,
    seoDescription: normalized.seoDescription,
    canonicalUrl: normalized.canonicalUrl,
    socialCaption: normalized.socialCaption,
  });

  return mapRowToBlogPost(created);
}

export async function updateBlog(id: number, input: BlogInput) {
  const normalized = normalizeBlogInput(input);

  return updateBlogPostRow({
    id,
    title: normalized.title,
    slug: normalized.slug,
    deck: normalized.deck,
    author: normalized.author,
    category: normalized.category,
    tagsJson: JSON.stringify(normalized.tags),
    status: normalized.status,
    publishAt: normalized.publishAt,
    featuredImageUrl: normalized.featuredImageUrl,
    featuredImageAlt: normalized.featuredImageAlt,
    featuredImageCaption: normalized.featuredImageCaption,
    socialImageUrl: normalized.socialImageUrl,
    contentMarkdown: normalized.contentMarkdown,
    openingStory: normalized.openingStory,
    burnTitle: normalized.burnTitle,
    burnBody: normalized.burnBody,
    breakTitle: normalized.breakTitle,
    breakBody: normalized.breakBody,
    becomeTitle: normalized.becomeTitle,
    becomeBody: normalized.becomeBody,
    pullQuote: normalized.pullQuote,
    reflectionQuestion: normalized.reflectionQuestion,
    ctaLabel: normalized.ctaLabel,
    ctaUrl: normalized.ctaUrl,
    relatedPodcastTitle: normalized.relatedPodcastTitle,
    relatedPodcastUrl: normalized.relatedPodcastUrl,
    seoTitle: normalized.seoTitle,
    seoDescription: normalized.seoDescription,
    canonicalUrl: normalized.canonicalUrl,
    socialCaption: normalized.socialCaption,
  });
}

export async function deleteBlog(id: number) {
  return deleteBlogPostRow(id);
}
