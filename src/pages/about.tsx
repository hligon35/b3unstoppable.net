import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import MelaLogo from '@/images/logos/Melalogo.png';
import THOHLogo from '@/images/logos/THOHlogo.png';
import { createWebPageStructuredData, siteUrl } from '@/lib/siteMetadata';
import { resolveSiteImage } from '@/lib/siteEditorImages';
import { usePublishedSiteDraft } from '@/lib/siteEditorContent';
import { getPublishedSitePageProps, type PublishedSitePageProps } from '@/lib/siteEditorContent.server';

type AboutPageProps = PublishedSitePageProps;

export default function AboutPage({ initialSiteDraft, initialSiteUpdatedAt }: AboutPageProps) {
  const { draft } = usePublishedSiteDraft({
    initialDraft: initialSiteDraft,
    initialUpdatedAt: initialSiteUpdatedAt,
    preferLocalDraft: false,
  });
  const featureImage = resolveSiteImage(draft.aboutPageFeatureImage);
  const aboutStructuredData = useMemo(() => createWebPageStructuredData({
    pageUrl: `${siteUrl}/about/`,
    title: 'About Dr. Bree Charles | Transformational Speaker, Author & U.S. Army Veteran',
    description: 'Meet Dr. Bree Charles, founder of B3U: Burn, Break, Become Unstoppable. She equips leaders to reclaim identity, voice, purpose, and lead with clarity.',
    keywords: ['About Dr. Bree Charles', 'transformational speaker', 'B3U founder', 'Burn Break Become Unstoppable', 'The Big Take Back', 'leadership speaker', 'U.S. Army veteran'],
  }), []);

  return (
    <Layout
      title="About Dr. Bree Charles | Transformational Speaker, Author & U.S. Army Veteran"
      description="Meet Dr. Bree Charles, founder of B3U: Burn, Break, Become Unstoppable. She equips strong, dependable leaders to reclaim identity, voice, purpose, and lead with clarity."
      structuredData={aboutStructuredData}
    >
      {/* Meet Dr. Bree Charles Section */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">
            Meet <span className="text-brandOrange">Dr. Bree Charles</span>
          </h1>
          <p className="text-xl text-center text-navy/80 mb-12 italic">
            Burn. Break. Become Unstoppable.
          </p>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div className="order-1 md:order-2">
              <p className="text-lg text-navy/80 leading-relaxed mb-6">
                Dr. Bree Charles is a transformational speaker, U.S. Army veteran, author, and founder of B3U: Burn, Break, Become Unstoppable. She equips strong, dependable leaders to move beyond survival mode, reclaim their identity, voice, and purpose, and lead with clarity.
              </p>
              <p className="text-lg text-navy/80 leading-relaxed mb-6">
                Her message is shaped by 16 years of active-duty military service, two deployments to Iraq, and a personal journey through trauma, domestic violence, PTSD, and life beyond the uniform. These experiences taught her both how to lead under pressure and the hidden cost of staying strong for everyone while losing yourself.
              </p>
              <p className="text-lg text-navy/80 leading-relaxed">
                Today, Dr. Bree uses those lessons to help people confront the beliefs, cycles, and expectations that keep them disconnected from who they are becoming. Her work brings together authentic storytelling, leadership insight, faith, and practical tools for lasting transformation.
              </p>
            </div>
            <div className="relative order-2 md:order-1">
              <Image
                src={featureImage.image}
                alt={featureImage.alt}
                className="w-full h-auto rounded-3xl shadow-2xl"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              <div className="absolute -bottom-6 -right-6 bg-brandOrange text-white p-6 rounded-lg shadow-lg">
                <p className="font-semibold text-sm">U.S. Army Veteran</p>
                <p className="text-xs opacity-90">Transformational Speaker</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B3U Framework Section */}
      <section className="section-padding bg-gradient-to-r from-brandOrange to-brandOrange-dark text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            The B3U Framework
          </h2>
          <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-3xl mx-auto">
            Through B3U, Dr. Bree offers a practical framework for transformation—helping people release what keeps them trapped, interrupt the cycles that drain them, and step into leadership with greater clarity and purpose.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="rounded-2xl bg-white/10 p-7 backdrop-blur-sm border border-white/20">
              <h3 className="text-2xl font-bold mb-3">Burn</h3>
              <p className="text-base leading-relaxed">
                Burn the beliefs and labels that keep you trapped.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-7 backdrop-blur-sm border border-white/20">
              <h3 className="text-2xl font-bold mb-3">Break</h3>
              <p className="text-base leading-relaxed">
                Break the cycles that fuel burnout, silence, and disconnection.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-7 backdrop-blur-sm border border-white/20">
              <h3 className="text-2xl font-bold mb-3">Become</h3>
              <p className="text-base leading-relaxed">
                Become the clear, confident, purpose-driven leader you were created to be.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Big Take Back Section */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            The Big Take Back: What I Left Behind
          </h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-navy/80 leading-relaxed mb-6">
              Dr. Bree is the author of <em>The Big Take Back: What I Left Behind</em>, a memoir and teaching journey that helps readers confront repeating patterns, reclaim what life tried to take, and rebuild with intention.
            </p>
            <p className="text-lg text-navy/80 leading-relaxed">
              The book extends the same work at the heart of B3U: helping people recognize what must be released, what cycles must be broken, and what can be rebuilt when they choose to move forward with clarity and purpose.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/shop" className="btn-primary">Explore the Book</Link>
          </div>
        </div>
      </section>

      {/* Quote Spotlight */}
      <section className="section-padding bg-navy text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <blockquote className="text-2xl md:text-3xl font-bold mb-6 relative z-10">
              <span className="mr-1 align-top text-white">&quot;</span>
              Every time I share my story, I set somebody else free.
              <span className="align-top text-white">&quot;</span>
            </blockquote>
            <cite className="text-lg text-brandOrange font-semibold">— Dr. Bree Charles</cite>
          </div>
        </div>
      </section>

      {/* Speaking and Leadership Work */}
      <section className="section-padding bg-brandBlue-light/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Speaking & Leadership Work
          </h2>
          <p className="text-lg text-center text-navy/80 mb-10 max-w-3xl mx-auto">
            Dr. Bree&apos;s keynotes and workshops blend authentic storytelling, leadership insight, and actionable tools for corporations, government agencies, military-connected organizations, professional associations, and leadership groups.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {['Identity', 'Resilience', 'Transition', 'Burnout', 'Purpose-Driven Leadership'].map((topic) => (
              <div key={topic} className="rounded-xl bg-white p-5 text-center shadow-sm">
                <p className="font-semibold text-navy">{topic}</p>
              </div>
            ))}
          </div>

          <p className="text-lg text-center text-navy/80 leading-relaxed max-w-3xl mx-auto">
            Her work is designed for people who know how to carry responsibility, perform under pressure, and show up for others—but are ready to lead without losing themselves in the process.
          </p>
        </div>
      </section>

      {/* Her Work in Action */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Her Work in Action
          </h2>
          <h3 className="text-xl text-center text-navy/80 mb-12">
            Faith. Purpose. Community.
          </h3>

          <p className="text-lg text-center text-navy/80 mb-12 max-w-3xl mx-auto">
            Beyond speaking and writing, Bree pours her heart into community-based initiatives that drive impact and healing:
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <a
              href="https://www.melawholefoodsva.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Mela Whole Foods website"
              className="card bg-white p-8 text-center block hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brandOrange"
            >
              <div className="h-20 w-20 mb-6 relative mx-auto">
                <Image
                  src={MelaLogo}
                  alt="Mela Whole Foods Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h4 className="text-xl font-bold mb-4 text-brandOrange">Mela Whole Foods</h4>
              <p className="text-navy/80">
                Her mobile grocery bus bringing healthy, affordable food to underserved communities.
              </p>
            </a>

            <a
              href="https://www.thehouseofhumanity.org/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit The House of Humanity website"
              className="card bg-white p-8 text-center block hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brandOrange"
            >
              <div className="h-20 w-20 mb-6 relative mx-auto">
                <Image
                  src={THOHLogo}
                  alt="House of Humanity Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h4 className="text-xl font-bold mb-4 text-brandOrange">House of Humanity</h4>
              <p className="text-navy/80">
                Her nonprofit dedicated to housing and healing for individuals overcoming hardship.
              </p>
            </a>
          </div>

          <p className="text-center text-lg text-navy/80 italic">
            Each project is grounded in the belief that meaningful transformation creates impact beyond the individual.
          </p>
        </div>
      </section>

      {/* Faith and Call to Action */}
      <section className="section-padding bg-navy text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            From Defeated to Determined
          </h2>
          <p className="text-lg leading-relaxed mb-6 max-w-3xl mx-auto">
            Grounded in faith, Dr. Bree believes transformation begins when people stop allowing their past, others&apos; expectations, or the roles they carry to define who they are becoming.
          </p>
          <p className="text-lg leading-relaxed mb-10 max-w-3xl mx-auto">
            She does more than inspire audiences—she equips them to move from defeated to determined.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/contact" className="btn-primary">Book Dr. Bree</Link>
            <Link href="/podcast" className="btn-outline border-white text-white hover:bg-white hover:text-navy">Listen to The B3U Podcast</Link>
          </div>

          <p className="text-base text-white/80 max-w-2xl mx-auto">
            Book Dr. Bree for your next keynote, workshop, leadership program, or organizational event.
          </p>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<AboutPageProps> = async () => {
  return {
    props: await getPublishedSitePageProps(),
  };
};
