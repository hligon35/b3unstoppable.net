import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect } from 'react';
import { resolveSiteImage } from '@/lib/siteEditorImages';
import { usePublishedSiteDraft } from '@/lib/siteEditorContent';
import { getPublishedSitePageProps, type PublishedSitePageProps } from '@/lib/siteEditorContent.server';

type PayPalWindow = Window & {
  paypal?: {
    HostedButtons: (options: { hostedButtonId: string }) => {
      render: (selector: string) => void;
    };
  };
};

type ShopPageProps = PublishedSitePageProps;

export default function ShopPage({ initialSiteDraft, initialSiteUpdatedAt }: ShopPageProps) {
  const { draft } = usePublishedSiteDraft({
    initialDraft: initialSiteDraft,
    initialUpdatedAt: initialSiteUpdatedAt,
    preferLocalDraft: false,
  });
  const shopBookImage = resolveSiteImage(draft.shopBookImage);
  const shopVideoPosterUrl = typeof shopBookImage.image === 'string' ? shopBookImage.image : shopBookImage.image.src;

  const renderPayPalButton = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const paypal = (window as PayPalWindow).paypal;
    if (!paypal) {
      return;
    }

    draft.shopProducts.forEach(({ containerId, hostedButtonId }) => {
      const container = document.getElementById(containerId);

      if (!container) {
        return;
      }

      container.innerHTML = '';

      if (!hostedButtonId) {
        return;
      }

      paypal.HostedButtons({ hostedButtonId }).render(`#${containerId}`);
    });
  };

  useEffect(() => {
    renderPayPalButton();
  }, [draft.shopProducts]);

  return (
    <Layout
      title="Shop | The Big Take Back | B3U"
      description="Discover The Big Take Back: What I Left Behind by Dr. Bree Charles, a memoir and method for breaking cycles, healing deeply, and reclaiming your life."
    >
      <section className="section-padding bg-gradient-to-br from-[#fff8f3] via-white to-brandBlue-light/40">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">{draft.shopEyebrow}</p>
            <h1 className="mt-4 text-4xl font-bold text-navy md:text-5xl">{draft.shopTitle}</h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-navy/80">
              {draft.shopIntroOne}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-navy/70 md:text-lg">
              {draft.shopIntroTwo}
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
                    poster={shopVideoPosterUrl}
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
                    src={shopBookImage.image}
                    alt={shopBookImage.alt}
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
              <h2 className="text-2xl font-bold text-navy">{draft.shopOrderTitle}</h2>
              <p className="mt-3 text-navy/75">
                {draft.shopOrderDescription}
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {draft.shopProducts.map(({ label, containerId }) => (
                  <div key={containerId} className="rounded-2xl border border-black/10 bg-[#fff8f3] p-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/60">{label}</p>
                    <div className="mt-3 min-h-[56px]">
                      <div id={containerId} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-navy/10 bg-gray-50 p-5">
                <h3 className="text-lg font-bold text-navy">{draft.shopContactTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/75">
                  {draft.shopContactDescription}
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

export const getServerSideProps: GetServerSideProps<ShopPageProps> = async () => {
  return {
    props: await getPublishedSitePageProps(),
  };
};
