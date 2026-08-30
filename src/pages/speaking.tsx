import Layout from '@/components/Layout';
import Link from 'next/link';
import { useMemo } from 'react';
import { createWebPageStructuredData, siteUrl } from '@/lib/siteMetadata';

const outcomes = [
  'Recognize when responsibility and performance have begun to consume their identity',
  'Identify beliefs and patterns contributing to burnout, silence, and disconnection',
  'Reclaim their voice and reconnect with personal and professional purpose',
  'Make clearer, more intentional decisions during change and transition',
  'Lead from identity and conviction instead of pressure and survival',
];

const audiences = [
  'Corporations and professional associations',
  'Government agencies',
  'Military and veteran organizations',
  'Women’s leadership groups',
  'Employee resource groups',
  'Colleges and universities',
  'Leadership conferences and professional-development programs',
];

const formats = [
  'Keynote presentations',
  'Leadership workshops',
  'Professional-development training',
  'Panels and moderated conversations',
  'Military and veteran transition programs',
  'Virtual presentations',
];

export default function SpeakingPage() {
  const structuredData = useMemo(() => createWebPageStructuredData({
    pageUrl: `${siteUrl}/speaking/`,
    title: 'Dr. Bree Charles | Transformational Speaker for Leaders and Organizations',
    description: 'Book Dr. Bree Charles for national, virtual, corporate, government, military, association, university, and leadership events focused on identity, resilience, transition, burnout, voice, and purpose.',
    keywords: ['Dr. Bree Charles speaker', 'transformational speaker', 'leadership keynote speaker', 'military speaker', 'government speaker', 'corporate leadership speaker', 'B3U'],
  }), []);

  return (
    <Layout
      title="Dr. Bree Charles | Transformational Speaker for Leaders and Organizations"
      description="Book Dr. Bree Charles for keynotes, workshops, leadership programs, corporate events, government agencies, military and veteran organizations, associations, universities, and virtual programs."
      structuredData={structuredData}
    >
      <section className="section-padding bg-gradient-to-br from-navy via-[#0f3150] to-[#194d75] text-white">
        <div className="mx-auto max-w-5xl text-center pt-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brandOrange">Speaking</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-bold">Dr. Bree Charles</h1>
          <p className="mt-4 text-lg md:text-xl font-semibold text-white/90">Transformational Speaker | U.S. Army Veteran | Author | Founder of B3U</p>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-white/85">Dr. Bree equips leaders to move beyond survival mode, reclaim their identity, voice, and purpose, and lead with clarity.</p>
          <Link href="/booking" className="btn-primary mt-8 inline-flex">Book Dr. Bree</Link>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Signature Keynote</p>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-navy">The Leader Behind the Role: Reclaiming Identity, Voice, and Purpose Before Burnout Takes Over</h2>
          <p className="mt-6 text-lg leading-relaxed text-navy/80">Strong, dependable leaders often become so consumed by performing, serving, and carrying responsibility that they lose themselves behind the role. In this transformational keynote, Dr. Bree Charles helps audiences recognize the hidden cost of survival-mode leadership and take practical steps toward greater clarity, resilience, and purpose.</p>
        </div>
      </section>

      <section className="section-padding bg-brandBlue-light/20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-navy">Audience Outcomes</h2>
          <p className="mt-4 text-lg text-navy/75">After this presentation, participants will be equipped to:</p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {outcomes.map((outcome) => <li key={outcome} className="card bg-white text-navy/80">{outcome}</li>)}
          </ul>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3 text-left">
            <div className="rounded-2xl bg-brandOrange p-7 text-white shadow-lg"><h3 className="text-2xl font-bold">Burn</h3><p className="mt-3">the beliefs and labels that keep you trapped.</p></div>
            <div className="rounded-2xl bg-brandBlue p-7 text-white shadow-lg"><h3 className="text-2xl font-bold">Break</h3><p className="mt-3">the cycles that fuel burnout, silence, and disconnection.</p></div>
            <div className="rounded-2xl bg-brandOrange p-7 text-white shadow-lg"><h3 className="text-2xl font-bold">Become</h3><p className="mt-3">the clear, confident, purpose-driven leader you were created to be.</p></div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="mx-auto max-w-5xl grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-navy">Organizations and Audiences Served</h2>
            <ul className="mt-6 space-y-3 text-navy/80">{audiences.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-navy">Speaking Formats</h2>
            <ul className="mt-6 space-y-3 text-navy/80">{formats.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="section-padding bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-navy">Speaker Media</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="card bg-white min-h-[280px] flex flex-col items-center justify-center text-center"><p className="text-sm uppercase tracking-[0.2em] text-brandOrange font-semibold">Speaker Video</p><h3 className="mt-3 text-xl font-bold">Professional Video Coming Soon</h3><p className="mt-3 text-sm text-navy/60">Speaker reel or keynote footage will appear here when the final media is available.</p></div>
            <div className="card bg-white min-h-[280px] flex flex-col items-center justify-center text-center"><p className="text-sm uppercase tracking-[0.2em] text-brandOrange font-semibold">Stage Photography</p><h3 className="mt-3 text-xl font-bold">Professional Photo Coming Soon</h3><p className="mt-3 text-sm text-navy/60">Professional stage and audience-engagement photography will be featured here.</p></div>
            <div className="card bg-white min-h-[280px] flex flex-col items-center justify-center text-center"><p className="text-sm uppercase tracking-[0.2em] text-brandOrange font-semibold">Speaker One-Sheet</p><h3 className="mt-3 text-xl font-bold">Download Coming Soon</h3><p className="mt-3 text-sm text-navy/60">A downloadable professional speaker one-sheet will be available here.</p></div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-navy">What Event Organizers and Audiences Are Saying</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="card bg-brandBlue-light/10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandOrange">Event Organizer Testimonial</p><p className="mt-4 text-navy/65">Professional speaking-result testimonials coming soon.</p></div>
            <div className="card bg-brandBlue-light/10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brandOrange">Audience Testimonial</p><p className="mt-4 text-navy/65">Audience-impact testimonials coming soon.</p></div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-navy text-white text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold">Bring Dr. Bree to Your Organization</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">Book Dr. Bree for a keynote, workshop, leadership program, or organizational event.</p>
          <Link href="/booking" className="btn-primary mt-8 inline-flex">Request Dr. Bree for Your Event</Link>
        </div>
      </section>
    </Layout>
  );
}
