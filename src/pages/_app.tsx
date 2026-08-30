import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import AdminNewsletterEnhancer from '@/components/AdminNewsletterEnhancer';
import { usePublishedSiteDraft, type SiteDraft } from '@/lib/siteEditorContent';
import '../styles/globals.css';

type PublishedDraftPageProps = {
  initialSiteDraft?: SiteDraft;
  initialSiteUpdatedAt?: string | null;
};

function hexToRgbChannels(hex: string) {
  const normalizedHex = hex.replace('#', '');

  if (normalizedHex.length !== 6) {
    return null;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  if ([red, blue, green].some(Number.isNaN)) {
    return null;
  }

  return `${red} ${green} ${blue}`;
}

function buildPaletteStyle(draft: SiteDraft) {
  const paletteEntries: Array<[string, string]> = [
    ['--color-brand-blue', draft.brandBlue],
    ['--color-brand-blue-dark', draft.brandBlueDark],
    ['--color-brand-blue-light', draft.brandBlueLight],
    ['--color-brand-orange', draft.brandOrange],
    ['--color-brand-orange-dark', draft.brandOrangeDark],
    ['--color-brand-orange-light', draft.brandOrangeLight],
    ['--color-navy', draft.navy],
  ];

  const declarations = paletteEntries
    .map(([tokenName, tokenValue]) => {
      const rgbChannels = hexToRgbChannels(tokenValue);
      return rgbChannels ? `${tokenName}: ${rgbChannels};` : null;
    })
    .filter(Boolean)
    .join(' ');

  return declarations ? `:root { ${declarations} }` : '';
}

export default function App({ Component, pageProps }: AppProps) {
  const cloudflareAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;
  const publishedDraftPageProps = pageProps as PublishedDraftPageProps;
  const { draft: publishedDraft } = usePublishedSiteDraft({
    initialDraft: publishedDraftPageProps.initialSiteDraft,
    initialUpdatedAt: publishedDraftPageProps.initialSiteUpdatedAt ?? null,
    preferLocalDraft: false,
  });
  const paletteStyle = buildPaletteStyle(publishedDraft);

  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        {paletteStyle ? <style>{paletteStyle}</style> : null}
      </Head>

      {cloudflareAnalyticsToken ? (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
          strategy="lazyOnload"
        />
      ) : null}

      <Component {...pageProps} />
      <AdminNewsletterEnhancer />
    </>
  );
}
