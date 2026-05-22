import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';

import HeroBg from '@/images/content/about2.jpeg';
import aboutBree from '@/images/content/aboutBree.jpeg';

const EVENT_DATE_DISPLAY = 'June 23, 2025';
const EVENT_TIME_DISPLAY = '6:00pm EST';

const REGISTRATION_URL =
  process.env.NEXT_PUBLIC_MASTERCLASS_REG_URL?.trim() ||
  'https://your-registration-link-here';

const testimonials = [
  {
    name: 'Patrice Parker',
    initials: 'PP',
    quote:
      "This Masterclass was truly life changing! Attending this class helped me work through the mental trauma I've experienced and gave me a new positive outlook on life. Thanks to Bree, I am on my way to finding my purpose and now I have the drive to help others the way she helped me. I'm so grateful for her guidance and support.",
  },
  {
    name: 'Briaona Harvey',
    initials: 'BH',
    quote:
      "I am so grateful for this Masterclass and everything it unlocked in me. It wasn’t just about revisiting the past—it helped me awaken a deeper purpose beyond my pain. I now see my experiences in a new light and realize that my story isn’t over—it’s just beginning. Bree created a space where I felt safe, inspired, and ready to step into who I’m truly meant to be.",
  },
  {
    name: 'Tasha Williams',
    initials: 'TW',
    quote:
      "Before this Masterclass, I felt stuck—like I was just going through the motions of life. Bree’s words shook something in me. For the first time in years, I feel seen, heard, and empowered. This experience lit a fire inside me to reclaim my voice and step into the woman I’m meant to be. Truly transformative.",
  },
];

export default function MasterclassPage() {
  return (
    <Layout
      title="Free Masterclass with Dr. Bree Charles | Unbroken: Burn, Break & Become Unstoppable"
      description="Join Dr. Bree Charles for a free transformational masterclass to break through fear, burn the lies, break old patterns, and become unstoppable in purpose-driven living."
    >
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero text-white">
        <div className="absolute inset-0">
          <Image
            src={HeroBg}
            alt="B3U masterclass hero background"
            fill
            priority
            className="object-cover opacity-25"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-navy/55 to-navy/80" />
        </div>

        <div className="section-padding relative z-10">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <a
                href="mailto:breecharles@b3ucs.com"
                className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold tracking-wide backdrop-blur hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                breecharles@b3ucs.com
              </a>

              <p className="mt-6 text-white/90 text-lg italic">
                “You&apos;ve survived the storm. Now it&apos;s time to rise and build.”
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Unbroken: Burn, Break, and Become Unstoppable in{' '}
                <span className="text-brandOrange">Creating a Successful Purpose-Driven Life.</span>
              </h1>

              <p className="mt-5 text-xl md:text-2xl text-white/90 font-semibold">
                Break through the fear holding you back from your next level.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Link href="#register" className="btn-primary">
                  Reserve my free spot
                </Link>
                <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-sm uppercase tracking-widest text-white/70">Live masterclass</p>
                  <p className="text-lg font-semibold">
                    {EVENT_DATE_DISPLAY} · {EVENT_TIME_DISPLAY}
                  </p>
                </div>
              </div>

              <p className="mt-6 text-white/75 max-w-2xl">
                You&apos;ll leave with a simple, repeatable framework to reclaim your voice, rebuild after pain,
                and step boldly into your purpose.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="card bg-white/95">
                <h2 className="text-2xl font-bold">In this masterclass you&apos;ll discover</h2>
                <ul className="mt-5 space-y-3 text-navy/80 text-lg">
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brandOrange flex-none" />
                    <span>How to shift from survivor mode into builder mode</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brandOrange flex-none" />
                    <span>The real reason fear still has a grip on your progress</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brandOrange flex-none" />
                    <span>
                      A simple framework to burn the lies, break old patterns, and become who you were created to be
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brandOrange flex-none" />
                    <span>
                      How to step into your business, calling, or purpose—even when you&apos;re scared or don&apos;t have a clear path
                    </span>
                  </li>
                </ul>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link href="#register" className="btn-primary w-full sm:w-auto">
                    Reserve my free spot
                  </Link>
                  <a
                    href={REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full sm:w-auto"
                    aria-label="Open registration link in a new tab"
                  >
                    Open registration
                  </a>
                </div>

                <p className="mt-6 text-sm text-navy/70">
                  Bonus: All attendees receive a free gift to continue your transformation (link provided at the end).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="text-brandOrange font-semibold tracking-widest">TESTIMONIALS</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              What previous <span className="text-brandOrange">attendees</span> are saying
            </h2>
            <p className="mt-4 text-lg text-navy/70 max-w-3xl mx-auto">
              Real stories. Real breakthroughs. You don&apos;t have to do your healing alone.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <article key={t.name} className="card">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-brandBlue/20 text-navy font-bold flex items-center justify-center">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-navy">{t.name.toUpperCase()}</p>
                    <p className="text-sm text-navy/60">Masterclass attendee</p>
                  </div>
                </div>
                <p className="mt-5 text-navy/80 leading-relaxed">“{t.quote}”</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="section-padding alt-band">
        <div className="max-w-6xl mx-auto">
          <div className="card">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Register for the free masterclass starting{' '}
                  <span className="text-brandOrange">{EVENT_DATE_DISPLAY} at {EVENT_TIME_DISPLAY}</span>
                </h2>
                <p className="mt-4 text-lg text-navy/80 max-w-2xl">
                  Reserve your seat now. You&apos;ll receive the details you need to attend live.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <a
                    href={REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    Reserve my free spot
                  </a>
                  <Link href="/contact" className="btn-outline">
                    Questions? Contact us
                  </Link>
                </div>

                <p className="mt-4 text-sm text-navy/60">
                  Tip: set <code className="font-mono">NEXT_PUBLIC_MASTERCLASS_REG_URL</code> to your real registration link.
                </p>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl overflow-hidden border border-black/5 shadow-lg">
                  <Image
                    src={aboutBree}
                    alt="Dr. Bree Charles"
                    className="w-full h-auto"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Bree */}
      <section className="section-padding bg-navy text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="text-brandOrange font-semibold tracking-widest">ABOUT</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              Bridget <span className="text-brandOrange">“Bree”</span> Charles
            </h2>
            <p className="mt-3 text-white/85 text-lg font-semibold">Combat Veteran · Coach · Speaker · Author</p>

            <div className="mt-6 space-y-4 text-white/80 text-lg leading-relaxed">
              <p>
                Bree is a decorated combat veteran, coach, upcoming author, and transformational speaker dedicated to empowering people to overcome adversity
                and unlock their full potential.
              </p>
              <p>
                After surviving deep personal trauma—including childhood abuse, sexual violence, domestic violence, and military PTSD—Bree found healing through faith,
                mental resilience, and radical self-discovery.
              </p>
              <p>
                Now, she helps people who feel stuck, overloaded, or disqualified by fear reclaim their voice, walk boldly in purpose, and build the life or business
                they once believed was out of reach.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="#register" className="btn-primary">
                Reserve my free spot
              </Link>
              <Link href="/about" className="btn-light">
                Learn more about Bree
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 bg-grid-light">
              <h3 className="text-2xl font-bold">You&apos;re not behind. You&apos;re becoming.</h3>
              <p className="mt-4 text-white/80">
                If fear, trauma, or uncertainty has been holding you back, this masterclass is a safe next step toward clarity and courage.
              </p>
              <div className="mt-8">
                <a
                  href="mailto:breecharles@b3ucs.com"
                  className="inline-flex items-center font-semibold underline text-brandOrange hover:text-brandOrange-light"
                >
                  Email Bree
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
