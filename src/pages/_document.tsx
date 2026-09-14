import { Head, Html, Main, NextScript } from 'next/document';
import { dancingScript, inter, oswald } from '@/lib/fonts';

export default function Document() {
  return (
    <Html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <Head>
        <meta name="google" content="notranslate" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0A1A2A" />
      </Head>
      <body
        className={`notranslate ${oswald.variable} ${inter.variable} ${dancingScript.variable}`}
        suppressHydrationWarning
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}