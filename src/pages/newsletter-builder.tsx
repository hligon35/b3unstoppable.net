import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

type BuilderTab = 'template' | 'monthly';

type Subscriber = {
  id: number;
  email: string;
  created_at: string;
};

type NewsletterTemplateDraft = {
  templateName: string;
  eyebrow: string;
  headline: string;
  tagline: string;
  footerNote: string;
  backgroundDataUrl: string;
  backgroundFileName: string;
};

type MonthlyNewsletterDraft = {
  subject: string;
  issueLabel: string;
  openingMessage: string;
  featureTitle: string;
  featureBody: string;
  updatesTitle: string;
  updatesBody: string;
  quote: string;
  ctaText: string;
  ctaUrl: string;
  closingNote: string;
  scheduledFor: string;
};

const TEMPLATE_STORAGE_KEY = 'b3u-newsletter-template-draft';
const MONTHLY_STORAGE_KEY = 'b3u-monthly-newsletter-draft';

const defaultTemplate: NewsletterTemplateDraft = {
  templateName: 'The Take Back Weekly',
  eyebrow: 'The Take Back Weekly',
  headline: 'Burn, Break, Become Unstoppable',
  tagline: 'Breaking Cycles. Building Legacies.',
  footerNote: 'B3U exists to help people burn away fear, break destructive cycles, and become unstoppable.',
  backgroundDataUrl: '',
  backgroundFileName: '',
};

const defaultMonthly: MonthlyNewsletterDraft = {
  subject: 'The Take Back Weekly:',
  issueLabel: '',
  openingMessage: '',
  featureTitle: '',
  featureBody: '',
  updatesTitle: 'This Week at B3U',
  updatesBody: '',
  quote: '',
  ctaText: 'Read more',
  ctaUrl: '',
  closingNote: '',
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

function buildNewsletterBody(template: NewsletterTemplateDraft, monthly: MonthlyNewsletterDraft) {
  const sections = [
    template.eyebrow,
    monthly.issueLabel,
    template.headline,
    template.tagline,
    monthly.openingMessage,
    monthly.featureTitle ? `${monthly.featureTitle}\n${monthly.featureBody}` : monthly.featureBody,
    monthly.updatesTitle ? `${monthly.updatesTitle}\n${monthly.updatesBody}` : monthly.updatesBody,
    monthly.quote ? `Unstoppable Note\n${monthly.quote}` : '',
    monthly.ctaUrl ? `${monthly.ctaText || 'Read more'}\n${monthly.ctaUrl}` : monthly.ctaText,
    monthly.closingNote,
    template.footerNote,
  ];

  return sections.map((section) => section.trim()).filter(Boolean).join('\n\n');
}

function renderLetterPreview(templateDraft: NewsletterTemplateDraft, monthlyDraft: MonthlyNewsletterDraft, isBlank = false) {
  return (
    <div className="bg-[#eef4f8] p-4 sm:p-7">
      <div className="mx-auto max-w-[760px] overflow-hidden rounded-[1.75rem] border border-[#d8e6ef] bg-white shadow-2xl">
        <div className="grid grid-cols-[88px_1fr] gap-4 border-b border-[#e4edf4] bg-white px-6 py-6 sm:grid-cols-[112px_1fr] sm:px-9">
          <div className="flex items-start justify-center border-r border-[#e4edf4] pr-4 sm:pr-6">
            <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-[#d8e6ef]">
              <Image
                src="/images/logos/B3U3D.png"
                alt="B3U logo"
                width={82}
                height={82}
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-brandOrange">{templateDraft.eyebrow}</div>
            <h3 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight text-[#0A1A2A] sm:text-5xl">
              {isBlank ? templateDraft.headline : monthlyDraft.issueLabel || templateDraft.headline}
            </h3>
            <p className="ml-auto mt-3 max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-[#5a7389]">{templateDraft.tagline}</p>
          </div>
        </div>

        <div className="px-6 py-7 sm:px-10 sm:py-9">
          <div className="mx-auto max-w-[560px] space-y-7 text-[15px] leading-8 text-[#1b3348]">
            {isBlank ? (
              <>
                <div className="h-4 w-32 rounded-full bg-brandOrange/30" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded-full bg-slate-100" />
                  <div className="h-4 w-11/12 rounded-full bg-slate-100" />
                  <div className="h-4 w-10/12 rounded-full bg-slate-100" />
                </div>
                <div className="border-l-4 border-brandOrange pl-5">
                  <div className="h-5 w-2/3 rounded-full bg-slate-200" />
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-full rounded-full bg-slate-100" />
                    <div className="h-4 w-5/6 rounded-full bg-slate-100" />
                  </div>
                </div>
                <div className="rounded-3xl bg-[#f4f8fb] p-6">
                  <div className="h-4 w-1/2 rounded-full bg-brandBlue/20" />
                  <div className="mt-4 h-3 w-full rounded-full bg-brandBlue/10" />
                  <div className="mt-3 h-3 w-4/5 rounded-full bg-brandBlue/10" />
                </div>
              </>
            ) : (
              <>
                {monthlyDraft.openingMessage ? <p>{monthlyDraft.openingMessage}</p> : <p className="text-slate-400">Your opening message will appear here.</p>}

                {monthlyDraft.featureTitle || monthlyDraft.featureBody ? (
                  <section className="border-l-4 border-brandOrange pl-5">
                    {monthlyDraft.featureTitle ? <h4 className="text-2xl font-black leading-tight text-[#0A1A2A]">{monthlyDraft.featureTitle}</h4> : null}
                    {monthlyDraft.featureBody ? <p className="mt-3 whitespace-pre-line">{monthlyDraft.featureBody}</p> : null}
                  </section>
                ) : null}

                {monthlyDraft.updatesTitle || monthlyDraft.updatesBody ? (
                  <section>
                    {monthlyDraft.updatesTitle ? <h4 className="text-xl font-black uppercase tracking-[0.12em] text-brandOrange">{monthlyDraft.updatesTitle}</h4> : null}
                    {monthlyDraft.updatesBody ? <p className="mt-3 whitespace-pre-line">{monthlyDraft.updatesBody}</p> : null}
                  </section>
                ) : null}

                {monthlyDraft.quote ? (
                  <blockquote className="rounded-3xl bg-[#f4f8fb] px-6 py-5 text-lg font-semibold leading-8 text-navy">
                    "{monthlyDraft.quote}"
                  </blockquote>
                ) : null}

                {monthlyDraft.ctaText ? (
                  <div>
                    <span className="inline-flex rounded-full bg-brandOrange px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-sm">
                      {monthlyDraft.ctaText}
                    </span>
                  </div>
                ) : null}

                {monthlyDraft.closingNote ? <p>{monthlyDraft.closingNote}</p> : null}
              </>
            )}
          </div>
        </div>

        <div className="border-t border-[#e4edf4] bg-[#fbfdff] px-6 py-6 text-center text-xs leading-6 text-[#5a7389] sm:px-10">
          {templateDraft.footerNote}
        </div>
      </div>
    </div>
  );
}

export default function NewsletterBuilder() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BuilderTab>('template');
  const [templateDraft, setTemplateDraft] = useState<NewsletterTemplateDraft>(defaultTemplate);
  const [monthlyDraft, setMonthlyDraft] = useState<MonthlyNewsletterDraft>(defaultMonthly);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriberEmails, setSelectedSubscriberEmails] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTemplateDraft(readStoredDraft(TEMPLATE_STORAGE_KEY, defaultTemplate));
    setMonthlyDraft(readStoredDraft(MONTHLY_STORAGE_KEY, defaultMonthly));
  }, []);

  useEffect(() => {
    saveStoredDraft(TEMPLATE_STORAGE_KEY, templateDraft);
  }, [templateDraft]);

  useEffect(() => {
    saveStoredDraft(MONTHLY_STORAGE_KEY, monthlyDraft);
  }, [monthlyDraft]);

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

  const bodyPreview = useMemo(() => buildNewsletterBody(templateDraft, monthlyDraft), [templateDraft, monthlyDraft]);

  function updateTemplate<K extends keyof NewsletterTemplateDraft>(key: K, value: NewsletterTemplateDraft[K]) {
    setTemplateDraft((current) => ({ ...current, [key]: value }));
  }

  function updateMonthly<K extends keyof MonthlyNewsletterDraft>(key: K, value: MonthlyNewsletterDraft[K]) {
    setMonthlyDraft((current) => ({ ...current, [key]: value }));
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

  async function handleScheduleNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const scheduledFor = toUtcIsoStringFromDateTimeInput(monthlyDraft.scheduledFor);

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
          subject: monthlyDraft.subject.trim(),
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
      setMonthlyDraft({ ...defaultMonthly, scheduledFor: formatDateTimeInput() });
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
                Keep the reusable branded letter layout separate from the weekly writing so the client can publish a fresh issue every week.
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
                Upload a blank Canva export or use the recreated blank B3U letter template. The uploaded image is saved locally in this browser for preview and weekly layout planning.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Template name</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.templateName} onChange={(event) => updateTemplate('templateName', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Right header label</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.eyebrow} onChange={(event) => updateTemplate('eyebrow', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Main headline</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.headline} onChange={(event) => updateTemplate('headline', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Tagline</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.tagline} onChange={(event) => updateTemplate('tagline', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Footer note</span>
                  <textarea className="min-h-[110px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={templateDraft.footerNote} onChange={(event) => updateTemplate('footerNote', event.target.value)} />
                </label>
                <label className="block rounded-2xl border border-dashed border-gray-300 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Upload blank Canva template image</span>
                  <input type="file" accept="image/*" onChange={handleTemplateUpload} className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-brandOrange file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
                  {templateDraft.backgroundFileName ? <span className="mt-2 block text-xs text-gray-500">Saved: {templateDraft.backgroundFileName}</span> : null}
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Blank Letter Preview</h2>
              <div className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                {templateDraft.backgroundDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={templateDraft.backgroundDataUrl} alt="Uploaded blank weekly newsletter template" className="max-h-[680px] w-full object-contain bg-slate-100" />
                ) : (
                  renderLetterPreview(templateDraft, monthlyDraft, true)
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'monthly' ? (
          <form className="grid gap-6 xl:grid-cols-[1fr_0.9fr]" onSubmit={handleScheduleNewsletter}>
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Write This Week's Newsletter</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">Fill in the reusable sections. The system turns this into the scheduled email body and sends it to selected subscribers.</p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Subject</span>
                  <input required maxLength={160} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.subject} onChange={(event) => updateMonthly('subject', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Weekly issue title</span>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" placeholder="July 2026 Weekly Letter" value={monthlyDraft.issueLabel} onChange={(event) => updateMonthly('issueLabel', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Opening message</span>
                  <textarea required className="min-h-[130px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.openingMessage} onChange={(event) => updateMonthly('openingMessage', event.target.value)} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Main letter title</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.featureTitle} onChange={(event) => updateMonthly('featureTitle', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Weekly updates title</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.updatesTitle} onChange={(event) => updateMonthly('updatesTitle', event.target.value)} />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Main letter body</span>
                  <textarea className="min-h-[150px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.featureBody} onChange={(event) => updateMonthly('featureBody', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Weekly updates / announcements</span>
                  <textarea className="min-h-[130px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.updatesBody} onChange={(event) => updateMonthly('updatesBody', event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Unstoppable note / quote</span>
                  <textarea className="min-h-[90px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.quote} onChange={(event) => updateMonthly('quote', event.target.value)} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">CTA text</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.ctaText} onChange={(event) => updateMonthly('ctaText', event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">CTA link</span>
                    <input className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.ctaUrl} onChange={(event) => updateMonthly('ctaUrl', event.target.value)} />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Closing note</span>
                  <textarea className="min-h-[90px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.closingNote} onChange={(event) => updateMonthly('closingNote', event.target.value)} />
                </label>
                <label className="block max-w-sm">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Send date and time</span>
                  <input required type="datetime-local" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" value={monthlyDraft.scheduledFor} onChange={(event) => updateMonthly('scheduledFor', event.target.value)} />
                </label>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Letter Preview</h2>
                <div className="mt-5 overflow-hidden rounded-[2rem] border border-[#d7e5f0] bg-white shadow-sm">
                  {renderLetterPreview(templateDraft, monthlyDraft)}
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
