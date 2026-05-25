import { useEffect, useState } from 'react';

import {
  createEmptyEventCard,
  eventGalleryContent,
  type EventCardMediaType,
  type EventCardSecondaryActionType,
  type EventGalleryCardContent,
} from './eventGalleryContent';
import {
  SITE_EDITOR_STORAGE_KEY,
  defaultSiteImageSelections,
  mergeSiteImageSelections,
  type SiteImageSelections,
} from './siteEditorImages';

export type PayPalProductDraft = {
  id: string;
  label: string;
  containerId: string;
  hostedButtonId: string;
};

export type SiteDraft = SiteImageSelections & {
  pageTitle: string;
  status: 'draft';
  brandBlue: string;
  brandBlueDark: string;
  brandBlueLight: string;
  brandOrange: string;
  brandOrangeDark: string;
  brandOrangeLight: string;
  navy: string;
  aboutHeading: string;
  aboutParagraphOne: string;
  aboutParagraphTwo: string;
  aboutTagline: string;
  aboutCtaLabel: string;
  aboutCtaHref: string;
  newsletterHeading: string;
  newsletterDescription: string;
  eventsHeading: string;
  eventsDescription: string;
  eventsBookUpdateEyebrow: string;
  eventsBookUpdateTitle: string;
  eventsBookUpdateDescription: string;
  eventCards: EventGalleryCardContent[];
  shopEyebrow: string;
  shopTitle: string;
  shopIntroOne: string;
  shopIntroTwo: string;
  shopOrderTitle: string;
  shopOrderDescription: string;
  shopContactTitle: string;
  shopContactDescription: string;
  shopProducts: PayPalProductDraft[];
};

type SiteContentApiResponse = {
  draft?: unknown;
  updatedAt?: string | null;
};

type UsePublishedSiteDraftOptions = {
  initialDraft?: SiteDraft;
  initialUpdatedAt?: string | null;
  preferLocalDraft?: boolean;
};

export const defaultSiteDraft: SiteDraft = {
  ...defaultSiteImageSelections,
  pageTitle: 'Homepage',
  status: 'draft',
  brandBlue: '#7BAFD4',
  brandBlueDark: '#4B86AB',
  brandBlueLight: '#A9CBE2',
  brandOrange: '#CC5500',
  brandOrangeDark: '#A64400',
  brandOrangeLight: '#E6762A',
  navy: '#0A1A2A',
  aboutHeading: 'About Dr. Bree Charles',
  aboutParagraphOne:
    "Transformational speaker, author, U.S. Army veteran, and creator of the B3U Podcast. Bree has turned her pain into purpose, proving that brokenness doesn't mean defeat it means rebirth.",
  aboutParagraphTwo:
    'Through courage, faith, and relentless resilience, she helps others burn away fear, break destructive patterns, and become who they were created to be.',
  aboutTagline: 'Breaking Cycles. Building Legacies.',
  aboutCtaLabel: 'Learn More About Bree',
  aboutCtaHref: '/about',
  newsletterHeading: 'Join "The Take Back Weekly"',
  newsletterDescription: 'Get new episodes, inspiration, and community opportunities delivered to your inbox.',
  eventsHeading: eventGalleryContent.heading,
  eventsDescription: eventGalleryContent.description,
  eventsBookUpdateEyebrow: eventGalleryContent.bannerEyebrow,
  eventsBookUpdateTitle: eventGalleryContent.bannerTitle,
  eventsBookUpdateDescription: eventGalleryContent.bannerDescription,
  eventCards: eventGalleryContent.cards.map((card) => ({ ...card })),
  shopEyebrow: 'Featured book',
  shopTitle: 'The Big Take Back: What I Left Behind',
  shopIntroOne:
    'More than a memoir, this book is a movement and a method. Dr. Bree Charles shares the raw truth of trauma, loss, fear, and survival, then walks readers toward healing, clarity, and the decision to take their lives back.',
  shopIntroTwo:
    'This is for the reader who is ready to stop living in survival mode, confront what has been carried too long, and rebuild life with clarity, confidence, and conviction.',
  shopOrderTitle: 'Order your copy now',
  shopOrderDescription:
    'The Big Take Back is on sale now. Choose the edition that fits your shelf and keep building the kind of freedom that changes what comes next.',
  shopContactTitle: 'Stay connected',
  shopContactDescription: 'Want updates, speaking details, or help placing a larger order? Reach out directly or join the weekly list.',
  shopProducts: [
    {
      id: 'paperback',
      label: 'Paperback',
      containerId: 'paypal-container-RDELK856FXAPN',
      hostedButtonId: 'RDELK856FXAPN',
    },
    {
      id: 'hardcover',
      label: 'Hardcover',
      containerId: 'paypal-container-XMM68ZBM73KMG',
      hostedButtonId: 'XMM68ZBM73KMG',
    },
  ],
};

function sanitizeString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeMediaType(value: unknown, fallback: EventCardMediaType): EventCardMediaType {
  return value === 'book' || value === 'flyer' ? value : fallback;
}

function sanitizeSecondaryActionType(value: unknown, fallback: EventCardSecondaryActionType): EventCardSecondaryActionType {
  return value === 'none' || value === 'link' || value === 'flyer' ? value : fallback;
}

function sanitizeEventCard(card: unknown, index: number): EventGalleryCardContent {
  const fallback = defaultSiteDraft.eventCards[index] ?? createEmptyEventCard(index + 1);
  const candidate = card && typeof card === 'object' ? (card as Partial<EventGalleryCardContent>) : {};

  return {
    id: sanitizeString(candidate.id, fallback.id),
    hidden: sanitizeBoolean(candidate.hidden, fallback.hidden),
    mediaType: sanitizeMediaType(candidate.mediaType, fallback.mediaType),
    mediaBadge: sanitizeString(candidate.mediaBadge, fallback.mediaBadge),
    badgeOne: sanitizeString(candidate.badgeOne, fallback.badgeOne),
    badgeTwo: sanitizeString(candidate.badgeTwo, fallback.badgeTwo),
    badgeThree: sanitizeString(candidate.badgeThree, fallback.badgeThree),
    title: sanitizeString(candidate.title, fallback.title),
    description: sanitizeString(candidate.description, fallback.description),
    detailTitle: sanitizeString(candidate.detailTitle, fallback.detailTitle),
    detailLineOne: sanitizeString(candidate.detailLineOne, fallback.detailLineOne),
    detailLineTwo: sanitizeString(candidate.detailLineTwo, fallback.detailLineTwo),
    detailLineThree: sanitizeString(candidate.detailLineThree, fallback.detailLineThree),
    primaryActionLabel: sanitizeString(candidate.primaryActionLabel, fallback.primaryActionLabel),
    primaryActionUrl: sanitizeString(candidate.primaryActionUrl, fallback.primaryActionUrl),
    secondaryActionLabel: sanitizeString(candidate.secondaryActionLabel, fallback.secondaryActionLabel),
    secondaryActionType: sanitizeSecondaryActionType(candidate.secondaryActionType, fallback.secondaryActionType),
    secondaryActionUrl: sanitizeString(candidate.secondaryActionUrl, fallback.secondaryActionUrl),
  };
}

function sanitizeShopProduct(product: unknown, index: number): PayPalProductDraft {
  const fallback = defaultSiteDraft.shopProducts[index] ?? {
    id: `product-${index + 1}`,
    label: `Product ${index + 1}`,
    containerId: '',
    hostedButtonId: '',
  };
  const candidate = product && typeof product === 'object' ? (product as Partial<PayPalProductDraft>) : {};

  return {
    id: sanitizeString(candidate.id, fallback.id),
    label: sanitizeString(candidate.label, fallback.label),
    containerId: sanitizeString(candidate.containerId, fallback.containerId),
    hostedButtonId: sanitizeString(candidate.hostedButtonId, fallback.hostedButtonId),
  };
}

export function mergeSiteDraft(value: unknown): SiteDraft {
  const candidate = value && typeof value === 'object' ? (value as Partial<SiteDraft>) : {};
  const eventCards = Array.isArray(candidate.eventCards)
    ? candidate.eventCards.map((card, index) => sanitizeEventCard(card, index))
    : defaultSiteDraft.eventCards.map((card) => ({ ...card }));
  const shopProducts = Array.isArray(candidate.shopProducts)
    ? candidate.shopProducts.map((product, index) => sanitizeShopProduct(product, index))
    : defaultSiteDraft.shopProducts.map((product) => ({ ...product }));

  return {
    ...mergeSiteImageSelections(candidate),
    pageTitle: sanitizeString(candidate.pageTitle, defaultSiteDraft.pageTitle),
    status: 'draft',
    brandBlue: sanitizeString(candidate.brandBlue, defaultSiteDraft.brandBlue),
    brandBlueDark: sanitizeString(candidate.brandBlueDark, defaultSiteDraft.brandBlueDark),
    brandBlueLight: sanitizeString(candidate.brandBlueLight, defaultSiteDraft.brandBlueLight),
    brandOrange: sanitizeString(candidate.brandOrange, defaultSiteDraft.brandOrange),
    brandOrangeDark: sanitizeString(candidate.brandOrangeDark, defaultSiteDraft.brandOrangeDark),
    brandOrangeLight: sanitizeString(candidate.brandOrangeLight, defaultSiteDraft.brandOrangeLight),
    navy: sanitizeString(candidate.navy, defaultSiteDraft.navy),
    aboutHeading: sanitizeString(candidate.aboutHeading, defaultSiteDraft.aboutHeading),
    aboutParagraphOne: sanitizeString(candidate.aboutParagraphOne, defaultSiteDraft.aboutParagraphOne),
    aboutParagraphTwo: sanitizeString(candidate.aboutParagraphTwo, defaultSiteDraft.aboutParagraphTwo),
    aboutTagline: sanitizeString(candidate.aboutTagline, defaultSiteDraft.aboutTagline),
    aboutCtaLabel: sanitizeString(candidate.aboutCtaLabel, defaultSiteDraft.aboutCtaLabel),
    aboutCtaHref: sanitizeString(candidate.aboutCtaHref, defaultSiteDraft.aboutCtaHref),
    newsletterHeading: sanitizeString(candidate.newsletterHeading, defaultSiteDraft.newsletterHeading),
    newsletterDescription: sanitizeString(candidate.newsletterDescription, defaultSiteDraft.newsletterDescription),
    eventsHeading: sanitizeString(candidate.eventsHeading, defaultSiteDraft.eventsHeading),
    eventsDescription: sanitizeString(candidate.eventsDescription, defaultSiteDraft.eventsDescription),
    eventsBookUpdateEyebrow: sanitizeString(candidate.eventsBookUpdateEyebrow, defaultSiteDraft.eventsBookUpdateEyebrow),
    eventsBookUpdateTitle: sanitizeString(candidate.eventsBookUpdateTitle, defaultSiteDraft.eventsBookUpdateTitle),
    eventsBookUpdateDescription: sanitizeString(candidate.eventsBookUpdateDescription, defaultSiteDraft.eventsBookUpdateDescription),
    eventCards,
    shopEyebrow: sanitizeString(candidate.shopEyebrow, defaultSiteDraft.shopEyebrow),
    shopTitle: sanitizeString(candidate.shopTitle, defaultSiteDraft.shopTitle),
    shopIntroOne: sanitizeString(candidate.shopIntroOne, defaultSiteDraft.shopIntroOne),
    shopIntroTwo: sanitizeString(candidate.shopIntroTwo, defaultSiteDraft.shopIntroTwo),
    shopOrderTitle: sanitizeString(candidate.shopOrderTitle, defaultSiteDraft.shopOrderTitle),
    shopOrderDescription: sanitizeString(candidate.shopOrderDescription, defaultSiteDraft.shopOrderDescription),
    shopContactTitle: sanitizeString(candidate.shopContactTitle, defaultSiteDraft.shopContactTitle),
    shopContactDescription: sanitizeString(candidate.shopContactDescription, defaultSiteDraft.shopContactDescription),
    shopProducts,
  };
}

export function readSavedSiteEditorDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(SITE_EDITOR_STORAGE_KEY);

    if (!rawDraft) {
      return null;
    }

    const parsed = JSON.parse(rawDraft) as { draft?: unknown; savedAt?: string };
    return {
      draft: mergeSiteDraft(parsed.draft),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
    };
  } catch {
    return null;
  }
}

export function saveSiteEditorDraftLocally(draft: SiteDraft, savedAt: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SITE_EDITOR_STORAGE_KEY, JSON.stringify({ draft, savedAt }));
}

export function usePublishedSiteDraft(options: UsePublishedSiteDraftOptions = {}) {
  const [draft, setDraft] = useState<SiteDraft>(options.initialDraft ?? defaultSiteDraft);
  const [updatedAt, setUpdatedAt] = useState<string | null>(options.initialUpdatedAt ?? null);

  useEffect(() => {
    if (options.preferLocalDraft !== false) {
      const savedDraft = readSavedSiteEditorDraft();

      if (savedDraft) {
        setDraft(savedDraft.draft);
        setUpdatedAt(savedDraft.savedAt);
        return;
      }
    }

    if (options.initialDraft) {
      setDraft(options.initialDraft);
      setUpdatedAt(options.initialUpdatedAt ?? null);
      return;
    }

    let cancelled = false;

    async function loadPublishedDraft() {
      try {
        const response = await fetch('/api/site-content');
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SiteContentApiResponse;
        if (!cancelled) {
          setDraft(mergeSiteDraft(data.draft));
          setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null);
        }
      } catch {
        // Keep default content if publish storage is unavailable.
      }
    }

    void loadPublishedDraft();

    return () => {
      cancelled = true;
    };
  }, [options.initialDraft, options.initialUpdatedAt, options.preferLocalDraft]);

  return { draft, updatedAt };
}