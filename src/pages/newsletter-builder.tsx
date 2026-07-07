import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
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
  featuredStoryBody: string;
  bookSpotlightTitle: string;
  bookSpotlightBody: string;
  comingThisWeekTitle: string;
  comingThisWeekBody: string;
  comingThisWeekItems?: ComingWeekItem[];
  affirmationTitle: string;
  affirmationText: string;
  bottomEncouragement: string;
  scheduledFor: string;
};

const TEMPLATE_STORAGE_KEY = 'b3u-newsletter-template-draft';
const WEEKLY_STORAGE_KEY = 'b3u-weekly-newsletter-draft';
const LEGACY_MONTHLY_STORAGE_KEY = 'b3u-monthly-newsletter-draft';
const WEEKDAY_OPTIONS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  featuredStoryBody: '',
  bookSpotlightTitle: 'Book Spotlight',
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

function buildNewsletterBody(template: NewsletterTemplateDraft, weekly: WeeklyNewsletterDraft) {
  const comingWeekBody = formatComingWeekItems(getComingWeekItems(weekly));
  const sections = [
    template.headline,
    `${template.byline} | ${getTemplateDate(template)}`,
    template.tagline,
    weekly.mainTitle,
    weekly.openingLetter,
    formatClosingBlock(weekly.closingLine),
    weekly.featuredStoryTitle ? `${weekly.featuredStoryTitle}\n${weekly.featuredStoryBody}` : weekly.featuredStoryBody,
    weekly.bookSpotlightTitle ? `${weekly.bookSpotlightTitle}\n${weekly.bookSpotlightBody}` : weekly.bookSpotlightBody,
    weekly.comingThisWeekTitle ? `${weekly.comingThisWeekTitle}\n${comingWeekBody}\n\n${weekly.comingThisWeekBody}` : `${comingWeekBody}\n\n${weekly.comingThisWeekBody}`,
    weekly.affirmationTitle ? `${weekly.affirmationTitle}\n${weekly.affirmationText}` : weekly.affirmationText,
    weekly.bottomEncouragement,
    template.footerTagline,
  ];

  return sections.map((section) => section.trim()).filter(Boolean).join('\n\n');
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
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

function renderLetterPreview(templateDraft: NewsletterTemplateDraft, weeklyDraft: WeeklyNewsletterDraft) {
  const comingWeekItems = getComingWeekItems(weeklyDraft);

  return (
    <div className="mx-auto max-w-[1140px] overflow-hidden bg-white shadow-2xl ring-1 ring-black/5">
      <header className="border-b-[4px] border-[#d0ad4b] bg-[#17182b] px-9 py-7 text-white sm:px-[60px]">
        <div className="grid grid-cols-[110px_1fr] items-start gap-8">
          <div className="pt-1">
            <Image
              src="/images/logos/B3U3D.png"
              alt="B3U logo"
              width={92}
              height={92}
              className="h-[68px] w-[92px] object-contain"
            />
          </div>
          <div className="text-right">
            <h2 className="text-[34px] font-medium uppercase leading-none tracking-[0.04em] sm:text-[42px]">{templateDraft.headline}</h2>
            <p className="mt-4 text-[14px] font-semibold text-[#d4a536]">
              {templateDraft.byline} <span className="text-white/70">|</span> {getTemplateDate(templateDraft)}
            </p>
          </div>
        </div>
      </header>

      <main className="bg-white px-14 py-8 text-[#3d3d45] sm:px-[78px]">
        <p className="mb-10 text-center text-[18px] leading-7 text-[#d4a536]">{templateDraft.tagline}</p>

        <SectionHeading>{weeklyDraft.mainTitle}</SectionHeading>

        <div className="mt-7 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {weeklyDraft.openingLetter ? paragraphize(weeklyDraft.openingLetter) : <p className="text-slate-400">Opening letter body will appear here.</p>}
        </div>

        {renderClosingBlock(weeklyDraft.closingLine)}

        <GoldRule />

        <SectionHeading>{weeklyDraft.featuredStoryTitle || 'Featured Story'}</SectionHeading>
        <div className="mt-6 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {weeklyDraft.featuredStoryBody ? paragraphize(weeklyDraft.featuredStoryBody) : <p className="text-slate-400">Featured story body will appear here.</p>}
        </div>

        <GoldRule />

        <SectionHeading>{weeklyDraft.bookSpotlightTitle || 'Book Spotlight'}</SectionHeading>
        <div className="mt-6 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {weeklyDraft.bookSpotlightBody ? paragraphize(weeklyDraft.bookSpotlightBody) : <p className="text-slate-400">Book spotlight body will appear here.</p>}
        </div>

        <GoldRule />

        <SectionHeading>{weeklyDraft.comingThisWeekTitle || 'What’s Coming Next Week'}</SectionHeading>
        <div className="mt-6 space-y-5 text-[14px] leading-[1.55] tracking-[0.01em]">
          {renderComingWeekList(comingWeekItems)}
          {weeklyDraft.comingThisWeekBody ? paragraphize(weeklyDraft.comingThisWeekBody) : <p className="text-slate-400">Coming next week body will appear here.</p>}
        </div>

        <GoldRule />

        <SectionHeading>{weeklyDraft.affirmationTitle || 'THIS WEEK’S AFFIRMATION'}</SectionHeading>
        <div className="mt-6 text-center text-[14px] italic leading-7 text-[#c49124]">
          {weeklyDraft.affirmationText ? paragraphize(weeklyDraft.affirmationText) : <p>“Affirmation text will appear here.”</p>}
        </div>

        <GoldRule />
        <p className="text-center text-[14px] leading-6 text-[#4a4a52]">{weeklyDraft.bottomEncouragement}</p>
      </main>

      <footer className="bg-[#17182b] px-8 py-5 text-center text-[12px] font-semibold leading-5 text-white sm:px-[60px]">
        <p>{templateDraft.footerTagline}</p>
      </footer>
    </div>
  );
}

export default function NewsletterBuilder() {
  const router = useRouter();
  const [templateDraft, setTemplateDraft] = useState<NewsletterTemplateDraft>(defaultTemplate);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyNewsletterDraft>(defaultWeekly);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriberEmails, setSelectedSubscriberEmails] = useState<string[]>([]);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subscriberSubmitting, setSubscriberSubmitting] = useState(false);

  useEffect(() => {
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

  async function refreshSubscribers() {
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
  }

  useEffect(() => {
    async function loadSubscribers() {
      try {
        await refreshSubscribers();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Failed to load subscribers.');
        setNoticeTone('error');
      } finally {
        setLoading(false);
      }
    }

    void loadSubscribers();
  }, []);

  const bodyPreview = useMemo(() => buildNewsletterBody(templateDraft, weeklyDraft), [templateDraft, weeklyDraft]);

  function updateTemplate<K extends keyof NewsletterTemplateDraft>(key: K, value: NewsletterTemplateDraft[K]) {
    setTemplateDraft((current) => ({ ...current, [key]: value }));
  }

  function updateWeekly<K extends keyof WeeklyNewsletterDraft>(key: K, value: WeeklyNewsletterDraft[K]) {
    setWeeklyDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubscriberDropdownChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const email = event.target.value;

    if (!email) {
      return;
    }

    setSelectedSubscriberEmails((current) => (current.includes(email) ? current : [...current, email]));
    event.target.value = '';
  }

  function handleClearSubscriberSelection() {
    setSelectedSubscriberEmails([]);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: weeklyDraft.subject.trim(),
          bodyText: bodyPreview,
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
        setNotice('Newsletter scheduled successfully.');
      }

      setNoticeTone('success');
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

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-6 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-sm sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(500px,auto)] lg:items-center">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200">B3U Admin</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Weekly Newsletter Builder</h1>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-300">Build the Take Back Weekly letter with ease.</p>
            </div>

            <div className="w-full max-w-[680px] justify-self-end rounded-2xl border border-white/10 bg-white/10 p-3 shadow-inner">
              <div className="grid grid-cols-2 gap-2">
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

                <label className="block min-w-0">
                  <span className="sr-only">Subscribers</span>
                  <select
                    defaultValue=""
                    onChange={handleSubscriberDropdownChange}
                    title="Subscribers"
                    className="h-9 w-full rounded-lg border border-white/20 bg-white px-2 text-xs text-slate-950 shadow-sm outline-none transition focus:border-brandOrange focus:ring-2 focus:ring-brandOrange/30"
                  >
                    <option value="">{loading ? 'Loading subscribers...' : selectedSubscriberEmails.length ? `${selectedSubscriberEmails.length} selected - add another` : 'Select subscriber'}</option>
                    {!loading && !subscribers.length ? <option value="" disabled>No subscribers available</option> : null}
                    {subscribers.map((subscriber) => (
                      <option key={subscriber.id} value={subscriber.email}>{subscriber.email}</option>
                    ))}
                  </select>
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
                  title="Schedule newsletter"
                  aria-label="Schedule newsletter"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-brandBlue px-2.5 text-xs font-semibold text-white transition hover:bg-brandBlue-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span aria-hidden="true">◷</span><span className="hidden md:inline">Schedule</span>
                </button>
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
            </div>
          </div>
        </div>

        {notice ? (
          <div className={`rounded-3xl border px-5 py-4 text-sm ${noticeTone === 'success' ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy' : noticeTone === 'error' ? 'border-brandOrange/25 bg-brandOrange/10 text-navy' : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'}`}>
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 2xl:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Newsletter Content</h2>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Newsletter template title</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.headline} onChange={(event) => updateTemplate('headline', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Date</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={getTemplateDate(templateDraft)} onChange={(event) => updateTemplate('issueDate', event.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Byline</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.byline} onChange={(event) => updateTemplate('byline', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Email subject</span>
                  <input required maxLength={160} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.subject} onChange={(event) => updateWeekly('subject', event.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Gold tagline</span>
                <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.tagline} onChange={(event) => updateTemplate('tagline', event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Opening letter title</span>
                <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.mainTitle} onChange={(event) => updateWeekly('mainTitle', event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Opening letter body</span>
                <textarea required className="min-h-[240px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.openingLetter} onChange={(event) => updateWeekly('openingLetter', event.target.value)} placeholder="Paste the full opening letter here. Use blank lines between paragraphs." />
              </label>
              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Closing line</span>
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Featured story heading</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.featuredStoryTitle} onChange={(event) => updateWeekly('featuredStoryTitle', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Book spotlight heading</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bookSpotlightTitle} onChange={(event) => updateWeekly('bookSpotlightTitle', event.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Featured story body</span>
                <textarea className="min-h-[170px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.featuredStoryBody} onChange={(event) => updateWeekly('featuredStoryBody', event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Book spotlight body</span>
                <textarea className="min-h-[150px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bookSpotlightBody} onChange={(event) => updateWeekly('bookSpotlightBody', event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Coming next week heading</span>
                <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.comingThisWeekTitle} onChange={(event) => updateWeekly('comingThisWeekTitle', event.target.value)} />
              </label>
              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <span className="mb-3 block text-sm font-medium text-gray-700">Select days to include</span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const comingWeekItems = getComingWeekItems(weeklyDraft);
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
                  {getComingWeekItems(weeklyDraft).length ? (
                    getComingWeekItems(weeklyDraft).map((item) => (
                      <label key={item.day} className="block rounded-2xl border border-gray-200 bg-white p-4">
                        <span className="mb-2 block text-sm font-bold text-gray-900">{item.day}</span>
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
                <span className="mb-2 block text-sm font-medium text-gray-700">Coming next week body</span>
                <textarea className="min-h-[140px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.comingThisWeekBody} onChange={(event) => updateWeekly('comingThisWeekBody', event.target.value)} placeholder="Add the paragraph section that follows the day-by-day list." />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Affirmation heading</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.affirmationTitle} onChange={(event) => updateWeekly('affirmationTitle', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Bottom encouragement</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.bottomEncouragement} onChange={(event) => updateWeekly('bottomEncouragement', event.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Affirmation text</span>
                <textarea className="min-h-[120px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.affirmationText} onChange={(event) => updateWeekly('affirmationText', event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Footer website/tagline line</span>
                <textarea className="min-h-[80px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.footerTagline} onChange={(event) => updateTemplate('footerTagline', event.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Letter Preview</h2>
            <div className="mt-5 overflow-hidden rounded-[2rem] border border-[#d7e5f0] bg-slate-100 p-4 shadow-sm">
              {renderLetterPreview(templateDraft, weeklyDraft)}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
