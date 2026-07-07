import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

type BuilderTab = 'template' | 'monthly';
type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

type Subscriber = {
  id: number;
  email: string;
  created_at: string;
};

type NewsletterTemplateDraft = {
  templateName: string;
  eyebrow: string;
  headline: string;
  byline: string;
  weekLabel: string;
  tagline: string;
  footerAddress?: string;
  footerTagline: string;
  backgroundDataUrl: string;
  backgroundFileName: string;
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
  eyebrow: 'THE TAKE BACK WEEKLY',
  headline: 'THE TAKE BACK WEEKLY',
  byline: 'By Dr. Bree Charles',
  weekLabel: 'Week of July 6, 2026',
  tagline: 'Breaking Cycles. Building Legacies.',
  footerTagline: 'www.b3unstoppable.net | B3U — Burn. Break. Become Unstoppable.',
  backgroundDataUrl: '',
  backgroundFileName: '',
};

const defaultWeekly: WeeklyNewsletterDraft = {
  subject: 'The Take Back Weekly:',
  mainTitle: 'B3U Returns Tonight, The Big Take Back: What We’re Leaving Behind',
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
    `${template.byline} | ${template.weekLabel}`,
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
      <h3 className="text-[19px] font-extrabold leading-tight text-[#17182b] sm:text-[20px]">{children}</h3>
      <div className="mt-2 h-px w-40 bg-[#c89b2d]" />
    </div>
  );
}

function GoldRule() {
  return <div className="my-8 h-px w-full bg-[#d1aa45]" />;
}

function renderComingWeekList(items: ComingWeekItem[] = [], isBlank = false) {
  const visibleItems = isBlank || !items.length
    ? [
        { day: 'Monday' as Weekday, text: 'Weekly item' },
        { day: 'Tuesday' as Weekday, text: 'Weekly item' },
        { day: 'Thursday' as Weekday, text: 'Weekly item' },
      ]
    : items;

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
    <div className="mt-5 space-y-5 text-[13px] leading-[1.45] tracking-[0.01em]">
      <p>{closingLine || defaultWeekly.closingLine}</p>
      <p><strong>Dr. Bree Charles</strong></p>
      <p>Transformational Speaker | U.S. Army Veteran | Author | Host of B3U</p>
      <p>Burn. Break. Become Unstoppable.</p>
      <p>Breaking Cycles. Building Legacies.</p>
    </div>
  );
}

function renderLetterPreview(templateDraft: NewsletterTemplateDraft, weeklyDraft: WeeklyNewsletterDraft, isBlank = false) {
  const comingWeekItems = getComingWeekItems(weeklyDraft);

  return (
    <div className="mx-auto max-w-[760px] overflow-hidden bg-white shadow-2xl ring-1 ring-black/5">
      <header className="border-b-[4px] border-[#d0ad4b] bg-[#17182b] px-6 py-5 text-white sm:px-10">
        <div className="grid grid-cols-[88px_1fr] items-start gap-5">
          <div className="pt-1">
            <Image
              src="/images/logos/B3U3D.png"
              alt="B3U logo"
              width={76}
              height={76}
              className="h-[54px] w-[76px] object-contain"
            />
          </div>
          <div className="text-right">
            <h2 className="text-[28px] font-medium uppercase leading-none tracking-[0.04em] sm:text-[31px]">{templateDraft.headline}</h2>
            <p className="mt-3 text-[12px] font-semibold text-[#d4a536]">
              {templateDraft.byline} <span className="text-white/70">|</span> {templateDraft.weekLabel}
            </p>
          </div>
        </div>
      </header>

      <main className="bg-white px-10 py-5 text-[#3d3d45] sm:px-[52px]">
        <p className="mb-8 text-center text-[16px] leading-6 text-[#d4a536]">{templateDraft.tagline}</p>

        <SectionHeading>{isBlank ? 'Main Letter Title' : weeklyDraft.mainTitle}</SectionHeading>

        <div className="mt-6 space-y-5 text-[13px] leading-[1.45] tracking-[0.01em]">
          {isBlank ? (
            <>
              <p>Happy Monday, B3U Family!</p>
              <p>This space is reserved for the weekly opening letter.</p>
              <p>Use short paragraphs so the newsletter reads like a personal note from Dr. Bree Charles.</p>
              <p>Close the opening letter with a clear invitation, reflection, or encouragement.</p>
            </>
          ) : (
            paragraphize(weeklyDraft.openingLetter)
          )}
        </div>

        {renderClosingBlock(isBlank ? 'With gratitude,' : weeklyDraft.closingLine)}

        <GoldRule />

        <SectionHeading>{weeklyDraft.featuredStoryTitle || 'Featured Story'}</SectionHeading>
        <div className="mt-5 space-y-5 text-[13px] leading-[1.45] tracking-[0.01em]">
          {isBlank ? <p>The featured story section highlights the week’s main announcement, episode, event, or reflection.</p> : paragraphize(weeklyDraft.featuredStoryBody)}
        </div>

        <GoldRule />

        <SectionHeading>{weeklyDraft.bookSpotlightTitle || 'Book Spotlight'}</SectionHeading>
        <div className="mt-5 space-y-5 text-[13px] leading-[1.45] tracking-[0.01em]">
          {isBlank ? <p>Use this section to spotlight The Big Take Back, a product, resource, or featured message.</p> : paragraphize(weeklyDraft.bookSpotlightBody)}
        </div>

        <GoldRule />

        <SectionHeading>{weeklyDraft.comingThisWeekTitle || 'What’s Coming Next Week'}</SectionHeading>
        <div className="mt-5 space-y-5 text-[13px] leading-[1.45] tracking-[0.01em]">
          {renderComingWeekList(comingWeekItems, isBlank)}
          {isBlank ? (
            <p>Use this body section to add a short reflection or transition after the day-by-day schedule.</p>
          ) : (
            paragraphize(weeklyDraft.comingThisWeekBody)
          )}
        </div>

        <GoldRule />

        <SectionHeading>{weeklyDraft.affirmationTitle || 'THIS WEEK’S AFFIRMATION'}</SectionHeading>
        <div className="mt-5 text-center text-[13px] italic leading-7 text-[#c49124]">
          {isBlank ? (
            <p>“Today I choose to stop living from what happened to me and start living from who I was created to become.”</p>
          ) : (
            paragraphize(weeklyDraft.affirmationText)
          )}
        </div>

        <GoldRule />
        <p className="text-center text-[13px] leading-6 text-[#4a4a52]">{weeklyDraft.bottomEncouragement}</p>
      </main>

      <footer className="bg-[#17182b] px-6 py-4 text-center text-[11px] font-semibold leading-5 text-white sm:px-10">
        <p>{templateDraft.footerTagline}</p>
      </footer>
    </div>
  );
}

export default function NewsletterBuilder() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BuilderTab>('template');
  const [templateDraft, setTemplateDraft] = useState<NewsletterTemplateDraft>(defaultTemplate);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyNewsletterDraft>(defaultWeekly);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriberEmails, setSelectedSubscriberEmails] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedTemplateDraft = readStoredDraft(TEMPLATE_STORAGE_KEY, defaultTemplate);
    setTemplateDraft({ ...savedTemplateDraft, footerAddress: '' });

    const savedWeeklyDraft = readStoredDraft(WEEKLY_STORAGE_KEY, defaultWeekly);
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
    saveStoredDraft(TEMPLATE_STORAGE_KEY, { ...templateDraft, footerAddress: '' });
  }, [templateDraft]);

  useEffect(() => {
    saveStoredDraft(WEEKLY_STORAGE_KEY, weeklyDraft);
  }, [weeklyDraft]);

  useEffect(() => {
    async function loadSubscribers() {
      try {
        const response = await fetch('/api/subscribers');

        if (response.status === 401) {
          await router.replace('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`Subscribers API returned ${response.status}`);
        }

        const data = (await response.json()) as Subscriber[];
        setSubscribers(data);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Failed to load subscribers.');
        setNoticeTone('error');
      } finally {
        setLoading(false);
      }
    }

    void loadSubscribers();
  }, [router]);

  const bodyPreview = useMemo(() => buildNewsletterBody(templateDraft, weeklyDraft), [templateDraft, weeklyDraft]);

  function updateTemplate<K extends keyof NewsletterTemplateDraft>(key: K, value: NewsletterTemplateDraft[K]) {
    setTemplateDraft((current) => ({ ...current, [key]: value }));
  }

  function updateWeekly<K extends keyof WeeklyNewsletterDraft>(key: K, value: WeeklyNewsletterDraft[K]) {
    setWeeklyDraft((current) => ({ ...current, [key]: value }));
  }

  function handleTemplateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setNotice('Upload a PNG, JPG, or other image file for the blank weekly newsletter template.');
      setNoticeTone('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateTemplate('backgroundDataUrl', String(reader.result || ''));
      updateTemplate('backgroundFileName', file.name);
      setNotice('Blank weekly newsletter template saved for this browser.');
      setNoticeTone('success');
    };
    reader.onerror = () => {
      setNotice('The template image could not be read. Try exporting it again from Canva.');
      setNoticeTone('error');
    };
    reader.readAsDataURL(file);
  }

  function handleSelectAllSubscribers() {
    setSelectedSubscriberEmails(subscribers.map((subscriber) => subscriber.email));
  }

  function handleSubscriberToggle(email: string) {
    setSelectedSubscriberEmails((current) => (
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email]
    ));
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

  async function handleScheduleNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const scheduledFor = toUtcIsoStringFromDateTimeInput(weeklyDraft.scheduledFor);

    if (!scheduledFor) {
      setNotice('Choose a valid send date and time.');
      setNoticeTone('error');
      return;
    }

    if (!selectedSubscriberEmails.length) {
      setNotice('Select at least one subscriber before scheduling.');
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
          scheduledFor,
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

      setNotice('Weekly newsletter queued successfully from the template builder.');
      setNoticeTone('success');
      setWeeklyDraft({ ...defaultWeekly, scheduledFor: formatDateTimeInput() });
      setSelectedSubscriberEmails([]);
      setActiveTab('monthly');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to schedule newsletter.');
      setNoticeTone('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">B3U Admin</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Weekly Newsletter Template Builder</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Build the weekly issue using the same header, section titles, gold rules, body spacing, and footer format as the Take Back Weekly letter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to dashboard
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeTab === 'template' ? 'bg-brandBlue text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-brandBlue-light/20'}`}
          >
            Blank Template
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeTab === 'monthly' ? 'bg-brandBlue text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-brandBlue-light/20'}`}
          >
            Weekly Newsletter
          </button>
        </div>

        {notice ? (
          <div className={`rounded-3xl border px-5 py-4 text-sm ${noticeTone === 'success' ? 'border-brandBlue/20 bg-brandBlue-light/20 text-navy' : noticeTone === 'error' ? 'border-brandOrange/25 bg-brandOrange/10 text-navy' : 'border-brandBlue/20 bg-brandBlue-light/10 text-navy'}`}>
            {notice}
          </div>
        ) : null}

        {activeTab === 'template' ? (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Blank Template Setup</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Set the reusable top header and footer details. The preview recreates the weekly letter with empty placeholders.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Template name</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.templateName} onChange={(event) => updateTemplate('templateName', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Header title</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.headline} onChange={(event) => updateTemplate('headline', event.target.value)} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Byline</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.byline} onChange={(event) => updateTemplate('byline', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Week label</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.weekLabel} onChange={(event) => updateTemplate('weekLabel', event.target.value)} />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Gold tagline</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.tagline} onChange={(event) => updateTemplate('tagline', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Footer website/tagline line</span>
                  <textarea className="min-h-[80px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.footerTagline} onChange={(event) => updateTemplate('footerTagline', event.target.value)} />
                </label>
                <label className="block rounded-2xl border border-dashed border-gray-300 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Optional: upload blank Canva template image</span>
                  <input type="file" accept="image/*" onChange={handleTemplateUpload} className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-brandOrange file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
                  {templateDraft.backgroundFileName ? <span className="mt-2 block text-xs text-gray-500">Saved: {templateDraft.backgroundFileName}</span> : null}
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Blank Letter Preview</h2>
              <div className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 p-4 shadow-sm">
                {templateDraft.backgroundDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={templateDraft.backgroundDataUrl} alt="Uploaded blank weekly newsletter template" className="max-h-[680px] w-full object-contain bg-slate-100" />
                ) : (
                  renderLetterPreview(templateDraft, weeklyDraft, true)
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'monthly' ? (
          <form className="grid gap-6 xl:grid-cols-[1fr_0.9fr]" onSubmit={handleScheduleNewsletter}>
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Write This Week's Newsletter</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">Use the same structure as the reference: opening letter, built-in closing block, featured story, book spotlight, weekday list, body section, affirmation, and footer.</p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Email subject</span>
                  <input required maxLength={160} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.subject} onChange={(event) => updateWeekly('subject', event.target.value)} />
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
                <label className="block max-w-sm">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Send date and time</span>
                  <input required type="datetime-local" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={weeklyDraft.scheduledFor} onChange={(event) => updateWeekly('scheduledFor', event.target.value)} />
                </label>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Letter Preview</h2>
                <div className="mt-5 overflow-hidden rounded-[2rem] border border-[#d7e5f0] bg-slate-100 p-4 shadow-sm">
                  {renderLetterPreview(templateDraft, weeklyDraft)}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">Subscribers</h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSelectAllSubscribers} className="rounded-full bg-brandOrange px-3 py-1 text-xs font-semibold text-white disabled:opacity-60" disabled={!subscribers.length}>Select all</button>
                    <button type="button" onClick={() => setSelectedSubscriberEmails([])} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700" disabled={!selectedSubscriberEmails.length}>Clear</button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">{selectedSubscriberEmails.length} of {subscribers.length} subscribers selected.</p>
                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-slate-50 p-3">
                  {loading ? <p className="text-sm text-gray-500">Loading subscribers...</p> : null}
                  {!loading && !subscribers.length ? <p className="text-sm text-gray-500">No subscribers available.</p> : null}
                  {subscribers.map((subscriber) => (
                    <label key={subscriber.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                      <input type="checkbox" checked={selectedSubscriberEmails.includes(subscriber.email)} onChange={() => handleSubscriberToggle(subscriber.email)} />
                      <span>{subscriber.email}</span>
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={submitting || !selectedSubscriberEmails.length} className="mt-5 w-full rounded-xl bg-brandBlue px-5 py-3 text-sm font-semibold text-white transition hover:bg-brandBlue-dark disabled:cursor-not-allowed disabled:opacity-70">
                  {submitting ? 'Scheduling newsletter...' : 'Schedule weekly newsletter'}
                </button>
              </div>
            </section>
          </form>
        ) : null}
      </div>
    </main>
  );
}
