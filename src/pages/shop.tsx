import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect } from 'react';
import BookImage from '@/images/shop/bookCover.png';

const PAYPAL_CONTAINER_ID = 'paypal-container-UCC2NQWJMK3TU';
const PAYPAL_HOSTED_BUTTON_ID = 'UCC2NQWJMK3TU';

type PayPalWindow = Window & {
  paypal?: {
    HostedButtons: (options: { hostedButtonId: string }) => {
      render: (selector: string) => void;
    };
  };
};

export default function ShopPage() {
  const renderPayPalButton = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const paypal = (window as PayPalWindow).paypal;
    const container = document.getElementById(PAYPAL_CONTAINER_ID);

    if (!paypal || !container || container.childElementCount > 0) {
      return;
    }

    paypal.HostedButtons({ hostedButtonId: PAYPAL_HOSTED_BUTTON_ID }).render(`#${PAYPAL_CONTAINER_ID}`);
  };

  useEffect(() => {
    renderPayPalButton();
  }, []);

  return (
    <Layout
      title="Shop | The Big Take Back | B3U"
      description="Discover The Big Take Back: What I Left Behind by Dr. Bree Charles, a memoir and method for breaking cycles, healing deeply, and reclaiming your life."
    >
      <section className="section-padding bg-[linear-gradient(180deg,#fff_0%,#fff4eb_100%)]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Featured book</p>
            <h1 className="mt-4 text-4xl font-bold md:text-5xl">The Big Take Back: What I Left Behind</h1>
            <p className="mt-5 text-lg text-navy/80">
              More than a memoir, this book is a movement and a method. Dr. Bree Charles shares the raw truth of trauma, loss, fear, and survival, then walks readers toward healing, clarity, and the decision to take their lives back.
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
                  The Big Take Back goes beyond inspiration. It shows you how to break the cycles that kept you stuck, heal what you were conditioned to bury, and reclaim your voice, your power, and your direction.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
              <div className="mt-6 text-center lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brandOrange">Take the next step</p>
                <h2 className="mt-3 text-2xl font-bold text-navy">Order your copy now</h2>
                <p className="mt-3 text-sm leading-relaxed text-navy/75">
                  The Big Take Back is ON SALE NOW. Follow the latest updates, stay connected to the message, and keep building the kind of freedom that changes what comes next.
                </p>
                <div className="mt-6 min-h-[56px]">
                  <div id={PAYPAL_CONTAINER_ID} />
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <Link href="/#newsletter" className="btn-outline text-center">Join The Take Back Weekly</Link>
                  <Link href="/contact" className="text-sm font-semibold text-brandOrange transition hover:text-brandOrange-dark">Contact B3U about the book</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Script
        src="https://www.paypal.com/sdk/js?client-id=BAAPBO-Uvexziam7VLQ2yKMSsR2wCpPVT3FB5A_JCB5ENRZakcAlTvZiI-TV2iZz-hLGg62MA9VxbS77jQ&components=hosted-buttons&enable-funding=venmo&currency=USD"
        strategy="afterInteractive"
        onLoad={renderPayPalButton}
      />
    </Layout>
  );
}
