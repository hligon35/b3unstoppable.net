import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { createCollectionPageStructuredData, siteUrl } from '@/lib/siteMetadata';
import { getPublishedSitePageProps, type PublishedSitePageProps } from '@/lib/siteEditorContent.server';

type EventGalleryPageProps = PublishedSitePageProps;

export default function EventGalleryPage(_: EventGalleryPageProps) {
  const pageStructuredData = useMemo(() => createCollectionPageStructuredData({
    pageUrl: `${siteUrl}/event-gallery/`,
    title: 'Dr. Bree Charles Events | Speaking Appearances, Programs & Book Signings',
    description: 'View upcoming and past appearances from Dr. Bree Charles, including speaking engagements, leadership programs, book signings, and professional event highlights.',
    keywords: ['Dr. Bree Charles events', 'speaking appearances', 'leadership programs', 'book signings', 'transformational speaker events'],
  }), []);

  return (
    <Layout
      title="Dr. Bree Charles Events | Speaking Appearances, Programs & Book Signings"
      description="View upcoming speaking appearances, leadership programs, book signings, event highlights, and past appearances from Dr. Bree Charles."
      structuredData={pageStructuredData}
    >
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-6xl pt-10">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Events & Appearances</p>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-navy">Speaking Appearances, Leadership Programs & Book Events</h1>
            <p className="mt-5 text-lg text-navy/75">Follow Dr. Bree Charles&apos; upcoming appearances and explore recent event highlights from her speaking, leadership, and author work.</p>
          </div>

          <section className="mb-16">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Upcoming Events</p>
                <h2 className="mt-2 text-3xl font-bold text-navy">Upcoming Appearances</h2>
              </div>
              <Link href="/booking" className="btn-primary">Book Dr. Bree</Link>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <article className="card overflow-hidden p-0 bg-white">
                <div className="relative bg-navy/5">
                  <Image
                    src="/images/events/unwine-break-it-2026.png"
                    alt="UnWine and Break It book signing with Dr. Bree Charles"
                    width={1024}
                    height={1536}
                    className="mx-auto h-auto max-h-[620px] w-auto object-contain"
                  />
                </div>
                <div className="p-7">
                  <span className="inline-flex rounded-full bg-brandOrange/10 px-3 py-1 text-xs font-semibold text-brandOrange">Book Signing</span>
                  <h3 className="mt-4 text-2xl font-bold text-navy">UnWine &amp; Break It</h3>
                  <p className="mt-3 text-navy/75">Meet Dr. Bree Charles and experience a live author event centered around <em>The Big Take Back: What I Left Behind</em>.</p>
                  <div className="mt-5 rounded-xl bg-brandBlue-light/20 p-4 text-sm text-navy/80">
                    <p><strong>Date:</strong> Sunday, August 30, 2026</p>
                    <p><strong>Time:</strong> 12:00 PM–5:00 PM</p>
                    <p><strong>Format:</strong> In person</p>
                  </div>
                </div>
              </article>

              <article className="card flex min-h-[340px] flex-col items-center justify-center text-center bg-brandBlue-light/10">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Speaking Calendar</p>
                <h3 className="mt-4 text-2xl font-bold text-navy">Additional Dates Coming Soon</h3>
                <p className="mt-4 max-w-md text-navy/70">Upcoming keynote appearances, leadership programs, military and veteran programs, association events, and virtual presentations will be added as they are confirmed.</p>
                <Link href="/booking" className="btn-outline mt-6">Request Dr. Bree for Your Event</Link>
              </article>
            </div>
          </section>

          <section className="mb-16 bg-brandBlue-light/10 rounded-3xl p-7 md:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Recent Work</p>
              <h2 className="mt-3 text-3xl font-bold text-navy">Past Appearances and Event Highlights</h2>
              <p className="mt-4 text-navy/70">Past speaking engagements, leadership programs, book events, professional stage photographs, and verified event highlights will be archived here rather than remaining in Upcoming Events.</p>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="card bg-white min-h-[220px] flex items-center justify-center text-center"><div><p className="font-semibold text-navy">Speaking Photograph</p><p className="mt-2 text-sm text-navy/60">Professional stage-photo placeholder</p></div></div>
              <div className="card bg-white min-h-[220px] flex items-center justify-center text-center"><div><p className="font-semibold text-navy">Event Highlight</p><p className="mt-2 text-sm text-navy/60">Recent appearance highlight placeholder</p></div></div>
              <div className="card bg-white min-h-[220px] flex items-center justify-center text-center"><div><p className="font-semibold text-navy">Leadership Program</p><p className="mt-2 text-sm text-navy/60">Program recap placeholder</p></div></div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-center text-3xl md:text-4xl font-bold text-navy">What Event Organizers and Audiences Are Saying</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="card bg-white"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brandOrange">Organizer Testimonial</p><p className="mt-4 text-navy/65">Verified event-organizer feedback will be featured here, prioritizing audience response, participant learning, presentation value, selection rationale, and recommendation.</p></div>
              <div className="card bg-white"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brandOrange">Audience Testimonial</p><p className="mt-4 text-navy/65">Verified audience feedback from speaking engagements and leadership programs will be featured here.</p></div>
            </div>
          </section>
        </div>
      </section>

      <section className="section-padding bg-navy text-white text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold">Bring Dr. Bree to Your Organization</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">Book Dr. Bree for a keynote, workshop, leadership program, corporate event, government agency, military or veteran program, association meeting, university, or virtual presentation.</p>
          <Link href="/booking" className="btn-primary mt-8 inline-flex">Request Dr. Bree for Your Event</Link>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<EventGalleryPageProps> = async () => ({ props: await getPublishedSitePageProps() });
