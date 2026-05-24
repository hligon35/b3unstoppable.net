import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { DebugPanel } from '../../utils/debug/dev-panel';
import { DebugErrorBoundary } from '../../utils/debug/error-boundary';
import { installClientMonitoring, recordPageView, recordRoutePerformance } from '../../utils/debug/client';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const routeStartedAtRef = useRef<number | null>(null);
  const cloudflareAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;

  useEffect(() => {
    installClientMonitoring();
    recordPageView(router.asPath);
  }, []);

  useEffect(() => {
    const onRouteStart = () => {
      routeStartedAtRef.current = performance.now();
    };

    const onRouteComplete = (url: string) => {
      if (routeStartedAtRef.current !== null) {
        recordRoutePerformance(url, performance.now() - routeStartedAtRef.current);
        routeStartedAtRef.current = null;
      }
      recordPageView(url);
    };

    const onRouteError = (_error: Error, url: string) => {
      if (routeStartedAtRef.current !== null) {
        recordRoutePerformance(url, performance.now() - routeStartedAtRef.current, true);
        routeStartedAtRef.current = null;
      }
    };

    router.events.on('routeChangeStart', onRouteStart);
    router.events.on('routeChangeComplete', onRouteComplete);
    router.events.on('routeChangeError', onRouteError);
    return () => {
      router.events.off('routeChangeStart', onRouteStart);
      router.events.off('routeChangeComplete', onRouteComplete);
      router.events.off('routeChangeError', onRouteError);
    };
  }, [router.events]);

  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      {cloudflareAnalyticsToken ? (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
          strategy="lazyOnload"
        />
      ) : null}

      <DebugErrorBoundary>
        <Component {...pageProps} />
      </DebugErrorBoundary>
      <DebugPanel />
    </>
  );
}
