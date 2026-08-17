import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

type Subscriber = {
  id: number;
  email: string;
  created_at: string;
};

type NewsletterTemplateDraft = {
  templateName: string;
  headline: string;
  byline: string;
  issueDate: string;
  weekLabel?: string;
  tagline: string;
  footerTagline: string;
};

type ComingWeekItem = {
  day: Weekday;
  text: string;
};

type WeeklyNewsletterDraft = {
  subject: string;
  mainTitle: string;
  openingLetter: string;
  closingLine: string;
  closingLetter?: string;
  featuredStoryTitle: string;
  featuredStorySubheading: string;
  featuredStoryBody: string;
  bookSpotlightTitle: string;
  bookSpotlightSubheading: string;
  bookSpotlightBody: string;
  comingThisWeekTitle: string;
  comingThisWeekBody: string;
  comingThisWeekItems?: ComingWeekItem[];
  affirmationTitle: string;
  affirmationText: string;
  bottomEncouragement: string;
  scheduledFor: string;
};

type NewsletterQueueItem = {
  id: number;
  subject: string;
  bodyText: string;
  recipientEmails: string[];
  recipientCount: number;
  scheduledFor: string;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

type SavedNewsletterDraft = {
  id: string;
  name: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  templateDraft: NewsletterTemplateDraft;
  weeklyDraft: WeeklyNewsletterDraft;
};

const TEMPLATE_STORAGE_KEY = 'b3u-newsletter-template-draft';
const WEEKLY_STORAGE_KEY = 'b3u-weekly-newsletter-draft';
const LEGACY_MONTHLY_STORAGE_KEY = 'b3u-monthly-newsletter-draft';
const SAVED_DRAFTS_STORAGE_KEY = 'b3u-newsletter-saved-drafts';
const WEEKDAY_OPTIONS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const NEWSLETTER_SECTION_MARKER_PREFIX = '[[B3U:';
const NEWSLETTER_SECTION_MARKER_PATTERN = /^\[\[B3U:([A-Za-z0-9-_]+)\]\]$/;

const defaultTemplate: NewsletterTemplateDraft = {
  templateName: 'The Take Back Weekly',
  headline: 'The Take Back Weekly',
  byline: 'By Dr. Bree Charles',
  issueDate: 'Week of July 6, 2026',
  tagline: 'Breaking Cycles. Building Legacies.',
  footerTagline: 'www.b3unstoppable.net | B3U — Burn. Break. Become Unstoppable.',
};

const defaultWeekly: WeeklyNewsletterDraft = {
  subject: 'The Take Back Weekly:',
  mainTitle: 'The Take Back Weekly',
  openingLetter: '',
  closingLine: 'With gratitude,',
  featuredStoryTitle: 'Featured Story',
  featuredStorySubheading: '',
  featuredStoryBody: '',
  bookSpotlightTitle: 'Book Spotlight',
  bookSpotlightSubheading: '',
  bookSpotlightBody: '',
  comingThisWeekTitle: 'What’s Coming Next Week',
  comingThisWeekBody: '',
  comingThisWeekItems: [],
  affirmationTitle: 'THIS WEEK’S AFFIRMATION',
  affirmationText: '',
  bottomEncouragement: 'Continue healing. Continue growing. Continue becoming.',
  scheduledFor: formatDateTimeInput(),
};

function formatDateTimeInput(date = new Date(Date.now() + 60 * 60 * 1000)) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateTimeDisplay(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function toDateTimeInputFromUtc(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return formatDateTimeInput();
  }

  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toUtcIsoStringFromDateTimeInput(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString();
}

function readStoredDraft<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredDraft<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readSavedDrafts() {
  if (typeof window === 'undefined') {
    return [] as SavedNewsletterDraft[];
  }

  try {
    const rawDrafts = window.localStorage.getItem(SAVED_DRAFTS_STORAGE_KEY);
    if (!rawDrafts) {
      return [] as SavedNewsletterDraft[];
    }

    const parsedDrafts = JSON.parse(rawDrafts);
    return Array.isArray(parsedDrafts) ? parsedDrafts.filter((draft): draft is SavedNewsletterDraft => Boolean(draft && typeof draft === 'object' && typeof draft.id === 'string' && typeof draft.name === 'string')) : [] as SavedNewsletterDraft[];
  } catch {
    return [] as SavedNewsletterDraft[];
  }
}

function writeSavedDrafts(drafts: SavedNewsletterDraft[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SAVED_DRAFTS_STORAGE_KEY, JSON.stringify(drafts.slice(0, 12)));
}

function buildSavedDraftName(subject: string) {
  const trimmed = subject.trim();
  return trimmed || 'Newsletter Draft';
}

function paragraphize(value = '', className = '') {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return null;
  }

  return paragraphs.map((paragraph, index) => {
    const lines = paragraph.split('\n');

    return (
      <p key={`${paragraph.slice(0, 24)}-${index}`} className={className || undefined}>
        {lines.map((line, lineIndex) => (
          <span key={`${line}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

function normalizeComingWeekItems(items: unknown, legacyBody = ''): ComingWeekItem[] {
  if (Array.isArray(items)) {
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const candidate = item as Partial<ComingWeekItem>;
        if (!candidate.day || !WEEKDAY_OPTIONS.includes(candidate.day)) {
          return null;
        }

        return { day: candidate.day, text: typeof candidate.text === 'string' ? candidate.text : '' };
      })
      .filter((item): item is ComingWeekItem => Boolean(item));
  }

  if (legacyBody.trim()) {
    return [{ day: 'Monday', text: legacyBody }];
  }

  return [];
}

function getComingWeekItems(weekly: WeeklyNewsletterDraft) {
  return normalizeComingWeekItems(weekly.comingThisWeekItems);
}

function getTemplateDate(template: NewsletterTemplateDraft) {
  return template.issueDate || template.weekLabel || defaultTemplate.issueDate;
}

function formatComingWeekItems(items?: ComingWeekItem[]) {
  return normalizeComingWeekItems(items)
    .map((item) => `${item.day}: ${item.text.trim()}`.trim())
    .filter(Boolean)
    .join('\n');
}

function formatClosingBlock(closingLine: string) {
  return [
    closingLine || defaultWeekly.closingLine,
    'Dr. Bree Charles',
    'Transformational Speaker | U.S. Army Veteran | Author | Host of B3U',
    'Burn. Break. Become Unstoppable.',
    'Breaking Cycles. Building Legacies.',
  ].join('\n\n');
}

function serializeNewsletterSection(key: string, value: string) {
  return `${NEWSLETTER_SECTION_MARKER_PREFIX}${key}]]\n${value.trim()}`;
}

function buildStructuredSection(heading: string, subheading: string, body: string, genericLabel: string) {
  if (subheading.trim()) {
    return { heading, subheading, body };
  }

  if (normalizeHeadingLabel(heading) !== normalizeHeadingLabel(genericLabel)) {
    return { heading, subheading: '', body };
  }

  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const [firstParagraph, ...rest] = paragraphs;

  if (!firstParagraph || !looksLikePromotableHeading(firstParagraph)) {
    return { heading, subheading: '', body };
  }

  return { heading, subheading: firstParagraph, body: rest.join('\n\n') };
}

function buildNewsletterBody(template: NewsletterTemplateDraft, weekly: WeeklyNewsletterDraft) {
  const comingWeekBody = formatComingWeekItems(getComingWeekItems(weekly));
  const featuredSection = buildStructuredSection(weekly.featuredStoryTitle || 'Featured Story', weekly.featuredStorySubheading, weekly.featuredStoryBody, 'Featured Story');
  const bookSection = buildStructuredSection(weekly.bookSpotlightTitle || 'Book Spotlight', weekly.bookSpotlightSubheading, weekly.bookSpotlightBody, 'Book Spotlight');
  const comingSectionBody = [comingWeekBody, weekly.comingThisWeekBody.trim()].filter(Boolean).join('\n\n');
  const sections = [
    serializeNewsletterSection('header-title', template.headline),
    serializeNewsletterSection('meta-line', `${template.byline} | ${getTemplateDate(template)}`),
    serializeNewsletterSection('tagline', template.tagline),
    serializeNewsletterSection('main-title', weekly.mainTitle),
    serializeNewsletterSection('opening-body', weekly.openingLetter),
    serializeNewsletterSection('closing-signature', formatClosingBlock(weekly.closingLine)),
    serializeNewsletterSection('featured-title', featuredSection.heading),
    serializeNewsletterSection('featured-subheading', featuredSection.subheading),
    serializeNewsletterSection('featured-body', featuredSection.body),
    serializeNewsletterSection('book-title', bookSection.heading),
    serializeNewsletterSection('book-subheading', bookSection.subheading),
    serializeNewsletterSection('book-body', bookSection.body),
    serializeNewsletterSection('coming-title', weekly.comingThisWeekTitle || 'What’s Coming Next Week'),
    serializeNewsletterSection('coming-body', comingSectionBody),
    serializeNewsletterSection('affirmation-title', weekly.affirmationTitle || 'THIS WEEK’S AFFIRMATION'),
    serializeNewsletterSection('affirmation-body', weekly.affirmationText),
    serializeNewsletterSection('bottom-encouragement', weekly.bottomEncouragement),
    serializeNewsletterSection('footer-tagline', template.footerTagline),
  ];

  return sections.map((section) => section.trim()).filter(Boolean).join('\n\n');
}

function buildLetterEmailHtml(template: NewsletterTemplateDraft, weekly: WeeklyNewsletterDraft) {
  return buildNewsletterBody(template, weekly);
}

function parseStructuredNewsletterBody(bodyText: string) {
  const lines = bodyText.replace(/\r\n/g, '\n').split('\n');
  const sections = new Map<string, string>();
  let currentKey: string | null = null;
  let buffer: string[] = [];

  function flushSection() {
    if (!currentKey) {
      return;
    }

    sections.set(currentKey, buffer.join('\n').trim());
    buffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const markerMatch = line.match(NEWSLETTER_SECTION_MARKER_PATTERN);

    if (markerMatch) {
      flushSection();
      currentKey = markerMatch[1].toLowerCase();
      continue;
    }

    if (!currentKey) {
      if (line) {
        return null;
      }

      continue;
    }

    buffer.push(rawLine);
  }

  flushSection();

  return sections.size ? sections : null;
}

function parseMetaLine(metaLine: string) {
  const parts = metaLine.split('|').map((part) => part.trim()).filter(Boolean);

  if (!parts.length) {
    return {
      byline: defaultTemplate.byline,
      issueDate: defaultTemplate.issueDate,
    };
  }

  return {
    byline: parts[0] || defaultTemplate.byline,
    issueDate: parts.slice(1).join(' | ') || defaultTemplate.issueDate,
  };
}

function parseClosingLine(signatureText: string) {
  return signatureText
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean) || defaultWeekly.closingLine;
}

function parseComingWeekBody(bodyText: string) {
  const items: ComingWeekItem[] = [];
  const proseLines: string[] = [];

  bodyText.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    const dayMatch = line.match(/^([A-Za-z]+):\s*(.*)$/);

    if (dayMatch && WEEKDAY_OPTIONS.includes(dayMatch[1] as Weekday)) {
      items.push({ day: dayMatch[1] as Weekday, text: dayMatch[2] || '' });
      return;
    }

    proseLines.push(rawLine);
  });

  return {
    items,
    body: proseLines.join('\n').trim(),
  };
}

function parseQueuedNewsletterDrafts(bodyText: string) {
  const sections = parseStructuredNewsletterBody(bodyText);

  if (!sections) {
    return null;
  }

  const metaLine = parseMetaLine(sections.get('meta-line') || '');
  const comingWeek = parseComingWeekBody(sections.get('coming-body') || '');

  return {
    templateDraft: {
      ...defaultTemplate,
      headline: sections.get('header-title') || defaultTemplate.headline,
      byline: metaLine.byline,
      issueDate: metaLine.issueDate,
      tagline: sections.get('tagline') || defaultTemplate.tagline,
      footerTagline: sections.get('footer-tagline') || defaultTemplate.footerTagline,
    },
    weeklyDraft: {
      ...defaultWeekly,
      mainTitle: sections.get('main-title') || defaultWeekly.mainTitle,
      openingLetter: sections.get('opening-body') || '',
      closingLine: parseClosingLine(sections.get('closing-signature') || ''),
      featuredStoryTitle: sections.get('featured-title') || defaultWeekly.featuredStoryTitle,
      featuredStorySubheading: sections.get('featured-subheading') || '',
      featuredStoryBody: sections.get('featured-body') || '',
      bookSpotlightTitle: sections.get('book-title') || defaultWeekly.bookSpotlightTitle,
      bookSpotlightSubheading: sections.get('book-subheading') || '',
      bookSpotlightBody: sections.get('book-body') || '',
      comingThisWeekTitle: sections.get('coming-title') || defaultWeekly.comingThisWeekTitle,
      comingThisWeekItems: comingWeek.items,
      comingThisWeekBody: comingWeek.body,
      affirmationTitle: sections.get('affirmation-title') || defaultWeekly.affirmationTitle,
      affirmationText: sections.get('affirmation-body') || '',
      bottomEncouragement: sections.get('bottom-encouragement') || defaultWeekly.bottomEncouragement,
      scheduledFor: defaultWeekly.scheduledFor,
      subject: defaultWeekly.subject,
    },
  };
}

function normalizeHeadingLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function looksLikePromotableHeading(value: string) {
  const collapsed = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!collapsed || collapsed.length > 160) {
    return false;
  }

  return !/[.!?]$/.test(collapsed);
}

function resolvePreviewSection(heading: string, subheading: string, body: string, genericLabel: string) {
  return buildStructuredSection(heading, subheading, body, genericLabel);
}

function SectionHeading({ stepLabel, children }: { stepLabel?: string; children: React.ReactNode }) {
  return (
    <div>
      {stepLabel ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c89b2d]">{stepLabel}</p> : null}
      <h3 className="text-[20px] font-extrabold leading-tight text-[#17182b] sm:text-[22px]">{children}</h3>
      <div className="mt-2 h-px w-52 bg-[#c89b2d]" />
    </div>
  );
}

function GoldRule() {
  return <div className="my-10 h-px w-full bg-[#d1aa45]" />;
}

function renderComingWeekList(items: ComingWeekItem[] = []) {
  const visibleItems = items.length
    ? items
    : [
        { day: 'Monday' as Weekday, text: 'Weekly item' },
        { day: 'Tuesday' as Weekday, text: 'Weekly item' },
        { day: 'Thursday' as Weekday, text: 'Weekly item' },
      ];

  return (
    <div className="space-y-1">
      {visibleItems.map((item) => (
        <p key={item.day}>
          <strong>{item.day}:</strong> {item.text || 'Add details for this day.'}
        </p>
      ))}
    </div>
  );
}

function renderClosingBlock(closingLine: string) {
  return (
    <div className="mt-6 space-y-5 text-[13px] leading-[1.5] tracking-[0.01em]">
      <p>{closingLine || defaultWeekly.closingLine}</p>
      <p><strong>Dr. Bree Charles</strong></p>
      <p>Transformational Speaker | U.S. Army Veteran | Author | Host of B3U</p>
      <p>Burn. Break. Become Unstoppable.</p>
      <p>Breaking Cycles. Building Legacies.</p>
    </div>
  );
}

function renderSectionBody(bodyText: string, emptyState: string, subheading?: string) {
  return (
    <>
      {subheading ? <p className="font-bold text-[#17182b]">{subheading}</p> : null}
      {bodyText ? paragraphize(bodyText) : <p className="text-slate-400">{emptyState}</p>}
    </>
  );
}

function renderLetterPreview(templateDraft: NewsletterTemplateDraft, weeklyDraft: WeeklyNewsletterDraft, adminEmbed = false) {
  const comingWeekItems = getComingWeekItems(weeklyDraft);
  const featuredSection = resolvePreviewSection(weeklyDraft.featuredStoryTitle || 'Featured Story', weeklyDraft.featuredStorySubheading, weeklyDraft.featuredStoryBody, 'Featured Story');
  const bookSection = resolvePreviewSection(weeklyDraft.bookSpotlightTitle || 'Book Spotlight', weeklyDraft.bookSpotlightSubheading, weeklyDraft.bookSpotlightBody, 'Book Spotlight');

  const outerClassName = adminEmbed
    ? 'mx-auto w-full max-w-[760px] overflow-hidden bg-white ring-1 ring-black/5 sm:max-w-[1140px] sm:shadow-2xl'
    : 'mx-auto max-w-[1140px] overflow-hidden bg-white shadow-2xl ring-1 ring-black/5';
  const previewHeaderClassName = adminEmbed
    ? 'border-b-[4px] border-[#d0ad4b] bg-[#17182b] px-[18px] py-6 text-white sm:px-[60px] sm:py-7'
    : 'border-b-[4px] border-[#d0ad4b] bg-[#17182b] px-9 py-7 text-white sm:px-[60px]';
  const previewHeaderGridClassName = adminEmbed
    ? 'grid grid-cols-[74px_1fr] items-start gap-4 sm:grid-cols-[110px_1fr] sm:gap-8'
    : 'grid grid-cols-[110px_1fr] items-start gap-8';
  const previewLogoClassName = adminEmbed
    ? 'h-[56px] w-[74px] object-contain sm:h-[68px] sm:w-[92px]'
    : 'h-[68px] w-[92px] object-contain';
  const previewTitleClassName = adminEmbed
    ? 'text-[26px] font-medium uppercase leading-none tracking-[0.04em] sm:text-[42px]'
    : 'text-[34px] font-medium uppercase leading-none tracking-[0.04em] sm:text-[42px]';
  const previewMainClassName = adminEmbed
    ? 'bg-white px-[18px] py-7 text-[#3d3d45] sm:px-[78px] sm:py-8'
    : 'bg-white px-14 py-8 text-[#3d3d45] sm:px-[78px]';
  const previewFooterClassName = adminEmbed
    ? 'bg-[#17182b] px-[18px] py-4 text-center text-[12px] font-semibold leading-5 text-white sm:px-[60px] sm:py-5'
    : 'bg-[#17182b] px-8 py-5 text-center text-[12px] font-semibold leading-5 text-white sm:px-[60px]';

  return (
    <div className={outerClassName}>
      <header className={previewHeaderClassName}>
        <div className={previewHeaderGridClassName}>
          <div className="pt-1">
            <Image
              src="/images/logos/B3U3D.png"
              alt="B3U logo"
              width={92}
              height={92}
              className={previewLogoClassName}
            />
          </div>
          <div className="text-right">
            <h2 className={previewTitleClassName}>{templateDraft.headline}</h2>
            <p className="mt-4 text-[14px] font-semibold text-[#d4a536]">
              {templateDraft.byline} <span className="text-white/70">|</span> {getTemplateDate(templateDraft)}
            </p>
          </div>
        </div>
      </header>

      <main className={previewMainClassName}>
        <p className="mb-10 text-center text-[18px] leading-7 text-[#d4a536]">{templateDraft.tagline}</p>

        <SectionHeading stepLabel="01. Opening letter">{weeklyDraft.mainTitle}</SectionHeading>

        <div className="mt-7 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {weeklyDraft.openingLetter ? paragraphize(weeklyDraft.openingLetter) : <p className="text-slate-400">Opening letter body will appear here.</p>}
        </div>

        {renderClosingBlock(weeklyDraft.closingLine)}

        <GoldRule />

        <SectionHeading stepLabel="02. Featured story">{featuredSection.heading}</SectionHeading>
        <div className="mt-6 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {renderSectionBody(featuredSection.body, 'Featured story body will appear here.', featuredSection.subheading)}
        </div>

        <GoldRule />

        <SectionHeading stepLabel="03. Book spotlight">{bookSection.heading}</SectionHeading>
        <div className="mt-6 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {renderSectionBody(bookSection.body, 'Book spotlight body will appear here.', bookSection.subheading)}
        </div>

        <GoldRule />

        <SectionHeading stepLabel="04. Coming next week">{weeklyDraft.comingThisWeekTitle || 'What’s Coming Next Week'}</SectionHeading>
        <div className="mt-6 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {renderComingWeekList(comingWeekItems)}
          {weeklyDraft.comingThisWeekBody ? paragraphize(weeklyDraft.comingThisWeekBody) : <p className="text-slate-400">Coming next week body will appear here.</p>}
        </div>

        <GoldRule />

        <SectionHeading stepLabel="05. Weekly affirmation">{weeklyDraft.affirmationTitle || 'THIS WEEK’S AFFIRMATION'}</SectionHeading>
        <div className="mt-6 text-center text-[14px] italic leading-7 text-[#c49124]">
          {weeklyDraft.affirmationText ? paragraphize(weeklyDraft.affirmationText) : <p>“Affirmation text will appear here.”</p>}
        </div>

        <GoldRule />
        <div>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c89b2d]">06. Closing encouragement</p>
          <p className="mt-3 text-center text-[14px] leading-6 text-[#4a4a52]">{weeklyDraft.bottomEncouragement}</p>
        </div>
      </main>

      <footer className={previewFooterClassName}>
        <p>{templateDraft.footerTagline}</p>
      </footer>
    </div>
  );
}

export default function NewsletterBuilder() {
  const router = useRouter();
  const embedMode = router.query.embed;
  const isAdminEmbed = embedMode === 'admin' || (Array.isArray(embedMode) && embedMode.includes('admin'));
  const [templateDraft, setTemplateDraft] = useState<NewsletterTemplateDraft>(defaultTemplate);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyNewsletterDraft>(defaultWeekly);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriberEmails, setSelectedSubscriberEmails] = useState<string[]>([]);
  const [newsletterQueue, setNewsletterQueue] = useState<NewsletterQueueItem[]>([]);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [editingNewsletterId, setEditingNewsletterId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'error'>('info');
  const [submitting, setSubmitting] = useState(false);
  const [subscriberSubmitting, setSubscriberSubmitting] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<SavedNewsletterDraft[]>([]);
  const [savedDraftsModalOpen, setSavedDraftsModalOpen] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  useEffect(() => {
    setSavedDrafts(readSavedDrafts());

    const savedTemplateDraft = readStoredDraft(TEMPLATE_STORAGE_KEY, defaultTemplate);
    setTemplateDraft({
      ...savedTemplateDraft,
      headline: savedTemplateDraft.headline === 'Burn, Break, Become Unstoppable' ? defaultTemplate.headline : savedTemplateDraft.headline,
      issueDate: savedTemplateDraft.issueDate || savedTemplateDraft.weekLabel || defaultTemplate.issueDate,
      footerTagline: savedTemplateDraft.footerTagline || defaultTemplate.footerTagline,
    });

    const savedWeeklyDraft = readStoredDraft(WEEKLY_STORAGE_KEY, defaultWeekly);
    savedWeeklyDraft.mainTitle = savedWeeklyDraft.mainTitle === 'Burn, Break, Become Unstoppable' ? defaultWeekly.mainTitle : savedWeeklyDraft.mainTitle;
    savedWeeklyDraft.comingThisWeekItems = normalizeComingWeekItems(savedWeeklyDraft.comingThisWeekItems, savedWeeklyDraft.comingThisWeekBody || '');
    savedWeeklyDraft.closingLine = savedWeeklyDraft.closingLine || savedWeeklyDraft.closingLetter?.split('\n').find((line) => line.trim()) || defaultWeekly.closingLine;

    if (typeof window !== 'undefined' && !window.localStorage.getItem(WEEKLY_STORAGE_KEY)) {
      const legacyDraft = window.localStorage.getItem(LEGACY_MONTHLY_STORAGE_KEY);
      if (legacyDraft) {
        try {
          const parsedLegacyDraft = JSON.parse(legacyDraft) as Partial<Record<string, string>>;
          setWeeklyDraft({
            ...savedWeeklyDraft,
            subject: parsedLegacyDraft.subject || savedWeeklyDraft.subject,
            mainTitle: parsedLegacyDraft.issueLabel || savedWeeklyDraft.mainTitle,
            openingLetter: parsedLegacyDraft.openingMessage || savedWeeklyDraft.openingLetter,
            featuredStoryTitle: parsedLegacyDraft.featureTitle || savedWeeklyDraft.featuredStoryTitle,
            featuredStorySubheading: savedWeeklyDraft.featuredStorySubheading,
            featuredStoryBody: parsedLegacyDraft.featureBody || savedWeeklyDraft.featuredStoryBody,
            comingThisWeekTitle: parsedLegacyDraft.updatesTitle || savedWeeklyDraft.comingThisWeekTitle,
            comingThisWeekItems: normalizeComingWeekItems(null, parsedLegacyDraft.updatesBody || ''),
            comingThisWeekBody: savedWeeklyDraft.comingThisWeekBody || '',
            affirmationText: parsedLegacyDraft.quote || savedWeeklyDraft.affirmationText,
            closingLine: parsedLegacyDraft.closingNote?.split('\n').find((line) => line.trim()) || savedWeeklyDraft.closingLine,
            scheduledFor: parsedLegacyDraft.scheduledFor || savedWeeklyDraft.scheduledFor,
          });
          return;
        } catch {
          // Ignore legacy data that cannot be parsed.
        }
      }
    }

    setWeeklyDraft(savedWeeklyDraft);
  }, []);

  useEffect(() => {
    saveStoredDraft(TEMPLATE_STORAGE_KEY, templateDraft);
  }, [templateDraft]);

  useEffect(() => {
    saveStoredDraft(WEEKLY_STORAGE_KEY, weeklyDraft);
  }, [weeklyDraft]);

  const refreshSubscribers = useCallback(async () => {
    const response = await fetch('/api/subscribers');

    if (response.status === 401) {
      await router.replace('/login');
      return [] as Subscriber[];
    }

    if (!response.ok) {
      throw new Error(`Subscribers API returned ${response.status}`);
    }

    const data = (await response.json()) as Subscriber[];
    setSubscribers(data ?? []);
    return data ?? [];
  }, [router]);

  const refreshNewsletterQueue = useCallback(async () => {
    const response = await fetch('/api/newsletters');

    if (response.status === 401) {
      await router.replace('/login');
      return [] as NewsletterQueueItem[];
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.details || body?.error || `Newsletter API returned ${response.status}`);
    }

    const data = (await response.json()) as NewsletterQueueItem[];
    setNewsletterQueue(data ?? []);
    return data ?? [];
  }, [router]);

  useEffect(() => {
    async function loadSubscribers() {
      try {
        await Promise.all([refreshSubscribers(), refreshNewsletterQueue()]);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Failed to load subscribers.');
        setNoticeTone('error');
      }
    }

    void loadSubscribers();
  }, [refreshSubscribers, refreshNewsletterQueue]);

  function updateTemplate<K extends keyof NewsletterTemplateDraft>(key: K, value: NewsletterTemplateDraft[K]) {
    setTemplateDraft((current) => ({ ...current, [key]: value }));
  }

  function updateWeekly<K extends keyof WeeklyNewsletterDraft>(key: K, value: WeeklyNewsletterDraft[K]) {
    setWeeklyDraft((current) => ({ ...current, [key]: value }));
  }

  function handleClearSubscriberSelection() {
    setSelectedSubscriberEmails([]);
  }

  function handleToggleSubscriber(email: string) {
    setSelectedSubscriberEmails((current) => (
      current.includes(email)
        ? current.filter((item) => item !== email)
        : [...current, email]
    ));
  }

  function handleToggleAllSubscribers(checked: boolean) {
    setSelectedSubscriberEmails(checked ? subscribers.map((subscriber) => subscriber.email) : []);
  }

  function handleComingWeekDayToggle(day: Weekday) {
    setWeeklyDraft((current) => {
      const currentItems = getComingWeekItems(current);
      const exists = currentItems.some((item) => item.day === day);
      const comingThisWeekItems = exists
        ? currentItems.filter((item) => item.day !== day)
        : [...currentItems, { day, text: '' }].sort((first, second) => WEEKDAY_OPTIONS.indexOf(first.day) - WEEKDAY_OPTIONS.indexOf(second.day));

      return { ...current, comingThisWeekItems };
    });
  }

  function updateComingWeekDayText(day: Weekday, text: string) {
    setWeeklyDraft((current) => ({
      ...current,
      comingThisWeekItems: getComingWeekItems(current).map((item) => (item.day === day ? { ...item, text } : item)),
    }));
  }

  async function handleAddSubscriber() {
    const email = newSubscriberEmail.trim();

    if (!email) {
      setNotice('Enter an email address before adding a subscriber.');
      setNoticeTone('error');
      return;
    }

    setSubscriberSubmitting(true);
    setNotice('');

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.details || body?.error || `Subscribers API returned ${response.status}`);
      }

      const updatedSubscribers = await refreshSubscribers();
      const matchingSubscriber = updatedSubscribers.find((subscriber) => subscriber.email.toLowerCase() === email.toLowerCase());

      if (matchingSubscriber) {
        setSelectedSubscriberEmails((current) => (current.includes(matchingSubscriber.email) ? current : [...current, matchingSubscriber.email]));
      }

      setNewSubscriberEmail('');
      setShowAddSubscriber(false);
      setNotice('Subscriber added and selected.');
      setNoticeTone('success');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to add subscriber.');
      setNoticeTone('error');
    } finally {
      setSubscriberSubmitting(false);
    }
  }

  function handleEditQueuedNewsletter(item: NewsletterQueueItem) {
    const parsed = parseQueuedNewsletterDrafts(item.bodyText);

    if (parsed) {
      setTemplateDraft(parsed.templateDraft);
      setWeeklyDraft({
        ...parsed.weeklyDraft,
        subject: item.subject,
        scheduledFor: toDateTimeInputFromUtc(item.scheduledFor),
      });
      setNotice(`Editing queued newsletter #${item.id}.`);
      setNoticeTone('info');
    } else {
      setWeeklyDraft((current) => ({
        ...current,
        subject: item.subject,
        scheduledFor: toDateTimeInputFromUtc(item.scheduledFor),
      }));
      setNotice('Loaded the queued newsletter schedule and recipients, but this older item could not fully populate the structured builder fields.');
      setNoticeTone('info');
    }

    setEditingNewsletterId(item.id);
    setSelectedSubscriberEmails(item.recipientEmails);
    setQueueModalOpen(false);
  }

  function handleCancelEditing() {
    setEditingNewsletterId(null);
    setNotice('Stopped editing the queued newsletter.');
    setNoticeTone('info');
  }

  async function handleDeleteQueuedNewsletter(item: NewsletterQueueItem) {
    const confirmed = window.confirm(`Delete newsletter "${item.subject}" from the queue?`);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/newsletters?id=${encodeURIComponent(String(item.id))}`, {
        method: 'DELETE',
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.error || `Newsletter API returned ${response.status}`);
      }

      if (editingNewsletterId === item.id) {
        setEditingNewsletterId(null);
      }

      setNotice('Newsletter deleted from the queue.');
      setNoticeTone('success');
      await refreshNewsletterQueue();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to delete queued newsletter.');
      setNoticeTone('error');
    }
  }

  async function handleOpenQueueModal() {
    setQueueModalOpen(true);
    setQueueLoading(true);

    try {
      await refreshNewsletterQueue();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to load queued newsletters.');
      setNoticeTone('error');
    } finally {
      setQueueLoading(false);
    }
  }

  function handleSaveDraft() {
    const baseName = buildSavedDraftName(weeklyDraft.subject);
    const draftId = activeDraftId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const nextDraft: SavedNewsletterDraft = {
      id: draftId,
      name: baseName,
      subject: weeklyDraft.subject.trim() || baseName,
      createdAt: activeDraftId ? (savedDrafts.find((draft) => draft.id === activeDraftId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateDraft: { ...templateDraft },
      weeklyDraft: { ...weeklyDraft },
    };

    const nextDrafts = [nextDraft, ...savedDrafts.filter((draft) => draft.id !== draftId)].slice(0, 12);
    setSavedDrafts(nextDrafts);
    writeSavedDrafts(nextDrafts);
    setActiveDraftId(draftId);
    setNotice(`Draft saved as "${nextDraft.name}".`);
    setNoticeTone('success');
  }

  function handleLoadDraft(draft: SavedNewsletterDraft) {
    setTemplateDraft({ ...draft.templateDraft });
    setWeeklyDraft({ ...draft.weeklyDraft });
    setActiveDraftId(draft.id);
    setSavedDraftsModalOpen(false);
    setNotice(`Loaded saved draft "${draft.name}".`);
    setNoticeTone('success');
  }

  function handleDeleteSavedDraft(draftId: string) {
    const nextDrafts = savedDrafts.filter((draft) => draft.id !== draftId);
    setSavedDrafts(nextDrafts);
    writeSavedDrafts(nextDrafts);

    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }

    setNotice('Saved draft deleted.');
    setNoticeTone('info');
  }

  async function queueNewsletter(scheduledForIso: string, sendImmediately = false) {
    if (!selectedSubscriberEmails.length) {
      setNotice('Select at least one subscriber first.');
      setNoticeTone('error');
      return;
    }

    setSubmitting(true);
    setNotice('');

    try {
      const response = await fetch('/api/newsletters', {
        method: editingNewsletterId && !sendImmediately ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNewsletterId,
          subject: weeklyDraft.subject.trim(),
          bodyText: buildLetterEmailHtml(templateDraft, weeklyDraft),
          scheduledFor: scheduledForIso,
          recipientEmails: selectedSubscriberEmails,
        }),
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        await router.replace('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(body?.error || `Newsletter API returned ${response.status}`);
      }

      if (sendImmediately) {
        const processResponse = await fetch('/api/newsletters/process', { method: 'POST' });
        const processBody = await processResponse.json().catch(() => null);

        if (!processResponse.ok) {
          throw new Error(processBody?.details || processBody?.error || `Newsletter processor returned ${processResponse.status}`);
        }

        setNotice(`Newsletter sent now. ${processBody?.sent ?? 0} sent, ${processBody?.failed ?? 0} failed.`);
      } else {
        setNotice(editingNewsletterId ? 'Queued newsletter updated successfully.' : 'Newsletter scheduled successfully.');
      }

      setNoticeTone('success');
      if (editingNewsletterId && !sendImmediately) {
        setEditingNewsletterId(null);
      }
      await refreshNewsletterQueue();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to send or schedule newsletter.');
      setNoticeTone('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScheduleNewsletter() {
    const scheduledFor = toUtcIsoStringFromDateTimeInput(weeklyDraft.scheduledFor);

    if (!scheduledFor) {
      setNotice('Choose a valid send date and time.');
      setNoticeTone('error');
      return;
    }

    await queueNewsletter(scheduledFor, false);
  }

  async function handleSendNewsletterNow() {
    await queueNewsletter(new Date().toISOString(), true);
  }

  const comingWeekItems = getComingWeekItems(weeklyDraft);
  const allSubscribersSelected = subscribers.length > 0 && selectedSubscriberEmails.length === subscribers.length;
  const sortedNewsletterQueue = [...newsletterQueue].sort((first, second) => new Date(first.scheduledFor).getTime() - new Date(second.scheduledFor).getTime());
  const groupedNewsletterQueue = sortedNewsletterQueue.reduce<Array<{ dayLabel: string; items: NewsletterQueueItem[] }>>((groups, item) => {
    const parsedDate = new Date(item.scheduledFor);
    const dayLabel = Number.isNaN(parsedDate.getTime())
      ? 'Unknown date'
      : parsedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const existingGroup = groups.find((group) => group.dayLabel === dayLabel);

    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }

    return [...groups, { dayLabel, items: [item] }];
  }, []);

  return (
    <main className={`min-h-screen bg-slate-100 py-6 text-slate-950 sm:px-8 lg:px-12 ${isAdminEmbed ? 'px-[18px]' : 'px-6'}`}>
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className={`rounded-3xl bg-slate-950 px-5 text-white shadow-sm sm:px-6 ${isAdminEmbed ? 'py-3 sm:py-4' : 'py-4'}`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(500px,auto)] lg:items-center">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200">B3U Admin</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Weekly Newsletter Builder</h1>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-300">Build the Take Back Weekly letter with ease.</p>
            </div>

            <div className="w-full max-w-[680px] justify-self-end rounded-2xl border border-white/10 bg-white/10 p-3 shadow-inner">
              <div className={`grid gap-2 ${isAdminEmbed ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
                <label className="block min-w-0">
                  <span className="sr-only">Send date and time</span>
                  <input
                    required
                    type="datetime-local"
                    title="Send date and time"
                    className="h-9 w-full rounded-lg border border-white/20 bg-white px-2 text-xs text-slate-950 shadow-sm outline-none transition focus:border-brandOrange focus:ring-2 focus:ring-brandOrange/30"
                    value={weeklyDraft.scheduledFor}
                    onChange={(event) => updateWeekly('scheduledFor', event.target.value)}
                  />
                </label>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddSubscriber((current) => !current)}
                  title="Add subscriber"
                  aria-label="Add subscriber"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true">+</span><span className="hidden md:inline">Add</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSubscriberSelection}
                  title="Clear subscribers"
                  aria-label="Clear selected subscribers"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true">x</span><span className="hidden md:inline">Clear</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenQueueModal()}
                  title="Scheduled list"
                  aria-label="Open scheduled newsletters list"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true">≡</span><span className="hidden md:inline">Scheduled list</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  title="Save draft"
                  aria-label="Save newsletter draft"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true">💾</span><span className="hidden md:inline">Save draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavedDraftsModalOpen(true)}
                  title="Saved drafts"
                  aria-label="Open saved drafts"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true">⌂</span><span className="hidden md:inline">Drafts</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendNewsletterNow}
                  disabled={submitting}
                  title="Send now"
                  aria-label="Send newsletter now"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-brandOrange px-2.5 text-xs font-semibold text-white transition hover:bg-brandOrange-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span aria-hidden="true">→</span><span className="hidden md:inline">Send</span>
                </button>
                <button
                  type="button"
                  onClick={handleScheduleNewsletter}
                  disabled={submitting}
                  title={editingNewsletterId ? 'Save queued newsletter' : 'Schedule newsletter'}
                  aria-label={editingNewsletterId ? 'Save queued newsletter' : 'Schedule newsletter'}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-brandBlue px-2.5 text-xs font-semibold text-white transition hover:bg-brandBlue-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span aria-hidden="true">{editingNewsletterId ? '✓' : '◷'}</span><span className="hidden md:inline">{editingNewsletterId ? 'Save' : 'Schedule'}</span>
                </button>
                {editingNewsletterId ? (
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                  >
                    <span aria-hidden="true">↺</span><span className="hidden md:inline">Cancel edit</span>
                  </button>
                ) : null}
              </div>

              {showAddSubscriber ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="email"
                    value={newSubscriberEmail}
                    onChange={(event) => setNewSubscriberEmail(event.target.value)}
                    placeholder="newsubscriber@email.com"
                    className="h-9 min-w-0 rounded-lg border border-white/20 bg-white px-2 text-xs text-slate-950 shadow-sm outline-none transition focus:border-brandOrange focus:ring-2 focus:ring-brandOrange/30"
                  />
                  <button type="button" onClick={handleAddSubscriber} disabled={subscriberSubmitting} className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70">
                    {subscriberSubmitting ? 'Adding...' : 'Add and select'}
                  </button>
                </div>
              ) : null}

              <div className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <input
                      type="checkbox"
                      checked={allSubscribersSelected}
                      onChange={(event) => handleToggleAllSubscribers(event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 text-brandOrange focus:ring-brandOrange"
                    />
                    <span>Select all subscribers</span>
                  </label>
                  <span className="text-xs text-slate-200">{selectedSubscriberEmails.length} of {subscribers.length} selected</span>
                </div>

                <div className="mt-3 max-h-48 overflow-y-auto pr-1">
                  {subscribers.length ? (
                    <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                      {subscribers.map((subscriber) => {
                        const checked = selectedSubscriberEmails.includes(subscriber.email);

                        return (
                          <li key={subscriber.id}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-white transition hover:bg-white/10">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleSubscriber(subscriber.email)}
                                className="h-4 w-4 rounded border-white/30 text-brandOrange focus:ring-brandOrange"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{subscriber.email}</span>
                                <span className="block text-xs text-slate-300">Joined {new Date(subscriber.created_at).toLocaleString()}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-200">No subscribers are available yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {notice ? (
          <div className={`rounded-3xl border px-5 py-4 text-sm ${noticeTone === 'success' ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy' : noticeTone === 'error' ? 'border-brandOrange/25 bg-brandOrange/10 text-navy' : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'}`}>
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 2xl:grid-cols-[0.72fr_1.28fr]">
          <section className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">Newsletter Content</h2>
            <p className="mt-2 text-sm text-gray-600">The editor now follows the same top-to-bottom order as the letter preview.</p>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">Header setup</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Before the reader opens the letter</h3>
                <p className="mt-1 text-sm text-gray-600">These fields control the inbox subject line and the top masthead of the newsletter.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Inbox subject line</span>
                    <input required maxLength={160} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.subject} onChange={(event) => updateWeekly('subject', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Header title in the letter</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.headline} onChange={(event) => updateTemplate('headline', event.target.value)} />
                  </label>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Issue date line</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={getTemplateDate(templateDraft)} onChange={(event) => updateTemplate('issueDate', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Byline under the title</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.byline} onChange={(event) => updateTemplate('byline', event.target.value)} />
                  </label>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Gold message line below the header</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.tagline} onChange={(event) => updateTemplate('tagline', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Footer website and brand line</span>
                    <textarea className="min-h-[80px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.footerTagline} onChange={(event) => updateTemplate('footerTagline', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">01. Opening letter</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Main welcome section</h3>
                <p className="mt-1 text-sm text-gray-600">This is the first section readers see after the masthead.</p>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section heading shown in the letter</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.mainTitle} onChange={(event) => updateWeekly('mainTitle', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Opening letter body</span>
                    <textarea required className="min-h-[240px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.openingLetter} onChange={(event) => updateWeekly('openingLetter', event.target.value)} placeholder="Paste the full opening letter here. Use blank lines between paragraphs." />
                  </label>
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-700">Sign-off line before the built-in signature</span>
                      <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.closingLine} onChange={(event) => updateWeekly('closingLine', event.target.value)} />
                    </label>
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-7 text-gray-700">
                      <p><strong>Built-in signature block:</strong></p>
                      <p>Dr. Bree Charles</p>
                      <p>Transformational Speaker | U.S. Army Veteran | Author | Host of B3U</p>
                      <p>Burn. Break. Become Unstoppable.</p>
                      <p>Breaking Cycles. Building Legacies.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">02. Featured story</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Story spotlight section</h3>
                <p className="mt-1 text-sm text-gray-600">This appears right after the opening letter and signature.</p>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section heading</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.featuredStoryTitle} onChange={(event) => updateWeekly('featuredStoryTitle', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section sub heading</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.featuredStorySubheading} onChange={(event) => updateWeekly('featuredStorySubheading', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section text</span>
                    <textarea className="min-h-[170px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.featuredStoryBody} onChange={(event) => updateWeekly('featuredStoryBody', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">03. Book spotlight</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Book highlight section</h3>
                <p className="mt-1 text-sm text-gray-600">This section follows the featured story in the final letter.</p>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section heading</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bookSpotlightTitle} onChange={(event) => updateWeekly('bookSpotlightTitle', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section sub heading</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bookSpotlightSubheading} onChange={(event) => updateWeekly('bookSpotlightSubheading', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section text</span>
                    <textarea className="min-h-[150px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bookSpotlightBody} onChange={(event) => updateWeekly('bookSpotlightBody', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">04. Coming next week</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Upcoming events and schedule</h3>
                <p className="mt-1 text-sm text-gray-600">The day-by-day list and supporting paragraph appear together in this section.</p>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section heading in the letter</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.comingThisWeekTitle} onChange={(event) => updateWeekly('comingThisWeekTitle', event.target.value)} />
                  </label>
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                    <span className="mb-3 block text-sm font-medium text-gray-700">Choose which weekday entries appear in the list</span>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const selected = comingWeekItems.some((item) => item.day === day);

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleComingWeekDayToggle(day)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selected ? 'border-brandBlue bg-brandBlue text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-brandBlue hover:text-brandBlue'}`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 space-y-3">
                      {comingWeekItems.length ? (
                        comingWeekItems.map((item) => (
                          <label key={item.day} className="block rounded-2xl border border-gray-200 bg-white p-4">
                            <span className="mb-2 block text-sm font-bold text-gray-900">{item.day} list item</span>
                            <textarea
                              className="min-h-[80px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                              value={item.text}
                              onChange={(event) => updateComingWeekDayText(item.day, event.target.value)}
                              placeholder={`Add ${item.day}'s details here.`}
                            />
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Select one or more days above to add them to the weekly list.</p>
                      )}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Supporting paragraph below the day list</span>
                    <textarea className="min-h-[140px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.comingThisWeekBody} onChange={(event) => updateWeekly('comingThisWeekBody', event.target.value)} placeholder="Add the paragraph section that follows the day-by-day list." />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">05. Weekly affirmation</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Affirmation callout</h3>
                <p className="mt-1 text-sm text-gray-600">This section sits near the end of the letter and leads into the final encouragement.</p>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Section heading in the letter</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.affirmationTitle} onChange={(event) => updateWeekly('affirmationTitle', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Affirmation text</span>
                    <textarea className="min-h-[120px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.affirmationText} onChange={(event) => updateWeekly('affirmationText', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandBlue">06. Closing encouragement</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Final line at the bottom of the letter</h3>
                <p className="mt-1 text-sm text-gray-600">Use this for the final encouragement that appears above the footer.</p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Bottom encouragement line</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bottomEncouragement} onChange={(event) => updateWeekly('bottomEncouragement', event.target.value)} />
                </label>
              </div>
            </div>
          </section>

          <section className="min-w-0 2xl:sticky 2xl:top-6 2xl:self-start">
            <h2 className="text-xl font-semibold text-gray-900">Letter Preview</h2>
            {isAdminEmbed ? (
              <div className="mt-5 sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-[#d7e5f0] sm:bg-slate-100 sm:p-4 sm:shadow-sm">
                {renderLetterPreview(templateDraft, weeklyDraft, true)}
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-[2rem] border border-[#d7e5f0] bg-slate-100 p-3 sm:p-4 shadow-sm">
                {renderLetterPreview(templateDraft, weeklyDraft)}
              </div>
            )}
          </section>
        </div>

        {savedDraftsModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Saved drafts</h2>
                  <p className="mt-1 text-sm text-gray-500">Load or delete your stored newsletter drafts.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSavedDraftsModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {!savedDrafts.length ? (
                  <p className="text-sm text-gray-500">No saved drafts yet. Save the current newsletter to keep a working copy.</p>
                ) : (
                  <div className="space-y-3">
                    {savedDrafts.map((draft) => (
                      <div key={draft.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-gray-900">{draft.name}</p>
                          <p className="mt-1 text-sm text-gray-600">{draft.subject || 'Untitled newsletter'} · {new Date(draft.updatedAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleLoadDraft(draft)}
                            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedDraft(draft.id)}
                            className="rounded-full border border-brandOrange/20 bg-brandOrange/10 px-3 py-1 text-xs font-semibold text-navy transition hover:bg-brandOrange/15"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {queueModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Scheduled newsletters</h2>
                  <p className="mt-1 text-sm text-gray-500">Review queued items by send date and time.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQueueModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {queueLoading ? <p className="text-sm text-gray-500">Loading scheduled newsletters...</p> : null}
                {!queueLoading && !groupedNewsletterQueue.length ? <p className="text-sm text-gray-500">No queued newsletters are scheduled yet.</p> : null}
                {!queueLoading ? (
                  <div className="space-y-6">
                    {groupedNewsletterQueue.map((group) => (
                      <div key={group.dayLabel} className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{group.dayLabel}</h3>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-gray-900">{item.subject}</p>
                                <p className="mt-1 text-sm text-gray-600">{formatDateTimeDisplay(item.scheduledFor)}</p>
                                <p className="mt-1 text-xs text-gray-500">{item.recipientCount} recipient{item.recipientCount === 1 ? '' : 's'} · {item.status}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleEditQueuedNewsletter(item)}
                                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteQueuedNewsletter(item)}
                                  className="rounded-full border border-brandOrange/20 bg-brandOrange/10 px-3 py-1 text-xs font-semibold text-navy transition hover:bg-brandOrange/15"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
