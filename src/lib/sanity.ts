import { createClient, type QueryParams } from '@sanity/client';

export type HomePageContent = {
  aboutHeading?: string;
  aboutParagraphOne?: string;
  aboutParagraphTwo?: string;
  aboutTagline?: string;
  aboutCtaLabel?: string;
  aboutCtaHref?: string;
  aboutImages?: Array<{
    alt?: string;
    url: string;
  }>;
  featuredVideo?: {
    url?: string;
  };
  featuredVideoPoster?: {
    url?: string;
  };
  newsletterHeading?: string;
  newsletterDescription?: string;
};

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET;
const apiVersion = process.env.SANITY_API_VERSION || '2026-01-01';

export function isSanityConfigured() {
  return Boolean(projectId && dataset);
}

function getSanityClient(preview = false) {
  if (!projectId || !dataset) return null;

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: !preview,
    token: preview ? process.env.SANITY_API_READ_TOKEN : undefined,
    perspective: preview ? 'previewDrafts' : 'published',
  });
}

export async function fetchSanityQuery<T>({
  query,
  params,
  preview = false,
}: {
  query: string;
  params?: QueryParams;
  preview?: boolean;
}): Promise<T | null> {
  const client = getSanityClient(preview);
  if (!client) return null;

  if (preview && !process.env.SANITY_API_READ_TOKEN) {
    return null;
  }

  try {
    return await client.fetch<T>(query, params || {});
  } catch (error) {
    console.warn('Sanity fetch failed:', error);
    return null;
  }
}

const homePageQuery = `*[_type == "homePage"][0]{
  aboutHeading,
  aboutParagraphOne,
  aboutParagraphTwo,
  aboutTagline,
  aboutCtaLabel,
  aboutCtaHref,
  aboutImages[]{
    alt,
    "url": asset->url
  },
  featuredVideo{
    "url": asset->url
  },
  featuredVideoPoster{
    "url": asset->url
  },
  newsletterHeading,
  newsletterDescription
}`;

export async function fetchHomePageContent({ preview = false }: { preview?: boolean }) {
  return fetchSanityQuery<HomePageContent>({
    query: homePageQuery,
    preview,
  });
}
