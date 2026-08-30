import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroBg from '@/images/content/about2.jpeg';
import Image from 'next/image';
import type { SiteDraft } from '@/lib/siteEditorContent';

type HeroProps = {
  draft: SiteDraft;
};

export default function Hero({ draft: _draft }: HeroProps) {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden gradient-hero pt-28 md:pt-32">
      <div className="absolute inset-0">
        <Image
          src={HeroBg}
          alt="Dr. Bree Charles speaking and leadership hero background"
          fill
          priority
          className="object-cover object-[center_10%] opacity-30"
          sizes="100vw"
        />
      </div>
      <div className="section-padding relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-brandOrange"
        >
          Transformational Speaker • U.S. Army Veteran • Author • Founder of B3U
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-5xl text-5xl md:text-6xl font-display font-bold mb-6"
        >
          Helping Leaders Take Back the Person Behind the Role
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="max-w-3xl mx-auto text-lg md:text-xl text-white/90 mb-10"
        >
          Dr. Bree Charles equips strong, dependable leaders to move beyond survival mode, reclaim their identity, voice, and purpose, and lead with clarity.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/booking" className="btn-primary">Book Dr. Bree</Link>
          <Link href="/speaking" className="btn-outline">Explore Speaking Programs</Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-8 text-base md:text-lg font-semibold text-white/85"
        >
          Breaking Cycles. Building Legacies. Moving leaders from defeated to determined.
        </motion.p>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-widest">SCROLL</div>
    </section>
  );
}
