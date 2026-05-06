import Layout from '@/components/Layout';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import BookImage from '@/images/content/book.png';
import EventFlyer from '@/images/content/flyer.png';
import { communityEvent, createCommunityEventStructuredData, siteUrl } from '@/lib/communityEvent';

export default function EventGalleryPage() {
  const [flyerOpen, setFlyerOpen] = useState(false);
  const eventStructuredData = useMemo(() => createCommunityEventStructuredData({
    pageUrl: `${siteUrl}/event-gallery/`,
    imageUrl: new URL(communityEvent.imagePath, siteUrl).toString(),
  }), []);

  useEffect(() => {
    if (!flyerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFlyerOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [flyerOpen]);

  return (
    <Layout
      title="Events | B3U"
      description="Explore Bree Charles event highlights, book updates, and the latest Prosper on Purpose Brunch event details."
      structuredData={eventStructuredData}
    >
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Events</p>
            <h1 className="mt-4 text-4xl font-bold text-navy md:text-5xl">Highlights, Flyers, and Book Updates</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-navy/75">
              Stay up to date on Bree&apos;s latest event moments, upcoming appearances, and book news in one place.
            </p>
          </div>

          <div className="mb-10 rounded-3xl border border-brandOrange/20 bg-gradient-to-r from-brandOrange to-red-600 p-6 text-white shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Book Update</p>
            <h2 className="mt-3 text-2xl font-bold md:text-3xl">The Big Take Back: What I Left Behind is ON SALE NOW.</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/90 md:text-base">
              Share the news, watch for fresh updates, and point your community to the book now that it is officially available.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="card overflow-hidden p-0">
              <div className="relative h-64 bg-white">
                <Image
                  src={BookImage}
                  alt="The Big Take Back: What I Left Behind book cover"
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/10" />
                <span className="absolute left-4 top-4 rounded-full bg-brandOrange px-3 py-1 text-xs font-semibold text-white">ON SALE NOW</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-navy">The Big Take Back: What I Left Behind</h3>
                <p className="mt-3 text-sm text-navy/70">
                  “The Big Take Back: What I Left Behind” is Bree&apos;s bold guide to reclaiming the parts of yourself life tried to quiet — your voice, your confidence, and your power. It reveals the subtle ways we give ourselves away and shows how to rise back into ownership with intention.
                </p>
              </div>
            </div>

            <div className="card overflow-hidden p-0">
              <button
                type="button"
                className="relative h-64 w-full cursor-zoom-in bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brandOrange/30"
                onClick={() => setFlyerOpen(true)}
                aria-label="Enlarge event flyer"
              >
                <Image
                  src={EventFlyer}
                  alt="Event flyer"
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <span className="absolute left-4 top-4 rounded-full bg-brandOrange px-3 py-1 text-xs font-semibold text-white">Conference</span>
              </button>
              <div className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-brandOrange/10 px-3 py-1 text-xs font-semibold text-brandOrange">Live Event</span>
                  <span className="inline-flex rounded-full bg-navy/5 px-3 py-1 text-xs font-semibold text-navy/70">{communityEvent.dateLabel}</span>
                  <span className="inline-flex rounded-full bg-navy/5 px-3 py-1 text-xs font-semibold text-navy/70">{communityEvent.timeLabel}</span>
                </div>
                <h3 className="text-xl font-bold text-navy">{communityEvent.name}</h3>
                <p className="mt-3 text-sm text-navy/70">{communityEvent.description}</p>
                <div className="mt-4 rounded-xl bg-[#F4F8FB] p-4 text-sm text-navy/80">
                  <p className="font-semibold text-navy">{communityEvent.scheduleLabel}</p>
                  <p className="mt-1">{communityEvent.venueName}</p>
                  <p>{communityEvent.streetAddress}</p>
                  <p>{communityEvent.cityStateZip}</p>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={communityEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    aria-label={`Register for ${communityEvent.name} on Eventbrite`}
                  >
                    Register on Eventbrite
                  </a>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setFlyerOpen(true)}
                  >
                    View Flyer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {flyerOpen && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          onClick={() => setFlyerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Event flyer enlarged"
        >
          <div
            className="relative h-[85vh] w-full max-w-3xl cursor-default overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={EventFlyer}
              alt="Event flyer"
              fill
              className="object-contain p-4"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}