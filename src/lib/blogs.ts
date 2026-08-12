export type BlogStatus = 'draft' | 'scheduled' | 'published';

export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  deck: string;
  author: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishAt: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  featuredImageCaption: string | null;
  socialImageUrl: string | null;
  contentMarkdown: string;
  openingStory: string;
  burnTitle: string;
  burnBody: string;
  breakTitle: string;
  breakBody: string;
  becomeTitle: string;
  becomeBody: string;
  pullQuote: string;
  reflectionQuestion: string;
  ctaLabel: string;
  ctaUrl: string;
  relatedPodcastTitle: string;
  relatedPodcastUrl: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  socialCaption: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogInput = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>;

export type BlogListFilters = {
  query?: string;
  status?: BlogStatus | 'all';
  category?: string;
};

export const BLOG_STATUS_OPTIONS: BlogStatus[] = ['draft', 'scheduled', 'published'];

function sanitizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function sanitizeLongString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeNullableString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

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
    .map((tag) => sanitizeString(tag))
    .filter(Boolean)
    .slice(0, 20);
}

export function slugifyBlogTitle(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'untitled-blog';
}

function calculateReadingTimeMinutesFromContent(content: string, openingStory: string) {
  const combined = `${openingStory}\n\n${content}`.trim();

  if (!combined) {
    return 1;
  }

  const words = combined
    .replace(/[#>*_`\[\]()!-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
}

export function buildDefaultBlogInput(seed?: Partial<BlogInput>): BlogInput {
  const title = sanitizeString(seed?.title, '');
  const deck = sanitizeLongString(seed?.deck, '');
  const author = sanitizeString(seed?.author, 'Dr. Bree Charles');
  const featuredImageUrl = sanitizeNullableString(seed?.featuredImageUrl);

  return {
    title,
    slug: sanitizeString(seed?.slug, title ? slugifyBlogTitle(title) : ''),
    deck,
    author,
    category: sanitizeString(seed?.category, ''),
    tags: sanitizeTags(seed?.tags),
    status: sanitizeStatus(seed?.status),
    publishAt: typeof seed?.publishAt === 'string' ? seed.publishAt : null,
    featuredImageUrl,
    featuredImageAlt: sanitizeString(seed?.featuredImageAlt, ''),
    featuredImageCaption: sanitizeNullableString(seed?.featuredImageCaption),
    socialImageUrl: sanitizeNullableString(seed?.socialImageUrl),
    contentMarkdown: sanitizeLongString(seed?.contentMarkdown, ''),
    openingStory: sanitizeLongString(seed?.openingStory, ''),
    burnTitle: sanitizeString(seed?.burnTitle, ''),
    burnBody: sanitizeLongString(seed?.burnBody, ''),
    breakTitle: sanitizeString(seed?.breakTitle, ''),
    breakBody: sanitizeLongString(seed?.breakBody, ''),
    becomeTitle: sanitizeString(seed?.becomeTitle, ''),
    becomeBody: sanitizeLongString(seed?.becomeBody, ''),
    pullQuote: sanitizeLongString(seed?.pullQuote, ''),
    reflectionQuestion: sanitizeLongString(seed?.reflectionQuestion, ''),
    ctaLabel: sanitizeString(seed?.ctaLabel, ''),
    ctaUrl: sanitizeString(seed?.ctaUrl, ''),
    relatedPodcastTitle: sanitizeString(seed?.relatedPodcastTitle, ''),
    relatedPodcastUrl: sanitizeString(seed?.relatedPodcastUrl, ''),
    seoTitle: sanitizeString(seed?.seoTitle, title),
    seoDescription: sanitizeString(seed?.seoDescription, deck),
    canonicalUrl: sanitizeString(seed?.canonicalUrl, ''),
    socialCaption: sanitizeString(seed?.socialCaption, deck),
  };
}

export function validateBlogInput(input: BlogInput, existing?: BlogPost | null) {
  const errors: Record<string, string> = {};

  if (!input.title.trim()) {
    errors.title = 'Title is required.';
  }

  if (!input.slug.trim()) {
    errors.slug = 'Slug is required.';
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim())) {
    errors.slug = 'Use lowercase letters, numbers, and hyphens only.';
  }

  if (input.featuredImageUrl && !input.featuredImageAlt.trim()) {
    errors.featuredImageAlt = 'Alt text is required when a featured image is set.';
  }

  if (input.status === 'scheduled' && !input.publishAt) {
    errors.publishAt = 'Choose a scheduled date and time.';
  }

  if (input.status === 'published' && !input.publishAt) {
    errors.publishAt = 'Choose a publish date and time.';
  }

  if (input.ctaUrl && !/^https?:\/\//i.test(input.ctaUrl) && !input.ctaUrl.startsWith('/')) {
    errors.ctaUrl = 'Use an https URL or an internal path starting with /.';
  }

  if (input.relatedPodcastUrl && !/^https?:\/\//i.test(input.relatedPodcastUrl) && !input.relatedPodcastUrl.startsWith('/')) {
    errors.relatedPodcastUrl = 'Use an https URL or an internal path starting with /.';
  }

  if (existing?.status === 'published' && existing.slug !== input.slug) {
    errors.slugChangeWarning = 'Changing the slug of a published article can break existing links.';
  }

  return { errors, isValid: Object.keys(errors).filter((key) => key !== 'slugChangeWarning').length === 0 };
}

export function getReadingTimeMinutes(input: Pick<BlogInput, 'contentMarkdown' | 'openingStory'>) {
  return calculateReadingTimeMinutesFromContent(input.contentMarkdown, input.openingStory);
}

export function normalizeBlogInput(input: BlogInput) {
  const base = buildDefaultBlogInput(input);

  return {
    ...base,
    title: base.title.trim(),
    slug: slugifyBlogTitle(base.slug),
    deck: base.deck.trim(),
    author: base.author.trim(),
    category: base.category.trim(),
    tags: base.tags,
    featuredImageAlt: base.featuredImageAlt.trim(),
    featuredImageCaption: sanitizeNullableString(base.featuredImageCaption),
    socialImageUrl: sanitizeNullableString(base.socialImageUrl),
    ctaLabel: base.ctaLabel.trim(),
    ctaUrl: base.ctaUrl.trim(),
    relatedPodcastTitle: base.relatedPodcastTitle.trim(),
    relatedPodcastUrl: base.relatedPodcastUrl.trim(),
    seoTitle: base.seoTitle.trim() || base.title.trim(),
    seoDescription: base.seoDescription.trim() || base.deck.trim(),
    canonicalUrl: base.canonicalUrl.trim(),
    socialCaption: base.socialCaption.trim() || base.deck.trim(),
  };
}
