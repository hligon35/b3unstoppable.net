import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}