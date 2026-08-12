import type { GetServerSideProps } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import Layout from '@/components/Layout';
import TurnstileField, { useTurnstileConfig } from '@/components/TurnstileField';
import B3ULogo from '@/images/logos/B3U3D.png';
import { type BlogPost } from '@/lib/blogs';
import { listBlogs } from '@/lib/blogs.server';
import { submitFormToEndpoint } from '@/lib/formsSubmit';
import { createCollectionPageStructuredData, siteUrl } from '@/lib/siteMetadata';
import { useFormsApi } from '@/lib/useFormsApi';

const EMAIL_FIELD_MIN = 6;
const EMAIL_FIELD_MAX = 254;

type JournalPageProps = {
  publishedPosts?: BlogPost[];
};

function formatJournalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JournalPage({ publishedPosts = [] }: JournalPageProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [subPending, setSubPending] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [t0, setT0] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const newsletterFormRef = useRef<HTMLFormElement | null>(null);
  const { formsApi, debugEnabled } = useFormsApi();
  const { isEnabled: turnstileRequired, isLoading: turnstileLoading } = useTurnstileConfig();

  const pageStructuredData = useMemo(
    () =>
      createCollectionPageStructuredData({
        pageUrl: `${siteUrl}/journal/`,
        title: 'The Take Back Journal | B3U',
        description:
          'A B3U journal page for stories, reflections, and reminders that support healing, rebuilding, and becoming unstoppable.',
        keywords: ['B3U journal', 'healing stories', 'Dr. Bree Charles', 'The Big Take Back', 'resilience reflections'],
      }),
    [],
  );

  const hasPosts = publishedPosts.length > 0;
  const featuredPost = publishedPosts[0] ?? null;
  const additionalPosts = publishedPosts.slice(1);
  const launchMessage = hasPosts
    ? 'The journal is live with real stories, and more are on the way.'
    : 'The first stories are being shaped now. The journal is opening soon with honest essays, practical reflections, and a clear path for what comes next.';

  useEffect(() => {
    try {
      setT0(String(Date.now()));
    } catch {}
  }, []);

  async function handleNewsletterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (subPending) {
      return;
    }

    if (!formsApi) {
      setSubError('Subscriptions are temporarily unavailable. Please try again shortly.');
      return;
    }

    if (turnstileLoading) {
      setSubError('Security check is still loading. Please try again in a moment.');
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setSubError('Please complete the security check before subscribing.');
      return;
    }

    setSubError(null);
    setSubPending(true);

    try {
      await submitFormToEndpoint(newsletterFormRef.current!, `${formsApi}?endpoint=newsletter`);
      setSubscribed(true);

      try {
        newsletterFormRef.current?.reset();
      } catch {}

      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);

      try {
        setT0(String(Date.now()));
      } catch {}
    } catch {
      setSubError('Subscription failed. Please try again later.');
    } finally {
      setSubPending(false);
    }
  }

  return (
    <Layout
      title="The Take Back Journal | B3U"
      description="Explore the B3U Journal for reflections on healing, rebuilding, and becoming unstoppable."
      structuredData={pageStructuredData}
    >
      <section className="overflow-hidden bg-[linear-gradient(120deg,rgb(var(--color-navy))_0%,rgb(var(--color-navy))_35%,rgb(var(--color-brand-blue-dark))_72%,rgb(var(--color-brand-blue-light))_100%)] px-6 pb-14 pt-12 text-white md:px-12 md:pb-18 md:pt-16">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-brandOrange-light/95 md:text-sm">BLOG</p>
          <h1 className="mx-auto max-w-5xl text-5xl font-bold uppercase leading-none sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            The Reclamation Journal
          </h1>
          <div className="mx-auto mt-4 h-1.5 w-40 rounded-full bg-brandOrange md:mt-5 md:w-56" />
          <p className="mx-auto mt-6 max-w-3xl text-lg text-white/85 md:text-2xl">
            Taking back everything life tried to silence, bury or break. Stories, reflections, and reminders that support healing, rebuilding, and becoming unstoppable.
          </p>
        </div>
      </section>

      <section id="featured-story" className="section-padding bg-white">
        {hasPosts && featuredPost ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[2rem] bg-brandBlue-light/20 p-8 shadow-[0_24px_60px_rgba(10,26,42,0.18)]">
              <Image
                src={featuredPost.featuredImageUrl || B3ULogo}
                alt={featuredPost.featuredImageAlt || 'B3U journal cover'}
                width={1600}
                height={900}
                priority
                className="h-auto w-full max-w-[26rem] object-contain"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
            </div>
            <div className="max-w-xl lg:pl-4">
              <p className="mb-5 inline-flex items-center border-b border-brandOrange/40 pb-3 text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">
                Latest Story
              </p>
              <h2 className="text-4xl font-bold leading-tight text-navy md:text-5xl">{featuredPost.title}</h2>
              <p className="mt-6 text-lg leading-8 text-navy/80">{featuredPost.deck || launchMessage}</p>
              <p className="mt-4 text-lg leading-8 text-navy/80">
                {featuredPost.openingStory || 'A new B3U reflection is live now, with more journal entries arriving soon.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/journal/${featuredPost.slug}/`} className="btn-primary">
                  Read the Latest Story
                </Link>
                <Link href="/#newsletter" className="btn-outline">
                  Join the Weekly
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-brandBlue/15 bg-[linear-gradient(135deg,rgb(var(--color-brand-blue-light)_/_0.22)_0%,rgb(var(--color-brand-blue)_/_0.08)_100%)] px-8 py-12 text-center shadow-[0_24px_60px_rgba(10,26,42,0.12)] md:px-12 md:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Journal Launching Soon</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight text-navy md:text-5xl">
              The first stories are being assembled now.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-navy/75">{launchMessage}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/#newsletter" className="btn-primary">
                Join the Weekly
              </Link>
              <Link href="/contact" className="btn-outline">
                Say Hello
              </Link>
            </div>
          </div>
        )}
      </section>

      {hasPosts ? (
        <section id="journal-entries" className="bg-white px-6 pb-24 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Journal Entries</p>
                <h2 className="mt-2 text-3xl font-bold text-navy md:text-4xl">Stories that are live now</h2>
              </div>
              <p className="hidden max-w-md text-right text-sm leading-6 text-navy/65 md:block">
                {additionalPosts.length > 0 ? 'Browse the newest reflections below.' : 'The first entry is live. More stories are coming soon.'}
              </p>
            </div>

            {additionalPosts.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {additionalPosts.map((post) => {
                  const imageSource = post.featuredImageUrl || B3ULogo;

                  return (
                    <article
                      key={post.id}
                      className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_18px_44px_rgba(10,26,42,0.08)]"
                    >
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-brandBlue-light/20 p-8">
                        <Image
                          src={imageSource}
                          alt={post.featuredImageAlt || 'B3U journal cover'}
                          width={1200}
                          height={900}
                          className="h-auto w-full max-w-[13rem] object-contain"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-7">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandOrange">{post.category || 'Journal'}</p>
                        <h3 className="mt-3 text-3xl font-bold leading-tight text-navy">{post.title}</h3>
                        <p className="mt-4 text-base leading-7 text-navy/75">{post.deck || post.openingStory || 'A new B3U reflection is ready to read.'}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">{formatJournalDate(post.publishAt || post.createdAt)}</p>
                        <Link
                          href={`/journal/${post.slug}/`}
                          className="mt-auto pt-6 inline-flex items-center text-sm font-semibold uppercase tracking-[0.14em] text-brandOrange transition hover:text-brandOrange-dark"
                        >
                          Read story
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="bg-navy px-6 py-18 text-white md:px-12">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(11,31,50,0.98)_0%,rgba(10,26,42,0.92)_52%,rgba(18,45,70,0.92)_100%)] px-8 py-12 shadow-[0_24px_70px_rgba(10,26,42,0.35)] md:px-12">
          <blockquote className="text-center">
            <p className="text-3xl font-bold leading-tight md:text-5xl">
              Every time I tell the truth about what I survived, I leave a door open for someone else to walk through.
            </p>
            <footer className="mt-6 text-xl font-semibold text-brandOrange">Dr. Bree Charles</footer>
          </blockquote>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,rgb(var(--color-brand-blue-light)_/_0.34)_0%,rgb(var(--color-brand-blue)_/_0.18)_100%)] px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-5xl gap-10 rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_24px_60px_rgba(10,26,42,0.12)] backdrop-blur md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Join the Take Back Weekly</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight text-navy md:text-5xl">
              Stay close to the stories, the tools, and the next reminder you need.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-navy/75">
              Subscribe for new journal entries, podcast releases, event updates, and practical encouragement that meets you where you are.
            </p>
          </div>

          <form className="space-y-4 self-center" onSubmit={handleNewsletterSubmit} ref={newsletterFormRef}>
            <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <input type="hidden" name="t0" value={t0} />
            {debugEnabled ? <input type="hidden" name="debug" value="1" /> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                name="email"
                required
                minLength={EMAIL_FIELD_MIN}
                maxLength={EMAIL_FIELD_MAX}
                placeholder="Enter your email address"
                className="min-h-14 flex-1 rounded-md border border-black/10 bg-white px-5 py-3 text-base text-navy outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/40"
              />
              <button className="btn-primary min-h-14 whitespace-nowrap" type="submit" disabled={subPending}>
                {subPending ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
            <div className="flex justify-center md:justify-start">
              <TurnstileField
                className="inline-flex flex-col items-center md:items-start"
                token={turnstileToken}
                onTokenChange={setTurnstileToken}
                resetKey={turnstileResetKey}
              />
            </div>
            <p className="text-sm text-navy/65">No spam. Just the support you signed up for.</p>
            {subscribed ? (
              <div className="w-full rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Thanks! You&apos;re subscribed.
              </div>
            ) : null}
            {subError ? (
              <div className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {subError}
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<JournalPageProps> = async () => {
  const publishedPosts = await listBlogs({ status: 'published' });

  return {
    props: {
      publishedPosts,
    },
  };
};
