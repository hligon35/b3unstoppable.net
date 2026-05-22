import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect } from 'react';
import BookImage from '@/images/shop/bookCover.png';

const PAYPAL_BUTTONS = [
  {
    label: 'Paperback',
    containerId: 'paypal-container-RDELK856FXAPN',
    hostedButtonId: 'RDELK856FXAPN',
  },
  {
    label: 'Hardcover',
    containerId: 'paypal-container-XMM68ZBM73KMG',
    hostedButtonId: 'XMM68ZBM73KMG',
  },
] as const;

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
    if (!paypal) {
      return;
    }

    PAYPAL_BUTTONS.forEach(({ containerId, hostedButtonId }) => {
      const container = document.getElementById(containerId);

      if (!container || container.childElementCount > 0) {
        return;
      }

      paypal.HostedButtons({ hostedButtonId }).render(`#${containerId}`);
    });
  };

  useEffect(() => {
    renderPayPalButton();
  }, []);

  return (
    <Layout
      title="Shop | The Big Take Back | B3U"
      description="Discover The Big Take Back: What I Left Behind by Dr. Bree Charles, a memoir and method for breaking cycles, healing deeply, and reclaiming your life."
    >
      <section className="section-padding bg-gradient-to-br from-[#fff8f3] via-white to-brandBlue-light/40">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Featured book</p>
            <h1 className="mt-4 text-4xl font-bold text-navy md:text-5xl">The Big Take Back: What I Left Behind</h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-navy/80">
              More than a memoir, this book is a movement and a method. Dr. Bree Charles shares the raw truth of trauma, loss, fear, and survival, then walks readers toward healing, clarity, and the decision to take their lives back.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-navy/70 md:text-lg">
              This is for the reader who is ready to stop living in survival mode, confront what has been carried too long, and rebuild life with clarity, confidence, and conviction.
            </p>
          </div>

          <div className="grid items-start gap-12 md:grid-cols-2">
            <div className="card bg-white shadow-2xl">
              <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-navy">
                <div className="p-4 md:p-5">
                  <video
                    className="aspect-video w-full rounded-[1.25rem] bg-black object-cover"
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
                  <p className="mt-3 text-sm leading-relaxed text-white/85 md:text-base">
                    The Big Take Back goes beyond inspiration. It shows you how to break the cycles that kept you stuck, heal what you were conditioned to bury, and reclaim your voice, your power, and your direction.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-4 rounded-2xl border border-brandOrange/15 bg-[#fff8f3] p-4">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
                  <Image
                    src={BookImage}
                    alt="The Big Take Back book cover"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-navy">A memoir with a method</h2>
                  <p className="mt-2 text-sm leading-relaxed text-navy/75">
                    Read the story, use the framework, and keep moving toward the version of your life that is no longer defined by what tried to break you.
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-white shadow-2xl">
              <h2 className="text-2xl font-bold text-navy">Order your copy now</h2>
              <p className="mt-3 text-navy/75">
                The Big Take Back is on sale now. Choose the edition that fits your shelf and keep building the kind of freedom that changes what comes next.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {PAYPAL_BUTTONS.map(({ label, containerId }) => (
                  <div key={containerId} className="rounded-2xl border border-black/10 bg-[#fff8f3] p-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/60">{label}</p>
                    <div className="mt-3 min-h-[56px]">
                      <div id={containerId} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-navy/10 bg-gray-50 p-5">
                <h3 className="text-lg font-bold text-navy">Stay connected</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/75">
                  Want updates, speaking details, or help placing a larger order? Reach out directly or join the weekly list.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link href="/#newsletter" className="btn-outline flex-1 text-center">Join The Take Back Weekly</Link>
                  <Link href="/contact" className="btn-primary flex-1 text-center">Contact B3U about the book</Link>
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
