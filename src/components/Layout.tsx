import { ReactNode, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { siteName, siteUrl } from '@/lib/siteMetadata';
import Navbar from './Navbar';
import Footer from './Footer';
import SummitPopup from './SummitPopup';

type LayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  canonicalUrlOverride?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const DEFAULT_TITLE = `${siteName} | Richmond, VA`;
const DEFAULT_DESCRIPTION =
  'B3U (Burn, Break, Become Unstoppable) with Dr. Bree Charles — empowerment, community, and speaking in Richmond, VA and surrounding areas across Central Virginia.';

const OG_IMAGE_URL = `${siteUrl}/og.png`;

export default function Layout({ children, title, description, canonicalUrlOverride, structuredData }: LayoutProps) {
  const { pathname, asPath } = useRouter();
  const isHomePage = pathname === '/';
  const isRestrictedPage = /^\/(admin|login|forgot-password|reset-password|newsletter-builder|debug)(?:\/|$)/.test(pathname);
  const mainClassName = isHomePage ? '' : 'pt-44';

  const canonicalUrl = useMemo(() => {
    if (canonicalUrlOverride?.trim()) {
      return canonicalUrlOverride.trim();
    }

    const rawPath = (asPath || pathname || '/').split('?')[0].split('#')[0] || '/';
    const normalizedPath = rawPath === '/' ? '/' : rawPath.replace(/\/$/, '') + '/';
    return `${siteUrl}${normalizedPath}`;
  }, [asPath, canonicalUrlOverride, pathname]);

  const pageTitle = title?.trim() ? title.trim() : DEFAULT_TITLE;
  const pageDescription = description?.trim() ? description.trim() : DEFAULT_DESCRIPTION;

  const jsonLdItems = useMemo(() => {
    const socialProfiles = [
      'https://www.youtube.com/channel/UCSrtA1gGlgo4cQUzoSlzZ5w',
      'https://www.instagram.com/burnbreakbecomeunstoppable/',
      'https://www.facebook.com/bree.b3u',
    ];

    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Dr. Bree Charles',
        url: siteUrl,
        worksFor: {
          '@type': 'Organization',
          name: siteName,
          url: siteUrl,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: '9221 Forest Hill Ave Suite 1 PMB 1021',
          addressLocality: 'Richmond',
          addressRegion: 'VA',
          postalCode: '23235',
          addressCountry: 'US',
        },
        areaServed: [
          'Richmond, VA',
          'Henrico County, VA',
          'Chesterfield County, VA',
          'Glen Allen, VA',
          'Midlothian, VA',
          'Mechanicsville, VA',
          'Central Virginia',
        ],
        sameAs: socialProfiles,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/icons/icon-512.png`,
        sameAs: socialProfiles,
        founder: {
          '@type': 'Person',
          name: 'Dr. Bree Charles',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl,
        inLanguage: 'en-US',
        publisher: {
          '@type': 'Organization',
          name: siteName,
          url: siteUrl,
        },
      },
    ];
  }, []);

  const structuredDataItems = useMemo(() => {
    if (!structuredData) return [];
    return Array.isArray(structuredData) ? structuredData : [structuredData];
  }, [structuredData]);
  
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Dr. Bree Charles, B3U, Burn Break Become Unstoppable, Richmond VA speaker, The Big Take Back, resilience podcast, empowerment community" />
        <meta name="author" content="Dr. Bree Charles" />
        <meta name="creator" content={siteName} />
        <meta name="publisher" content={siteName} />
        <meta name="application-name" content={siteName} />
        <meta name="apple-mobile-web-app-title" content="B3U" />
        <meta name="format-detection" content="telephone=no,address=no,email=no" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt" />

        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content="en_US" />

        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="B3U — Burn, Break, Become Unstoppable | Richmond, VA & Surrounding Areas" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={OG_IMAGE_URL} />
        <meta name="twitter:site" content="@burnbreakb3u" />

        <meta name="geo.region" content="US-VA" />
        <meta name="geo.placename" content="Richmond" />
        <meta name="geo.position" content="37.5407;-77.4360" />
        <meta name="ICBM" content="37.5407, -77.4360" />

        {jsonLdItems.map((item, index) => (
          <script
            key={`base-structured-data-${index}`}
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          />
        ))}
        {structuredDataItems.map((item, index) => (
          <script
            key={`structured-data-${index}`}
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          />
        ))}
      </Head>
      <Navbar />
      {!isRestrictedPage ? <SummitPopup /> : null}
      <main className={mainClassName}>
        {children}
      </main>
      <Footer />
    </>
  );
}
