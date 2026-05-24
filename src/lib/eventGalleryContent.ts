import { communityEvent } from '@/lib/communityEvent';

export type EventCardMediaType = 'book' | 'flyer';
export type EventCardSecondaryActionType = 'none' | 'link' | 'flyer';

export type EventGalleryCardContent = {
  id: string;
  hidden: boolean;
  mediaType: EventCardMediaType;
  mediaBadge: string;
  badgeOne: string;
  badgeTwo: string;
  badgeThree: string;
  title: string;
  description: string;
  detailTitle: string;
  detailLineOne: string;
  detailLineTwo: string;
  detailLineThree: string;
  primaryActionLabel: string;
  primaryActionUrl: string;
  secondaryActionLabel: string;
  secondaryActionType: EventCardSecondaryActionType;
  secondaryActionUrl: string;
};

export type EventGalleryContent = {
  eyebrow: string;
  heading: string;
  description: string;
  bannerEyebrow: string;
  bannerTitle: string;
  bannerDescription: string;
  cards: EventGalleryCardContent[];
};

export const eventGalleryContent: EventGalleryContent = {
  eyebrow: 'Events',
  heading: 'Highlights, Flyers, and Book Updates',
  description: "Stay up to date on Bree's latest event moments, upcoming appearances, and book news in one place.",
  bannerEyebrow: 'Book Update',
  bannerTitle: 'The Big Take Back: What I Left Behind is ON SALE NOW.',
  bannerDescription:
    'Share the news, watch for fresh updates, and point your community to the book now that it is officially available.',
  cards: [
    {
      id: 'book-update',
      hidden: false,
      mediaType: 'book',
      mediaBadge: 'ON SALE NOW',
      badgeOne: '',
      badgeTwo: '',
      badgeThree: '',
      title: 'The Big Take Back: What I Left Behind',
      description:
        "The Big Take Back is Dr. Bree Charles' memoir and method for breaking cycles, healing what was buried, and taking your life back with intention. It moves from raw truth to practical transformation.",
      detailTitle: '',
      detailLineOne: '',
      detailLineTwo: '',
      detailLineThree: '',
      primaryActionLabel: '',
      primaryActionUrl: '',
      secondaryActionLabel: '',
      secondaryActionType: 'none',
      secondaryActionUrl: '',
    },
    {
      id: 'upcoming-event',
      hidden: false,
      mediaType: 'flyer',
      mediaBadge: 'Conference',
      badgeOne: 'Live Event',
      badgeTwo: communityEvent.dateLabel,
      badgeThree: communityEvent.timeLabel,
      title: communityEvent.name,
      description: communityEvent.description,
      detailTitle: communityEvent.scheduleLabel,
      detailLineOne: communityEvent.venueName,
      detailLineTwo: communityEvent.streetAddress,
      detailLineThree: communityEvent.cityStateZip,
      primaryActionLabel: 'Register on Eventbrite',
      primaryActionUrl: communityEvent.url,
      secondaryActionLabel: 'View Flyer',
      secondaryActionType: 'flyer',
      secondaryActionUrl: '',
    },
  ],
};

export function createEmptyEventCard(index: number): EventGalleryCardContent {
  return {
    id: `event-card-${Date.now()}-${index}`,
    hidden: false,
    mediaType: 'flyer',
    mediaBadge: '',
    badgeOne: '',
    badgeTwo: '',
    badgeThree: '',
    title: `Event Card ${index}`,
    description: '',
    detailTitle: '',
    detailLineOne: '',
    detailLineTwo: '',
    detailLineThree: '',
    primaryActionLabel: '',
    primaryActionUrl: '',
    secondaryActionLabel: '',
    secondaryActionType: 'none',
    secondaryActionUrl: '',
  };
}