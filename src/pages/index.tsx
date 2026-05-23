import Layout from '@/components/Layout';
import Hero from '@/components/Hero';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GetStaticPropsContext } from 'next';
import about1 from '@/images/content/about1.jpeg';
import about2 from '@/images/content/about2.jpeg';
import BookImage from '@/images/shop/bookCover.png';
import about3 from '@/images/photos/J&B-(2 of 3).JPEG';
import about4 from '@/images/photos/J&B-(3 of 3).JPEG';
import RokuLogo from '@/images/logos/rokuLogo.png';
import FireTvLogo from '@/images/logos/firetv.png';
import B3ULogo from '@/images/logos/B3U3D.png';
import MogulChannelLogo from '@/images/logos/MTVG.png';
import SoleExperienceLogo from '@/images/logos/soleexp.png';
import Test1 from '@/images/content/test1.JPG';
import Test2 from '@/images/content/test2.JPEG';
import { useFormsApi } from '@/lib/useFormsApi';
import { submitFormToEndpoint } from '@/lib/formsSubmit';
import { communityEvent, createCommunityEventStructuredData, siteUrl } from '@/lib/communityEvent';
import { CMS_REVALIDATE_SECONDS, getHomePageContent, type HomePageContent } from '@/lib/cms';

const EMAIL_FIELD_MIN = 6;
const EMAIL_FIELD_MAX = 254;

type HomePageProps = {
  homeContent: HomePageContent;
  previewMode: boolean;
};

export default function HomePage({ homeContent, previewMode }: HomePageProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [subPending, setSubPending] = useState(false);
  const newsletterFormRef = useRef<HTMLFormElement | null>(null);
  const [t0, setT0] = useState('');
  const { formsApi, debugEnabled } = useFormsApi();
  const eventStructuredData = useState(() => createCommunityEventStructuredData({
    pageUrl: `${siteUrl}/`,
    imageUrl: new URL(communityEvent.imagePath, siteUrl).toString(),
  }))[0];

  const [subError, setSubError] = useState<string | null>(null);
  async function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (subPending) return; // guard against double submissions
    if (!formsApi) {
      setSubError('Subscriptions are temporarily unavailable. Please try again shortly.');
      // eslint-disable-next-line no-console
      console.warn('B3U Forms: NEXT_PUBLIC_FORMS_API is not configured; blocking newsletter submit.');
      return;
    }
    setSubError(null);
    setSubPending(true);
    try {
      // Submit to Google Apps Script
      await submitFormToEndpoint(newsletterFormRef.current!, `${formsApi}?endpoint=newsletter`);

      setSubscribed(true);
      try { newsletterFormRef.current?.reset(); } catch {}
      try { setT0(String(Date.now())); } catch {}
      try { document.getElementById('newsletter')?.scrollIntoView({ behavior: 'smooth' }); } catch {}
    } catch {
      setSubError('Subscription failed. Please try again later.');
    } finally {
      setSubPending(false);
    }
  }

  useEffect(() => {
    try { setT0(String(Date.now())); } catch {}
  }, []);

  // Debug postMessage via iframe removed.

  return (
    <Layout
      title={homeContent.seoTitle}
      description={homeContent.seoDescription}
      structuredData={eventStructuredData}
    >
    {previewMode && (
      <div className="mx-auto mt-24 max-w-6xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Preview mode is enabled. <a href="/api/exit-preview" className="underline font-semibold">Exit preview</a>
      </div>
    )}
    <Hero content={homeContent.hero} />
    <section id="about" className="section-padding bg-white">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{homeContent.about.title}</h2>
          <p className="text-navy/80 leading-relaxed mb-6">
            {homeContent.about.descriptionPrimary}
          </p>
          <p className="text-navy/80 leading-relaxed mb-6">
            {homeContent.about.descriptionSecondary}
          </p>
          <p className="text-brandOrange font-semibold mb-6 italic">{homeContent.about.quote}</p>
          <Link href={homeContent.about.ctaHref} className="btn-outline">{homeContent.about.ctaLabel}</Link>
        </div>
          <div className="grid grid-cols-2 gap-4">
            {[about1, about4, about3, about2].map((img, i) => (
              <Image
                key={i}
                src={img}
                alt={`Highlight image ${i + 1}`}
                width={800}
                height={800}
                className={`w-full aspect-square rounded-3xl object-cover ${i === 2 ? 'object-top' : 'object-center'}`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ))}
          </div>
        </div>
      </section>
      <section id="podcast" className="section-padding bg-[#F4F8FB]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{homeContent.podcast.title}</h2>
            <h3 className="text-xl text-brandOrange font-semibold mb-4">{homeContent.podcast.subtitle}</h3>
            <p className="text-navy/70 max-w-xl">{homeContent.podcast.description}</p>
          </div>
          <div className="w-full md:w-[420px]">
            <a
              href={homeContent.podcast.youtubeUrl}
              target="_blank"
              rel="noopener"
              aria-label="Watch B3U on YouTube"
              className="group relative block aspect-video overflow-hidden rounded-xl shadow-xl ring-1 ring-black/10"
            >
              {/* background gradient (light white-blue) */}
              <div className="absolute inset-0 bg-gradient-to-br from-white via-[#EEF5FF] to-[#CFE6FF]" />

              {/* subtle animated glow on hover */}
              <div className="pointer-events-none absolute -inset-8 bg-gradient-to-r from-brandOrange/25 via-transparent to-brandBlue-light/25 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* 3D logo */}
              <div className="absolute inset-0">
                <Image
                  src={B3ULogo}
                  alt="B3U logo"
                  fill
                  className="object-contain p-0 md:p-2 scale-150 md:scale-150 transition-transform duration-500 ease-out group-hover:scale-[1.6] group-hover:rotate-[1.5deg]"
                  sizes="(max-width: 768px) 100vw, 420px"
                />
              </div>

              {/* subtle gradient overlay for readability on light bg */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-transparent" />

              {/* top-left label */}
              <div className="absolute left-3 top-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-navy shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-brandOrange shadow-[0_0_0_3px_rgba(204,85,0,0.15)]" />
                  B3U on YouTube
                </span>
              </div>

              {/* bottom-right caption */}
              <div className="absolute bottom-3 right-3">
                <span className="rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  {homeContent.podcast.watchNowLabel}
                </span>
              </div>
            </a>
          </div>
        </div>
        <div className="mt-10">
          <div className="text-center mb-8 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{homeContent.podcast.watchTitle}</h2>
            <div className="flex flex-col items-center gap-3 text-navy/70">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                <span>{homeContent.podcast.watchDescription}</span>
                <span className="inline-flex items-center gap-3" aria-label="Available on Roku and Fire TV">
                  <span className="relative h-8 w-[86px]">
                    <Image src={RokuLogo} alt="Roku" fill className="object-contain" sizes="86px" />
                  </span>
                  <span>&</span>
                  <span className="relative h-12 w-[86px]">
                    <Image src={FireTvLogo} alt="Fire TV" fill className="object-contain" sizes="86px" />
                  </span>
                </span>
                <span>on these networks.</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="https://themogulchannel.com/watch-now"
              target="_blank"
              rel="noopener"
              aria-label="Watch B3U on The Mogul Channel"
              className="inline-flex"
            >
              <div className="relative h-32 w-[280px] overflow-hidden rounded-2xl">
                <Image
                  src={MogulChannelLogo}
                  alt="The Mogul Channel"
                  fill
                  className="object-contain rounded-2xl"
                  sizes="280px"
                />
              </div>
            </a>
            <a
              href="https://thesoleexperience.com/watch-now"
              target="_blank"
              rel="noopener"
              aria-label="Watch B3U on The Sole Experience"
              className="inline-flex"
            >
              <div className="relative h-32 w-[280px] overflow-hidden rounded-2xl">
                <Image
                  src={SoleExperienceLogo}
                  alt="The Sole Experience"
                  fill
                  className="object-contain rounded-2xl"
                  sizes="280px"
                />
              </div>
            </a>
          </div>
        </div>
      </section>
      <section id="community" className="section-padding alt-band">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{homeContent.community.title}</h2>
          <p className="text-black">{homeContent.community.description}</p>
        </div>
        <div className="card max-w-4xl mx-auto mb-10 border-brandOrange/20 bg-white/95">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Upcoming event</p>
              <h3 className="mt-2 text-2xl font-bold">{communityEvent.name}</h3>
              <p className="mt-2 text-navy/70">Join Bree and other purpose-driven leaders for a community networking brunch built for real connection, collaboration, and momentum.</p>
              <p className="mt-3 text-sm font-semibold text-navy">{communityEvent.scheduleLabel}</p>
              <p className="text-sm text-navy/70">{communityEvent.venueName}, {communityEvent.streetAddress}, {communityEvent.cityStateZip}</p>
            </div>
            <a
              href={communityEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary whitespace-nowrap"
              aria-label={`Register for ${communityEvent.name} on Eventbrite`}
            >
              Register on Eventbrite
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-10 items-center">
          <div className="card w-full max-w-4xl">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center">
                <div className="rounded-full overflow-hidden h-[120px] w-[120px]">
                  <Image
                    src={Test2}
                    alt="Dr. Monica R. Smith"
                    width={120}
                    height={120}
                    className="object-cover object-center"
                  />
                </div>
                <p className="font-semibold text-sm mt-3 text-center">Dr. Monica R. Smith</p>
              </div>
              <div className="flex-1">
                <p className="italic text-sm mb-4">"Bree is a woman whose strength speaks louder than any obstacle she has faced. She has walked through storms that would have broken the ordinary woman, yet she stands today not just surviving, but shining. Her resilience is not accidental; it is built from battles fought quietly, tears wiped privately, and faith held firmly even when the path made no sense.</p>

                <p className="italic text-sm mb-4">What makes Bree remarkable isn’t just what she has overcome, but the grace with which she continues to rise. She has carried burdens that many will never see, but she refuses to let those burdens define her. Instead, she uses her story as fuel to grow, to inspire, and to demonstrate what true courage looks like.</p>

                <p className="italic text-sm mb-4">Bree is proof that you can be tried, stretched, and tested, yet still emerge stronger, wiser, and more determined. Her journey is a testament to perseverance, heart, and the unshakeable spirit of a woman who simply refuses to be defeated. Anyone who knows Bree knows they are witnessing the kind of strength that changes lives and the kind of resilience that leaves a lasting mark.</p>

                <p className="italic text-sm mb-4">She is extraordinary, not because life has been easy, but because she has risen beautifully above everything meant to break her."</p>
              </div>
            </div>
          </div>
          <div className="card w-full max-w-4xl">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center">
                <div className="rounded-full overflow-hidden h-[120px] w-[120px]">
                  <Image
                    src={Test1}
                    alt="Brenda Johnson"
                    width={120}
                    height={120}
                    className="object-cover object-center"
                  />
                </div>
                <p className="font-semibold text-sm mt-3 text-center">Brenda Johnson</p>
              </div>
              <div className="flex-1">
                <p className="italic text-sm mb-4">"B3U has truly been a blessing in my life. Watching the show and following each episode has inspired me in ways I didn’t expect. Every story, every message, and every moment has encouraged me to keep pushing forward, stay true to my purpose, and continue sharing my own testimony with others. The transparency and strength shown on B3U remind me that growth is possible, healing is real, and God can use our stories to uplift someone else. I’m grateful for how this show pours into its viewers, including me, and I look forward to every episode that reminds us we are becoming better, braver, and bolder—one step at a time. "</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="shop" className="section-padding bg-[#FFF5EE]">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">{homeContent.shop.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{homeContent.shop.title}</h2>
            <p className="mt-5 text-lg text-navy/80">
              {homeContent.shop.descriptionPrimary}
            </p>
            <p className="mt-4 text-navy/75">
              {homeContent.shop.descriptionSecondary}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={homeContent.shop.primaryCtaHref} className="btn-primary">{homeContent.shop.primaryCtaLabel}</Link>
              <Link href={homeContent.shop.secondaryCtaHref} className="btn-outline">{homeContent.shop.secondaryCtaLabel}</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-navy/75">
              <span className="rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">Healing</span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">Resilience</span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">Taking your power back</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-navy shadow-[0_25px_80px_rgba(11,28,48,0.18)]">
            <div className="border-b border-white/10 px-5 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Now featuring</p>
              <h3 className="mt-2 text-xl font-bold">The Big Take Back: What I Left Behind</h3>
            </div>
            <div className="p-4">
              <video
                className="aspect-video w-full rounded-[1.5rem] bg-black object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                poster={BookImage.src}
              >
                <source src="/videos/the-big-take-back-promo.mp4" type="video/mp4" />
                Your browser does not support the promo video.
              </video>
            </div>
            <div className="flex items-center gap-4 px-5 pb-5 text-white/85">
              <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">
                <Image
                  src={BookImage}
                  alt="The Big Take Back: What I Left Behind book cover"
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
              <p className="text-sm leading-relaxed">
                Step into Bree&apos;s story and discover a message built to help you reclaim your voice, your power, and the life you thought was out of reach.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="newsletter" className="section-padding bg-[#F4F8FB]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{homeContent.newsletter.title}</h2>
          <p className="text-navy/70 mb-6">{homeContent.newsletter.description}</p>
          <form
            className="flex flex-col sm:flex-row gap-4 justify-center"
            onSubmit={handleNewsletterSubmit}
            ref={newsletterFormRef}
          >
            {/* bot protection: honeypot + timestamp */}
            <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <input type="hidden" name="t0" value={t0} />
            {debugEnabled && <input type="hidden" name="debug" value="1" />}
            <input
              type="email"
              name="email"
              required
              minLength={EMAIL_FIELD_MIN}
              maxLength={EMAIL_FIELD_MAX}
              placeholder="Email address"
              className="flex-1 px-5 py-3 rounded-md bg-white border border-black/10 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            />
            <button className="btn-primary" type="submit" disabled={subPending}>
              {subPending ? 'Subscribing…' : homeContent.newsletter.buttonLabel}
            </button>
            {subscribed && (
              <div className="w-full text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 sm:ml-4 sm:mt-0 mt-2">
                Thanks! You’re subscribed.
              </div>
            )}
            {subError && (
              <div className="w-full text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 sm:ml-4 sm:mt-0 mt-2">
                {subError}
              </div>
            )}
          </form>
          {/* Iframe removed: switched to fetch-based submission with no-cors fallback */}
        </div>
      </section>
    </Layout>
  );
}

export async function getStaticProps(context: GetStaticPropsContext) {
  const previewMode = Boolean(context.preview);
  const homeContent = await getHomePageContent(previewMode);
  return {
    props: {
      homeContent,
      previewMode,
    },
    revalidate: CMS_REVALIDATE_SECONDS,
  };
}
