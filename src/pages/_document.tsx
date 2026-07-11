import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" translate="no" className="notranslate">
      <Head>
        <meta name="google" content="notranslate" />
      </Head>
      <body className="notranslate">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}