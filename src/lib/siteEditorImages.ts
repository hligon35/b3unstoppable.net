import type { StaticImageData } from 'next/image';
import { useEffect, useState } from 'react';

import about1 from '@/images/content/about1.jpeg';
import about2 from '@/images/content/about2.jpeg';
import aboutBree from '@/images/content/aboutBree.jpeg';
import EventFlyer from '@/images/content/flyer.png';
import Test1 from '@/images/content/test1.JPG';
import Test2 from '@/images/content/test2.JPEG';
import about3 from '@/images/photos/J&B-(2 of 3).JPEG';
import about4 from '@/images/photos/J&B-(3 of 3).JPEG';
import BookCover from '@/images/shop/bookCover.png';

export const SITE_EDITOR_STORAGE_KEY = 'b3u-site-editor-home-draft';

export type SiteImagePage = 'home' | 'about' | 'events' | 'shop';
export type SiteImageField =
  | 'homeAboutImageOne'
  | 'homeAboutImageTwo'
  | 'homeAboutImageThree'
  | 'homeAboutImageFour'
  | 'aboutPageFeatureImage'
  | 'eventsFlyerImage'
  | 'eventsBookImage'
  | 'shopBookImage';

export type SiteImageOptionId =
  | 'about1'
  | 'about2'
  | 'about3'
  | 'about4'
  | 'aboutBree'
  | 'bookCover'
  | 'eventFlyer'
  | 'test1'
  | 'test2';

export type UploadedSiteImageSelection = {
  kind: 'uploaded';
  dataUrl: string;
  fileName: string;
};

export type SiteImageSelectionValue = SiteImageOptionId | UploadedSiteImageSelection;
export type SiteImageSelections = Record<SiteImageField, SiteImageSelectionValue>;

type SiteImageOption = {
  id: SiteImageOptionId;
  label: string;
  alt: string;
  image: StaticImageData;
};

const siteImageOptionsById: Record<SiteImageOptionId, SiteImageOption> = {
  about1: { id: 'about1', label: 'About Portrait One', alt: 'Dr. Bree Charles speaking portrait', image: about1 },
  about2: { id: 'about2', label: 'About Portrait Two', alt: 'Dr. Bree Charles smiling portrait', image: about2 },
  about3: { id: 'about3', label: 'Candid Portrait One', alt: 'Dr. Bree Charles candid portrait', image: about3 },
  about4: { id: 'about4', label: 'Candid Portrait Two', alt: 'Dr. Bree Charles event portrait', image: about4 },
  aboutBree: { id: 'aboutBree', label: 'About Page Feature Portrait', alt: 'Dr. Bree Charles portrait', image: aboutBree },
  bookCover: { id: 'bookCover', label: 'Book Cover', alt: 'The Big Take Back book cover', image: BookCover },
  eventFlyer: { id: 'eventFlyer', label: 'Event Flyer', alt: 'Event flyer', image: EventFlyer },
  test1: { id: 'test1', label: 'Promo Still One', alt: 'B3U promo still', image: Test1 },
  test2: { id: 'test2', label: 'Promo Still Two', alt: 'B3U promo still', image: Test2 },
};

export const siteImageOptions = Object.values(siteImageOptionsById);

export const siteImagePages: Array<{ id: SiteImagePage; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'events', label: 'Events' },
  { id: 'shop', label: 'Shop' },
];

export const defaultSiteImageSelections: Record<SiteImageField, SiteImageOptionId> = {
  homeAboutImageOne: 'about1',
  homeAboutImageTwo: 'about4',
  homeAboutImageThree: 'about3',
  homeAboutImageFour: 'about2',
  aboutPageFeatureImage: 'aboutBree',
  eventsFlyerImage: 'eventFlyer',
  eventsBookImage: 'bookCover',
  shopBookImage: 'bookCover',
};

export const siteImageFieldsByPage: Record<SiteImagePage, SiteImageField[]> = {
  home: ['homeAboutImageOne', 'homeAboutImageTwo', 'homeAboutImageThree', 'homeAboutImageFour'],
  about: ['aboutPageFeatureImage'],
  events: ['eventsFlyerImage', 'eventsBookImage'],
  shop: ['shopBookImage'],
};

export const siteImageFieldMeta: Record<SiteImageField, { label: string; description: string }> = {
  homeAboutImageOne: { label: 'Home About Image 1', description: 'Top-left image in the homepage about collage.' },
  homeAboutImageTwo: { label: 'Home About Image 2', description: 'Top-right image in the homepage about collage.' },
  homeAboutImageThree: { label: 'Home About Image 3', description: 'Bottom-left image in the homepage about collage.' },
  homeAboutImageFour: { label: 'Home About Image 4', description: 'Bottom-right image in the homepage about collage.' },
  aboutPageFeatureImage: { label: 'About Feature Image', description: 'Main portrait shown on the About page.' },
  eventsFlyerImage: { label: 'Events Flyer', description: 'Flyer image used by flyer event cards and the modal view.' },
  eventsBookImage: { label: 'Events Book Cover', description: 'Book image used by book-style event cards.' },
  shopBookImage: { label: 'Shop Book Cover', description: 'Primary book image used across the Shop page.' },
};

function isValidSiteImageOptionId(value: unknown): value is SiteImageOptionId {
  return typeof value === 'string' && value in siteImageOptionsById;
}

function isUploadedSiteImageSelection(value: unknown): value is UploadedSiteImageSelection {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<UploadedSiteImageSelection>;
  return candidate.kind === 'uploaded' && typeof candidate.dataUrl === 'string' && typeof candidate.fileName === 'string';
}

export function resolveSiteImage(imageValue: unknown, fallbackId?: SiteImageOptionId) {
  if (isValidSiteImageOptionId(imageValue)) {
    return siteImageOptionsById[imageValue];
  }

  if (isUploadedSiteImageSelection(imageValue)) {
    return {
      id: fallbackId ?? 'about1',
      label: imageValue.fileName || 'Uploaded image',
      alt: imageValue.fileName || 'Uploaded image',
      image: imageValue.dataUrl,
    };
  }

  return siteImageOptionsById[fallbackId ?? 'about1'];
}

export function mergeSiteImageSelections(partialSelections?: Partial<Record<SiteImageField, unknown>>) {
  return Object.entries(defaultSiteImageSelections).reduce((currentSelections, [field, fallbackId]) => {
    const nextField = field as SiteImageField;
    const nextValue = partialSelections?.[nextField];

    currentSelections[nextField] = isValidSiteImageOptionId(nextValue) || isUploadedSiteImageSelection(nextValue) ? nextValue : fallbackId;
    return currentSelections;
  }, { ...defaultSiteImageSelections } as SiteImageSelections);
}

export function readSavedSiteImageSelections() {
  if (typeof window === 'undefined') {
    return defaultSiteImageSelections;
  }

  try {
    const rawDraft = window.localStorage.getItem(SITE_EDITOR_STORAGE_KEY);

    if (!rawDraft) {
      return defaultSiteImageSelections;
    }

    const parsed = JSON.parse(rawDraft) as { draft?: Partial<Record<SiteImageField, unknown>> };
    return mergeSiteImageSelections(parsed.draft);
  } catch {
    return defaultSiteImageSelections;
  }
}

export function useSavedSiteImageSelections() {
  const [selections, setSelections] = useState<SiteImageSelections>(defaultSiteImageSelections);

  useEffect(() => {
    setSelections(readSavedSiteImageSelections());

    const handleStorage = () => {
      setSelections(readSavedSiteImageSelections());
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return selections;
}