import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { BlogInput } from '@/lib/blogs';

type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

type JournalArticleLayoutProps = {
  article: BlogInput & {
    title: string;
    slug: string;
    status: 'draft' | 'scheduled' | 'published';
    publishAt: string | null;
  };
  readingTimeMinutes: number;
  showPlaceholders?: boolean;
  previewViewport?: PreviewViewport;
  className?: string;
};

type InlineNode = {
  type: 'text' | 'strong' | 'em' | 'link';
  text: string;
  href?: string;
};

type ParsedBlock =
  | { type: 'p'; nodes: InlineNode[] }
  | { type: 'h2'; nodes: InlineNode[] }
  | { type: 'h3'; nodes: InlineNode[] }
  | { type: 'quote'; nodes: InlineNode[] }
  | { type: 'ul'; items: InlineNode[][] }
  | { type: 'ol'; items: InlineNode[][] }
  | { type: 'image'; alt: string; src: string };

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      nodes.push({ type: 'strong', text: match[2] });
    } else if (match[4]) {
      nodes.push({ type: 'em', text: match[4] });
    } else if (match[6] && match[7]) {
      nodes.push({ type: 'link', text: match[6], href: match[7] });
    }

    lastIndex = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return nodes.length ? nodes : [{ type: 'text', text }];
}

function parseMarkdown(markdown: string): ParsedBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ParsedBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index] ?? '';
    const line = raw.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

    if (imageMatch) {
      blocks.push({ type: 'image', alt: imageMatch[1] || '', src: imageMatch[2] || '' });
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', nodes: parseInline(line.slice(3)) });
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', nodes: parseInline(line.slice(4)) });
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      blocks.push({ type: 'quote', nodes: parseInline(line.slice(2)) });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: InlineNode[][] = [];

      while (index < lines.length) {
        const current = (lines[index] || '').trim();

        if (!/^[-*]\s+/.test(current)) {
          break;
        }

        items.push(parseInline(current.replace(/^[-*]\s+/, '')));
        index += 1;
      }

      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: InlineNode[][] = [];

      while (index < lines.length) {
        const current = (lines[index] || '').trim();

        if (!/^\d+\.\s+/.test(current)) {
          break;
        }

        items.push(parseInline(current.replace(/^\d+\.\s+/, '')));
        index += 1;
      }

      blocks.push({ type: 'ol', items });
      continue;
    }

    const paragraphLines = [raw];
    index += 1;

    while (index < lines.length) {
      const currentRaw = lines[index] || '';
      const current = currentRaw.trim();

      if (!current || /^(##\s|###\s|>\s|[-*]\s+|\d+\.\s+|!\[[^\]]*\]\([^)]+\))/.test(current)) {
        break;
      }

      paragraphLines.push(currentRaw);
      index += 1;
    }

    blocks.push({ type: 'p', nodes: parseInline(paragraphLines.join(' ').trim()) });
  }

  return blocks;
}

function renderInline(nodes: InlineNode[]) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}-${node.text.slice(0, 12)}`;

    if (node.type === 'strong') {
      return <strong key={key}>{node.text}</strong>;
    }

    if (node.type === 'em') {
      return <em key={key}>{node.text}</em>;
    }

    if (node.type === 'link') {
      const href = node.href || '#';
      const isExternal = /^https?:\/\//i.test(href);

      return (
        <a
          key={key}
          href={href}
          className="text-[#007CB8] underline decoration-[#007CB8]/35 underline-offset-4 transition hover:text-[#003E68]"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        >
          {node.text}
        </a>
      );
    }

    return <span key={key}>{node.text}</span>;
  });
}

function formatPublishDate(value: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function getPreviewContainerClassName(viewport: PreviewViewport) {
  if (viewport === 'mobile') {
    return 'max-w-[420px]';
  }

  if (viewport === 'tablet') {
    return 'max-w-[860px]';
  }

  return 'max-w-[1120px]';
}

function PlaceholderText({ showPlaceholders, children }: { showPlaceholders?: boolean; children: ReactNode }) {
  if (showPlaceholders) {
    return <>{children}</>;
  }

  return null;
}

export default function JournalArticleLayout({
  article,
  readingTimeMinutes,
  showPlaceholders,
  previewViewport = 'desktop',
  className,
}: JournalArticleLayoutProps) {
  const blocks = parseMarkdown(article.contentMarkdown);
  const publishDateLabel = formatPublishDate(article.publishAt);
  const hasBurn = Boolean(article.burnTitle || article.burnBody);
  const hasBreak = Boolean(article.breakTitle || article.breakBody);
  const hasBecome = Boolean(article.becomeTitle || article.becomeBody);
  const hasPodcast = Boolean(article.relatedPodcastTitle || article.relatedPodcastUrl);

  return (
    <article className={`bg-white text-[#162432] ${className ?? ''}`}>
      <div className={`mx-auto ${getPreviewContainerClassName(previewViewport)} overflow-hidden rounded-3xl border border-[#d9e9f2] bg-white shadow-[0_28px_70px_rgba(16,22,42,0.14)]`}>
        <header className="bg-[linear-gradient(120deg,#10162A_0%,#003E68_58%,#007CB8_100%)] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#EAF6FB]">B3U Journal</p>
              <h1 className="mt-4 font-[Georgia,Times_New_Roman,serif] text-4xl leading-tight sm:text-5xl">{article.title || 'Untitled Blog'}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/90">{article.deck || <PlaceholderText showPlaceholders={showPlaceholders}>A short introduction will appear here.</PlaceholderText>}</p>
            </div>
            <Image src="/images/logos/B3U3D.png" alt="B3U logo" width={96} height={96} className="hidden h-20 w-20 object-contain sm:block" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#EAF6FB]">
            <span>By {article.author || 'B3U Editorial Team'}</span>
            <span aria-hidden="true">•</span>
            <span>{publishDateLabel}</span>
            <span aria-hidden="true">•</span>
            <span>{readingTimeMinutes} min read</span>
            {article.category ? (
              <>
                <span aria-hidden="true">•</span>
                <span className="rounded-full border border-white/35 px-2 py-1 text-xs uppercase tracking-[0.18em]">{article.category}</span>
              </>
            ) : null}
          </div>
        </header>

        {article.featuredImageUrl ? (
          <figure className="border-b border-[#d9e9f2] bg-[#EAF6FB]">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img src={article.featuredImageUrl} alt={article.featuredImageAlt || ''} className="h-full w-full object-cover" />
            </div>
            {article.featuredImageCaption ? <figcaption className="px-6 py-4 text-sm text-[#3a4a5a] sm:px-10">{article.featuredImageCaption}</figcaption> : null}
          </figure>
        ) : null}

        <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
          {article.openingStory ? <p className="mb-8 rounded-2xl border border-[#cfe5f2] bg-[#EAF6FB] px-5 py-4 text-lg leading-8 text-[#1f3041]">{article.openingStory}</p> : null}

          <div className="space-y-6 text-[1.03rem] leading-8">
            {blocks.length ? blocks.map((block, blockIndex) => {
              const key = `block-${blockIndex}`;

              if (block.type === 'h2') {
                return <h2 key={key} className="font-[Georgia,Times_New_Roman,serif] text-3xl leading-tight text-[#10162A]">{renderInline(block.nodes)}</h2>;
              }

              if (block.type === 'h3') {
                return <h3 key={key} className="font-[Georgia,Times_New_Roman,serif] text-2xl leading-tight text-[#003E68]">{renderInline(block.nodes)}</h3>;
              }

              if (block.type === 'quote') {
                return <blockquote key={key} className="border-l-4 border-[#F36C0A] bg-[#fff7f2] px-5 py-4 font-[Georgia,Times_New_Roman,serif] text-2xl italic leading-9 text-[#6b3a12]">{renderInline(block.nodes)}</blockquote>;
              }

              if (block.type === 'ul') {
                return (
                  <ul key={key} className="list-disc space-y-2 pl-6 marker:text-[#007CB8]">
                    {block.items.map((item, itemIndex) => <li key={`${key}-item-${itemIndex}`}>{renderInline(item)}</li>)}
                  </ul>
                );
              }

              if (block.type === 'ol') {
                return (
                  <ol key={key} className="list-decimal space-y-2 pl-6 marker:text-[#003E68]">
                    {block.items.map((item, itemIndex) => <li key={`${key}-item-${itemIndex}`}>{renderInline(item)}</li>)}
                  </ol>
                );
              }

              if (block.type === 'image') {
                return (
                  <figure key={key} className="overflow-hidden rounded-2xl border border-[#d9e9f2]">
                    <img src={block.src} alt={block.alt || ''} className="w-full object-cover" />
                    {block.alt ? <figcaption className="px-4 py-3 text-sm text-[#4a5866]">{block.alt}</figcaption> : null}
                  </figure>
                );
              }

              return <p key={key}>{renderInline(block.nodes)}</p>;
            }) : <p className="text-[#536272]"><PlaceholderText showPlaceholders={showPlaceholders}>Main article content will appear here as you write.</PlaceholderText></p>}
          </div>

          <div className="mt-12 space-y-8">
            {hasBurn ? (
              <section>
                <h2 className="font-[Georgia,Times_New_Roman,serif] text-3xl text-[#10162A]">{article.burnTitle || 'Burn'}</h2>
                <p className="mt-3 whitespace-pre-wrap text-[1.03rem] leading-8">{article.burnBody}</p>
              </section>
            ) : null}

            {hasBreak ? (
              <section>
                <h2 className="font-[Georgia,Times_New_Roman,serif] text-3xl text-[#10162A]">{article.breakTitle || 'Break'}</h2>
                <p className="mt-3 whitespace-pre-wrap text-[1.03rem] leading-8">{article.breakBody}</p>
              </section>
            ) : null}

            {hasBecome ? (
              <section>
                <h2 className="font-[Georgia,Times_New_Roman,serif] text-3xl text-[#10162A]">{article.becomeTitle || 'Become'}</h2>
                <p className="mt-3 whitespace-pre-wrap text-[1.03rem] leading-8">{article.becomeBody}</p>
              </section>
            ) : null}

            {article.pullQuote ? (
              <blockquote className="rounded-3xl border border-[#ffd2ae] bg-[#fff3e8] px-6 py-7 font-[Georgia,Times_New_Roman,serif] text-3xl italic leading-tight text-[#6b3a12]">
                “{article.pullQuote}”
              </blockquote>
            ) : null}

            {article.reflectionQuestion ? (
              <section className="rounded-3xl border border-[#b5d9ec] bg-[#EAF6FB] px-6 py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#003E68]">Reflection</p>
                <p className="mt-3 text-xl leading-8 text-[#12344f]">{article.reflectionQuestion}</p>
              </section>
            ) : null}

            {article.ctaLabel && article.ctaUrl ? (
              <div className="rounded-3xl border border-[#b5d9ec] bg-[#f7fcff] px-6 py-7">
                <Link href={article.ctaUrl} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#007CB8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#003E68]">
                  {article.ctaLabel}
                </Link>
              </div>
            ) : null}

            {hasPodcast ? (
              <section className="rounded-3xl border border-[#d9e9f2] bg-white px-6 py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#003E68]">Related Podcast</p>
                <h3 className="mt-3 text-xl font-semibold text-[#10162A]">{article.relatedPodcastTitle || 'Listen to the related episode'}</h3>
                {article.relatedPodcastUrl ? (
                  <a href={article.relatedPodcastUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-[#007CB8] underline underline-offset-4 hover:text-[#003E68]">
                    Open podcast
                  </a>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-3xl border border-[#d9e9f2] bg-white px-6 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#003E68]">About the Author</p>
              <h3 className="mt-3 text-xl font-semibold text-[#10162A]">{article.author || 'B3U Editorial Team'}</h3>
              <p className="mt-2 text-sm leading-7 text-[#405364]">B3U stories focused on healing, growth, and becoming unstoppable.</p>
            </section>

            <section className="rounded-3xl border border-dashed border-[#b5d9ec] bg-[#f7fcff] px-6 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#003E68]">Related Journal Entries</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#d9e9f2] bg-white p-4 text-sm text-[#33495c]">Related article placeholder</div>
                <div className="rounded-2xl border border-[#d9e9f2] bg-white p-4 text-sm text-[#33495c]">Related article placeholder</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
