export const siteUrl = 'https://www.b3unstoppable.net';
export const siteName = 'B3U — Burn, Break, Become Unstoppable';

const bookDescription =
  'The Big Take Back: What I Left Behind by Dr. Bree Charles is a memoir and practical guide for breaking cycles, healing deeply, and reclaiming your life with intention.';

export function createWebPageStructuredData(params: {
  pageUrl: string;
  title: string;
  description: string;
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.title,
    description: params.description,
    url: params.pageUrl,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
    },
    about: {
      '@type': 'Person',
      name: 'Dr. Bree Charles',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
    },
    keywords: params.keywords?.length ? params.keywords.join(', ') : undefined,
  };
}

export function createCollectionPageStructuredData(params: {
  pageUrl: string;
  title: string;
  description: string;
  keywords?: string[];
}) {
  return {
    ...createWebPageStructuredData(params),
    '@type': 'CollectionPage',
  };
}

export function createBookStructuredData(params: {
  pageUrl: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: 'The Big Take Back: What I Left Behind',
    description: bookDescription,
    url: params.pageUrl,
    image: params.imageUrl ? [params.imageUrl] : undefined,
    inLanguage: 'en-US',
    author: {
      '@type': 'Person',
      name: 'Dr. Bree Charles',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
    },
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/shop/`,
      priceCurrency: 'USD',
    },
  };
}