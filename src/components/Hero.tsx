import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroBg from '@/images/content/about2.jpeg';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden gradient-hero pt-28 md:pt-32">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={HeroBg}
          alt="Dr. Bree Charles hero background"
          fill
          priority
          className="object-cover object-[center_10%] opacity-30"
          sizes="100vw"
        />
      </div>
      <div className="section-padding relative z-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-display font-bold mb-6"
        >
          You don't have to stay where life left you — <span className="text-brandOrange">you can rise, rebuild, and become unstoppable.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-white/90 mb-6"
        >
          Transformational Speaker | Author | U.S. Army Veteran | Creator of the B3U Podcast
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-2xl mx-auto text-base md:text-lg text-white/80 mb-10 italic"
        >
          Breaking Cycles. Building Legacies.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/podcast" className="btn-primary">Listen to The B3U Podcast</Link>
          <Link href="/contact" className="btn-outline">Book Bree for Your Event</Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-6 text-lg text-white/90 font-semibold"
        >
          Dr. Bree Charles is now available for speaking engagements, workshops, and events. <Link href="/contact" className="underline text-brandOrange">Inquire about booking</Link> today!
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 mx-auto max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-5 text-left backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Stay connected</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xl font-bold text-white">New B3U experiences are on the way.</p>
              <p className="mt-1 text-sm text-white/80">Join The Take Back Monthly for first access to speaking dates, community gatherings, fresh podcast drops, and new release news.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/#newsletter" className="btn-light whitespace-nowrap">
                Subscribe for Updates
              </Link>
              <Link href="/shop" className="btn-outline whitespace-nowrap border-white/30 text-white hover:bg-white/15">
                Explore the Book
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/70">Watch this space for the next B3U live experience and keep the momentum going with Bree&apos;s latest book and weekly updates.</p>
        </motion.div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-widest">SCROLL</div>
    </section>
  );
}
