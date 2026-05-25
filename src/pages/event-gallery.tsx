import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { communityEvent, createCommunityEventStructuredData, siteUrl } from '@/lib/communityEvent';
import type { EventGalleryCardContent } from '@/lib/eventGalleryContent';
import { resolveSiteImage } from '@/lib/siteEditorImages';
import { usePublishedSiteDraft } from '@/lib/siteEditorContent';
import { getPublishedSitePageProps, type PublishedSitePageProps } from '@/lib/siteEditorContent.server';

function cardBadges(card: EventGalleryCardContent) {
  return [card.badgeOne, card.badgeTwo, card.badgeThree].filter(Boolean);
}

type EventGalleryPageProps = PublishedSitePageProps;

export default function EventGalleryPage({ initialSiteDraft, initialSiteUpdatedAt }: EventGalleryPageProps) {
  const [flyerOpen, setFlyerOpen] = useState(false);
  const { draft } = usePublishedSiteDraft({
    initialDraft: initialSiteDraft,
    initialUpdatedAt: initialSiteUpdatedAt,
    preferLocalDraft: false,
  });
  const visibleCards = draft.eventCards.filter((card) => !card.hidden);
  const flyerImage = resolveSiteImage(draft.eventsFlyerImage);
  const bookImage = resolveSiteImage(draft.eventsBookImage);
  const eventStructuredData = useMemo(() => createCommunityEventStructuredData({
    pageUrl: `${siteUrl}/event-gallery/`,
    imageUrl: new URL(communityEvent.imagePath, siteUrl).toString(),
  }), []);

  function cardMedia(card: EventGalleryCardContent) {
    return card.mediaType === 'book'
      ? { src: bookImage.image, alt: bookImage.alt }
      : { src: flyerImage.image, alt: flyerImage.alt };
  }

  useEffect(() => {
    if (!flyerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFlyerOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [flyerOpen]);

  return (
    <Layout
      title="Events | B3U"
      description="Explore Dr. Bree Charles event highlights, book updates, and the latest Prosper on Purpose Brunch event details."
      structuredData={eventStructuredData}
    >
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brandOrange">Events</p>
            <h1 className="mt-4 text-4xl font-bold text-navy md:text-5xl">{draft.eventsHeading}</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-navy/75">
              {draft.eventsDescription}
            </p>
          </div>

          <div className="mb-10 rounded-3xl border border-brandOrange/20 bg-gradient-to-r from-brandOrange to-red-600 p-6 text-white shadow-xl">
            {draft.eventsBookUpdateEyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">{draft.eventsBookUpdateEyebrow}</p> : null}
            {draft.eventsBookUpdateTitle ? <h2 className="mt-3 text-2xl font-bold md:text-3xl">{draft.eventsBookUpdateTitle}</h2> : null}
            {draft.eventsBookUpdateDescription ? (
              <p className="mt-3 max-w-3xl text-sm text-white/90 md:text-base">{draft.eventsBookUpdateDescription}</p>
            ) : null}
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {visibleCards.map((card) => {
              const media = cardMedia(card);
              const badges = cardBadges(card);
              const hasDetailBlock = Boolean(card.detailTitle || card.detailLineOne || card.detailLineTwo || card.detailLineThree);
              const showFlyerButton = card.secondaryActionType === 'flyer';
              const showSecondaryLink = card.secondaryActionType === 'link' && card.secondaryActionLabel && card.secondaryActionUrl;

              return (
                <div key={card.id} className="card overflow-hidden p-0">
                  {card.mediaType === 'flyer' ? (
                    <button
                      type="button"
                      className="relative h-64 w-full cursor-zoom-in bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brandOrange/30"
                      onClick={() => setFlyerOpen(true)}
                      aria-label={`Enlarge ${card.title || 'event'} media`}
                    >
                      <Image
                        src={media.src}
                        alt={media.alt}
                        fill
                        className="object-contain p-3"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      {card.mediaBadge ? <span className="absolute left-4 top-4 rounded-full bg-brandOrange px-3 py-1 text-xs font-semibold text-white">{card.mediaBadge}</span> : null}
                    </button>
                  ) : (
                    <div className="relative h-64 bg-white">
                      <Image
                        src={media.src}
                        alt={media.alt}
                        fill
                        className="object-contain p-3"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                      {card.mediaBadge ? <span className="absolute left-4 top-4 rounded-full bg-brandOrange px-3 py-1 text-xs font-semibold text-white">{card.mediaBadge}</span> : null}
                    </div>
                  )}

                  <div className="p-6">
                    {badges.length ? (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {badges.map((badge, index) => (
                          <span
                            key={`${card.id}-badge-${index}`}
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              index === 0 ? 'bg-brandOrange/10 text-brandOrange' : 'bg-navy/5 text-navy/70'
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {card.title ? <h3 className="text-xl font-bold text-navy">{card.title}</h3> : null}
                    {card.description ? <p className="mt-3 text-sm text-navy/70">{card.description}</p> : null}

                    {hasDetailBlock ? (
                      <div className="mt-4 rounded-xl bg-[#F4F8FB] p-4 text-sm text-navy/80">
                        {card.detailTitle ? <p className="font-semibold text-navy">{card.detailTitle}</p> : null}
                        {card.detailLineOne ? <p className={card.detailTitle ? 'mt-1' : ''}>{card.detailLineOne}</p> : null}
                        {card.detailLineTwo ? <p>{card.detailLineTwo}</p> : null}
                        {card.detailLineThree ? <p>{card.detailLineThree}</p> : null}
                      </div>
                    ) : null}

                    {card.primaryActionLabel || showFlyerButton || showSecondaryLink ? (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        {card.primaryActionLabel && card.primaryActionUrl ? (
                          <a
                            href={card.primaryActionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            aria-label={card.title ? `${card.primaryActionLabel} for ${card.title}` : card.primaryActionLabel}
                          >
                            {card.primaryActionLabel}
                          </a>
                        ) : null}

                        {showFlyerButton ? (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => setFlyerOpen(true)}
                          >
                            {card.secondaryActionLabel || 'View Flyer'}
                          </button>
                        ) : null}

                        {showSecondaryLink ? (
                          <a
                            href={card.secondaryActionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline"
                          >
                            {card.secondaryActionLabel}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {flyerOpen && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          onClick={() => setFlyerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Event flyer enlarged"
        >
          <div
            className="relative h-[85vh] w-full max-w-3xl cursor-default overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={flyerImage.image}
              alt={flyerImage.alt}
              fill
              className="object-contain p-4"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<EventGalleryPageProps> = async () => {
  return {
    props: await getPublishedSitePageProps(),
  };
};