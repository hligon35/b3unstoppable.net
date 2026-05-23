type HeroContent = {
  heading: string;
  subheading: string;
  tagline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  bookingText: string;
  bookingLinkLabel: string;
  bookingLinkHref: string;
  eventBadgeLabel: string;
  backgroundImageUrl: string;
};

type AboutContent = {
  title: string;
  descriptionPrimary: string;
  descriptionSecondary: string;
  quote: string;
  ctaLabel: string;
  ctaHref: string;
};

type PodcastContent = {
  title: string;
  subtitle: string;
  description: string;
  watchTitle: string;
  watchDescription: string;
  youtubeUrl: string;
  watchNowLabel: string;
};

type CommunityContent = {
  title: string;
  description: string;
};

type ShopContent = {
  eyebrow: string;
  title: string;
  descriptionPrimary: string;
  descriptionSecondary: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
};

type NewsletterContent = {
  title: string;
  description: string;
  buttonLabel: string;
};

export type HomePageContent = {
  seoTitle: string;
  seoDescription: string;
  hero: HeroContent;
  about: AboutContent;
  podcast: PodcastContent;
  community: CommunityContent;
  shop: ShopContent;
  newsletter: NewsletterContent;
};

const SANITY_API_VERSION = process.env.SANITY_API_VERSION || '2025-01-01';
const SANITY_DATASET = process.env.SANITY_DATASET || 'production';
export const CMS_REVALIDATE_SECONDS = 120;

function getSanityApiBase(preview: boolean) {
  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) return null;

  if (preview) {
    const token = process.env.SANITY_READ_TOKEN;
    if (!token) return null;
    const params = new URLSearchParams({
      query: HOME_PAGE_QUERY,
      perspective: 'previewDrafts',
      token,
    });
    return `https://${projectId}.api.sanity.io/${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?${params.toString()}`;
  }

  const params = new URLSearchParams({ query: HOME_PAGE_QUERY });
  return `https://${projectId}.api.sanity.io/${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?${params.toString()}`;
}

const HOME_PAGE_QUERY = `
*[_type == "homePage" && _id == "homePage"][0]{
  seoTitle,
  seoDescription,
  hero{
    heading,
    subheading,
    tagline,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    secondaryCtaHref,
    bookingText,
    bookingLinkLabel,
    bookingLinkHref,
    eventBadgeLabel,
    "backgroundImageUrl": backgroundImage.asset->url
  },
  about{
    title,
    descriptionPrimary,
    descriptionSecondary,
    quote,
    ctaLabel,
    ctaHref
  },
  podcast{
    title,
    subtitle,
    description,
    watchTitle,
    watchDescription,
    youtubeUrl,
    watchNowLabel
  },
  community{
    title,
    description
  },
  shop{
    eyebrow,
    title,
    descriptionPrimary,
    descriptionSecondary,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    secondaryCtaHref
  },
  newsletter{
    title,
    description,
    buttonLabel
  }
}
`;

export const fallbackHomePageContent: HomePageContent = {
  seoTitle: 'B3U — Burn, Break, Become Unstoppable | Richmond, VA',
  seoDescription:
    'Empowerment, speaking, and community with Dr. Bree Charles. B3U (Burn, Break, Become Unstoppable) is based in Richmond, VA and serves surrounding areas across Central Virginia.',
  hero: {
    heading: "You don't have to stay where life left you — you can rise, rebuild, and become unstoppable.",
    subheading: 'Transformational Speaker | Author | U.S. Army Veteran | Creator of the B3U Podcast',
    tagline: 'Breaking Cycles. Building Legacies.',
    primaryCtaLabel: 'Listen to The B3U Podcast',
    primaryCtaHref: '/podcast',
    secondaryCtaLabel: 'Book Bree for Your Event',
    secondaryCtaHref: '/contact',
    bookingText: 'Dr. Bree Charles is now available for speaking engagements, workshops, and events.',
    bookingLinkLabel: 'Inquire about booking',
    bookingLinkHref: '/contact',
    eventBadgeLabel: 'Upcoming live event',
    backgroundImageUrl: '',
  },
  about: {
    title: 'About Dr. Bree Charles',
    descriptionPrimary:
      "Transformational speaker, author, U.S. Army veteran, and creator of the B3U Podcast. Bree has turned her pain into purpose, proving that brokenness doesn't mean defeat — it means rebirth.",
    descriptionSecondary:
      'Through courage, faith, and relentless resilience, she helps others burn away fear, break destructive patterns, and become who they were created to be.',
    quote: 'Breaking Cycles. Building Legacies.',
    ctaLabel: 'Learn More About Bree',
    ctaHref: '/about',
  },
  podcast: {
    title: 'The B3U Podcast',
    subtitle: 'Burn, Break, Become Unstoppable',
    description:
      'Conversations featuring stories of resilience, transformation, and the courage to rebuild. Every episode is a reminder that your pain can become your purpose.',
    watchTitle: 'Watch B3U',
    watchDescription: 'Watch new content online, or through',
    youtubeUrl: 'https://www.youtube.com/channel/UCSrtA1gGlgo4cQUzoSlzZ5w',
    watchNowLabel: 'Watch now',
  },
  community: {
    title: 'The Take Back Community',
    description:
      'Stories from listeners who have found the courage to burn away fear, break cycles, and become unstoppable.',
  },
  shop: {
    eyebrow: 'Featured release',
    title: 'Order yours NOW - The Big Take Back: What I Left Behind',
    descriptionPrimary:
      'This is for the reader who is done surviving on autopilot and ready to reclaim what life tried to take. Dr. Bree Charles writes with honesty, hard-won insight, and practical guidance for healing and forward movement.',
    descriptionSecondary:
      'The Big Take Back: What I Left Behind is more than a memoir. It is a call to break repeating cycles, face what you have been avoiding, and rebuild your life with clarity, confidence, and conviction.',
    primaryCtaLabel: 'Get the Book',
    primaryCtaHref: '/shop',
    secondaryCtaLabel: 'See Book Details',
    secondaryCtaHref: '/event-gallery',
  },
  newsletter: {
    title: 'Join "The Take Back Weekly"',
    description: 'Get new episodes, inspiration, and community opportunities delivered to your inbox.',
    buttonLabel: 'Subscribe',
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeObject<T extends Record<string, unknown>>(base: T, incoming: unknown): T {
  if (!isObject(incoming)) return base;
  return { ...base, ...incoming } as T;
}

export async function getHomePageContent(preview: boolean): Promise<HomePageContent> {
  const url = getSanityApiBase(preview);
  if (!url) return fallbackHomePageContent;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: CMS_REVALIDATE_SECONDS },
    });

    if (!response.ok) return fallbackHomePageContent;

    const payload = await response.json() as { result?: unknown };
    const result = payload.result;
    if (!isObject(result)) return fallbackHomePageContent;

    return {
      ...fallbackHomePageContent,
      ...result,
      hero: mergeObject(fallbackHomePageContent.hero as Record<string, unknown>, result.hero) as HeroContent,
      about: mergeObject(fallbackHomePageContent.about as Record<string, unknown>, result.about) as AboutContent,
      podcast: mergeObject(fallbackHomePageContent.podcast as Record<string, unknown>, result.podcast) as PodcastContent,
      community: mergeObject(fallbackHomePageContent.community as Record<string, unknown>, result.community) as CommunityContent,
      shop: mergeObject(fallbackHomePageContent.shop as Record<string, unknown>, result.shop) as ShopContent,
      newsletter: mergeObject(fallbackHomePageContent.newsletter as Record<string, unknown>, result.newsletter) as NewsletterContent,
    };
  } catch {
    return fallbackHomePageContent;
  }
}
