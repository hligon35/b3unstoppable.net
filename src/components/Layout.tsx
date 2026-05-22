import { ReactNode, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const SITE_NAME = 'B3U — Burn, Break, Become Unstoppable';
const SITE_URL = 'https://www.b3unstoppable.net';

const DEFAULT_TITLE = `${SITE_NAME} | Richmond, VA`;
const DEFAULT_DESCRIPTION =
  'B3U (Burn, Break, Become Unstoppable) with Dr. Bree Charles — empowerment, community, and speaking in Richmond, VA and surrounding areas across Central Virginia.';

const OG_IMAGE_URL = `${SITE_URL}/og.png`;

export default function Layout({ children, title, description, structuredData }: LayoutProps) {
  const { pathname, asPath } = useRouter();
  const isHomePage = pathname === '/';
  const mainClassName = isHomePage ? '' : 'pt-44';

  const canonicalUrl = useMemo(() => {
    const rawPath = (asPath || pathname || '/').split('?')[0].split('#')[0] || '/';
    const normalizedPath = rawPath === '/' ? '/' : rawPath.replace(/\/$/, '') + '/';
    return `${SITE_URL}${normalizedPath}`;
  }, [asPath, pathname]);

  const pageTitle = title?.trim() ? title.trim() : DEFAULT_TITLE;
  const pageDescription = description?.trim() ? description.trim() : DEFAULT_DESCRIPTION;

  const jsonLd = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Dr. Bree Charles',
      url: SITE_URL,
      worksFor: {
        '@type': 'Organization',
        name: 'B3U — Burn, Break, Become Unstoppable',
        url: SITE_URL,
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
      sameAs: [
        'https://www.youtube.com/channel/UCSrtA1gGlgo4cQUzoSlzZ5w',
        'https://www.instagram.com/burnbreakbecomeunstoppable/',
        'https://www.facebook.com/bree.b3u',
      ],
    };
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
        <link rel="canonical" href={canonicalUrl} />

        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
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

        <meta name="geo.region" content="US-VA" />
        <meta name="geo.placename" content="Richmond" />
        <meta name="geo.position" content="37.5407;-77.4360" />
        <meta name="ICBM" content="37.5407, -77.4360" />

        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
      <main className={mainClassName}>
        {children}
      </main>
      <Footer />
    </>
  );
}
