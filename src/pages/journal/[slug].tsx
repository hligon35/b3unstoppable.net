import type { GetServerSideProps } from 'next';

import Layout from '@/components/Layout';
import JournalArticleLayout from '@/components/blog/JournalArticleLayout';
import { getReadingTimeMinutes, type BlogPost } from '@/lib/blogs';
import { getBlogBySlug } from '@/lib/blogs.server';
import { siteUrl } from '@/lib/siteMetadata';

type JournalArticlePageProps = {
  post: BlogPost;
};

export default function JournalArticlePage({ post }: JournalArticlePageProps) {
  const readingTimeMinutes = getReadingTimeMinutes({
    contentMarkdown: post.contentMarkdown,
    openingStory: post.openingStory,
  });

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.deck;
  const articleUrl = `${siteUrl}/journal/${post.slug}/`;
  const canonicalUrl = post.canonicalUrl || articleUrl;
  const image = post.socialImageUrl || post.featuredImageUrl || `${siteUrl}/og.png`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    author: {
      '@type': 'Person',
      name: post.author || 'B3U Editorial Team',
    },
    datePublished: post.publishAt || post.createdAt,
    dateModified: post.updatedAt,
    image: image ? [image] : undefined,
    mainEntityOfPage: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: 'B3U — Burn, Break, Become Unstoppable',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icons/icon-512.png`,
      },
    },
    articleSection: post.category || undefined,
    keywords: post.tags.length ? post.tags.join(', ') : undefined,
  };

  return (
    <Layout title={title} description={description} canonicalUrlOverride={canonicalUrl} structuredData={structuredData}>
      <section className="bg-white px-4 py-10 sm:px-6 lg:px-10">
        <JournalArticleLayout article={post} readingTimeMinutes={readingTimeMinutes} previewViewport="desktop" />
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<JournalArticlePageProps> = async ({ params }) => {
  const slug = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;

  if (!slug) {
    return { notFound: true };
  }

  const post = await getBlogBySlug(slug);

  if (!post || post.status !== 'published') {
    return { notFound: true };
  }

  return {
    props: {
      post,
    },
  };
};
