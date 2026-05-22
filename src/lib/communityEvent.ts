export const siteUrl = 'https://www.b3unstoppable.net';

export const communityEvent = {
  name: 'Prosper on Purpose',
  shortName: 'Prosper on Purpose Brunch',
  description: 'A leadership and community networking brunch designed to connect purpose-driven leaders, spark meaningful conversations, and build new opportunities.',
  imagePath: '/images/events/flyer.png',
  venueName: '3030 the Venue',
  streetAddress: '8257 Hull Street',
  cityStateZip: 'Richmond, VA 23235',
  location: 'Richmond, VA',
  dateLabel: 'Saturday, Jun 6',
  timeLabel: '11 am to 3 pm',
  scheduleLabel: 'Saturday, Jun 6 from 11 am to 3 pm',
  startDateTime: '2026-06-06T11:00:00-04:00',
  endDateTime: '2026-06-06T15:00:00-04:00',
  url: 'https://www.eventbrite.com/e/prosper-on-purpose-a-leadership-community-networking-brunch-tickets-1985538172122',
} as const;

export function createCommunityEventStructuredData(params: {
  pageUrl: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: communityEvent.name,
    description: communityEvent.description,
    startDate: communityEvent.startDateTime,
    endDate: communityEvent.endDateTime,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: communityEvent.url,
    mainEntityOfPage: params.pageUrl,
    image: params.imageUrl ? [params.imageUrl] : undefined,
    location: {
      '@type': 'Place',
      name: communityEvent.venueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: communityEvent.streetAddress,
        addressLocality: 'Richmond',
        addressRegion: 'VA',
        postalCode: '23235',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'B3U — Burn, Break, Become Unstoppable',
      url: siteUrl,
    },
    performer: {
      '@type': 'Person',
      name: 'Dr. Bree Charles',
      url: siteUrl,
    },
    offers: {
      '@type': 'Offer',
      url: communityEvent.url,
      availability: 'https://schema.org/InStock',
      validFrom: communityEvent.startDateTime,
    },
  };
}