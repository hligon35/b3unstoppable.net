import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <Head>
        <meta name="google" content="notranslate" />
      </Head>
      <body className="notranslate" suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}