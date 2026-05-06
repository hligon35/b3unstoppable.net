import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import BookImage from '@/images/content/book.png';

export default function ShopPage() {
  return (
    <Layout
      title="Shop | The Big Take Back | B3U"
      description="Discover The Big Take Back: What I Left Behind by Bree Charles and explore the message behind the book."
    >
      <section className="section-padding bg-[linear-gradient(180deg,#fff_0%,#fff4eb_100%)]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Featured book</p>
            <h1 className="mt-4 text-4xl font-bold md:text-5xl">The Big Take Back: What I Left Behind</h1>
            <p className="mt-5 text-lg text-navy/80">
              Bree Charles wrote this book for readers who are ready to stop living beneath what they have survived. It is honest, healing, and built to help you reclaim the parts of yourself you had to leave behind.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-start">
            <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-navy shadow-[0_25px_80px_rgba(11,28,48,0.18)]">
              <div className="p-4 md:p-5">
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
              <div className="border-t border-white/10 px-6 py-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Inside the message</p>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
                  The Big Take Back speaks to anyone who has felt silenced, overlooked, or emptied by life. Bree shares a message of restoration, identity, and courage for the next chapter.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
              <div className="relative mx-auto h-[300px] w-full max-w-[220px] overflow-hidden rounded-[1.5rem] bg-[#FFF5EE]">
                <Image
                  src={BookImage}
                  alt="The Big Take Back: What I Left Behind book cover"
                  fill
                  className="object-contain p-4"
                  sizes="220px"
                />
              </div>
              <div className="mt-6 text-center lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Take the next step</p>
                <h2 className="mt-3 text-2xl font-bold text-navy">Order your copy now</h2>
                <p className="mt-3 text-sm leading-relaxed text-navy/75">
                  The Big Take Back is ON SALE NOW. Explore the latest book updates, weekly encouragement, and ways to stay connected to Bree&apos;s message.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link href="/event-gallery" className="btn-primary text-center">See Book Updates</Link>
                  <Link href="/#newsletter" className="btn-outline text-center">Join The Take Back Weekly</Link>
                  <Link href="/contact" className="text-sm font-semibold text-brandOrange transition hover:text-brandOrange-dark">Contact B3U about the book</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
