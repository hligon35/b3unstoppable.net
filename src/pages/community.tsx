import Layout from '@/components/Layout';
import TurnstileField, { isTurnstileEnabled } from '@/components/TurnstileField';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormsApi } from '@/lib/useFormsApi';
import { submitFormToEndpoint } from '@/lib/formsSubmit';
import { communityEvent, createCommunityEventStructuredData, siteUrl } from '@/lib/communityEvent';
import { monitoredFetch } from '../../utils/debug/client';

type Story = {
  id: string;
  name: string;
  email?: string;
  story: string;
  createdAt?: string;
};

const NAME_FIELD_MIN = 2;
const NAME_FIELD_MAX = 128;
const EMAIL_FIELD_MIN = 6;
const EMAIL_FIELD_MAX = 254;
const LONG_FIELD_MIN = 10;
const LONG_FIELD_MAX = 300;

export default function CommunityPage() {
  const { formsApi, debugEnabled } = useFormsApi();
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [t0, setT0] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [editorMode, setEditorMode] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [storyValue, setStoryValue] = useState('');
  const turnstileRequired = isTurnstileEnabled();
  const eventStructuredData = useMemo(() => createCommunityEventStructuredData({
    pageUrl: `${siteUrl}/community/`,
    imageUrl: new URL(communityEvent.imagePath, siteUrl).toString(),
  }), []);

  // Fetch approved stories as JSON with a fallback path; returns a cleanup function
  const loadStories = useCallback(() => {
    if (!formsApi) return () => {};
    let cleaned = false;
    const controller = new AbortController();
    const requestUrls = [`${formsApi}?endpoint=stories`, `${formsApi}/stories`];

    const fetchStories = async () => {
      setStoriesLoading(true);
      for (const url of requestUrls) {
        try {
          const response = await monitoredFetch(`${url}${url.includes('?') ? '&' : '?'}_ts=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'omit',
            headers: {
              Accept: 'application/json',
            },
            signal: controller.signal,
          }, {
            label: 'Community stories fetch',
            route: '/community',
            source: 'community-stories',
            suppressErrorLogging: true,
          });

          if (!response.ok) {
            continue;
          }

          const contentType = response.headers.get('content-type') || '';
          const payload = contentType.includes('application/json')
            ? await response.json()
            : JSON.parse(await response.text());

          if (Array.isArray(payload?.stories)) {
            setStories(payload.stories as Story[]);
            setStoriesLoading(false);
            return;
          }
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }
        }
      }

      setStoriesLoading(false);
    };

    void fetchStories();

    return () => {
      if (cleaned) return;
      cleaned = true;
      controller.abort();
    };
  }, [formsApi]);

  // Load on mount and whenever formsApi changes
  useEffect(() => {
    const cleanup = loadStories();
    return () => { try { cleanup && cleanup(); } catch {} };
  }, [loadStories]);

  // Refresh on tab visibility change (useful right after approving)
  useEffect(() => {
    let cancelRefresh = () => {};
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      cancelRefresh();
      cancelRefresh = loadStories();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      cancelRefresh();
    };
  }, [loadStories]);

  useEffect(() => {
    try { setT0(String(Date.now())); } catch {}
  }, []);
  useEffect(() => {
    // Editor mode and hidden ids from URL/localStorage for dev-only local deletions
    try {
      const params = new URLSearchParams(window.location.search);
      const ed = params.get('editor');
      if (ed === '1' || ed === 'true') {
        setEditorMode(true);
        try { window.localStorage?.setItem('b3u.editor', '1'); } catch {}
      } else {
        try { if (window.localStorage?.getItem('b3u.editor') === '1') setEditorMode(true); } catch {}
      }
      try {
        const raw = window.localStorage?.getItem('b3u.hiddenStories');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setHiddenIds(new Set(arr.filter((x: any) => typeof x === 'string')));
        }
      } catch {}
    } catch {}
  }, []);
  // debugEnabled now comes from useFormsApi; runtime override centralized

  const displayCount = 6; // number of cards to show at minimum
  const filteredStories = useMemo(() => {
    return stories.filter(st => !hiddenIds.has(st.id));
  }, [stories, hiddenIds]);
  const visibleStories = useMemo(() => filteredStories.slice(0, displayCount), [filteredStories]);

  const toggleStoryExpanded = (id: string) => {
    setExpandedStoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hideStory = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { window.localStorage?.setItem('b3u.hiddenStories', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };
  const unhideAll = () => {
    setHiddenIds(new Set());
    try { window.localStorage?.removeItem('b3u.hiddenStories'); } catch {}
  };
  const hideAllFetched = () => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      for (const st of stories) next.add(st.id);
      try { window.localStorage?.setItem('b3u.hiddenStories', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return; // guard against double submissions
    if (!formsApi) {
      setError('Submissions are temporarily unavailable. Please try again shortly.');
      // eslint-disable-next-line no-console
      console.warn('B3U Forms: NEXT_PUBLIC_FORMS_API is not configured; blocking story submit.');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setError('Please complete the security check before sharing your story.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitFormToEndpoint(formRef.current!, `${formsApi}?endpoint=submit`);
      setSubmitted(true);
      try { formRef.current?.reset(); } catch {}
      setStoryValue('');
      setTurnstileToken('');
      setTurnstileResetKey((value) => value + 1);
      try { setT0(String(Date.now())); } catch {}
    } catch {
      setError('Submission failed. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  // Iframe postMessage debug removed.
  return (
      <Layout
        title="Community Stories + Prosper on Purpose Brunch | Richmond, VA | B3U"
        description={`${communityEvent.name} is happening ${communityEvent.scheduleLabel} at ${communityEvent.venueName}, ${communityEvent.streetAddress}, ${communityEvent.cityStateZip}. Join the B3U community in Richmond and register on Eventbrite.`}
        structuredData={eventStructuredData}
      >
  <section className="section-padding bg-white">
        <h1 className="text-4xl font-bold mb-6">Community Stories</h1>
    <p className="max-w-2xl text-navy/80 mb-12">Real impact from real people. Share your journey and help others find strength in theirs.</p>
        <div className="mb-12 rounded-3xl border border-brandOrange/30 bg-gradient-to-r from-brandOrange to-red-600 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Update</p>
              <h2 className="mt-2 text-2xl font-bold">The Big Take Back: What I Left Behind is ON SALE NOW.</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/90">Order Bree&apos;s new release now and share the update with anyone ready to reclaim their voice, confidence, and power.</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur-sm">
              ON SALE NOW
            </div>
          </div>
        </div>
        {/* Share Your Story form moved directly under title and subtext */}
        {editorMode && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button type="button" className="btn-outline" onClick={() => loadStories()}>Refresh stories</button>
            <button type="button" className="btn-outline" onClick={unhideAll}>Clear local hides</button>
            <button type="button" className="btn-outline" onClick={hideAllFetched}>Hide all fetched</button>
            <span className="text-xs text-navy/60">Editor mode</span>
          </div>
        )}
        <form
          className="max-w-3xl mb-16"
          onSubmit={onSubmit}
          ref={formRef}
        >
          {/* bot protection: honeypot + timestamp */}
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <input type="hidden" name="t0" value={t0} />
          {debugEnabled && <input type="hidden" name="debug" value="1" />}
          <div className="bg-white border border-black/10 rounded-xl shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <TurnstileField
                token={turnstileToken}
                onTokenChange={setTurnstileToken}
                resetKey={turnstileResetKey}
              />
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold">Share Your Story</h2>
              <p className="text-sm text-navy/70 mt-1">Your words may encourage someone who needs it today. Fields marked with <span className="text-red-600">*</span> are required.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-navy mb-1">Name <span className="text-red-600">*</span></label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={NAME_FIELD_MIN}
                  maxLength={NAME_FIELD_MAX}
                  className="w-full rounded-md border border-black/10 bg-white px-4 py-2 text-navy placeholder:text-navy/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-brandBlue"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-navy mb-1">Email <span className="text-red-600">*</span></label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  minLength={EMAIL_FIELD_MIN}
                  maxLength={EMAIL_FIELD_MAX}
                  className="w-full rounded-md border border-black/10 bg-white px-4 py-2 text-navy placeholder:text-navy/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-brandBlue"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="story" className="block text-sm font-medium text-navy mb-1">Your story <span className="text-red-600">*</span></label>
              <div className="relative">
                <textarea
                  id="story"
                  name="story"
                  rows={7}
                  required
                  minLength={LONG_FIELD_MIN}
                  maxLength={LONG_FIELD_MAX}
                  value={storyValue}
                  onChange={(e) => setStoryValue(e.target.value)}
                  className="w-full rounded-md border border-black/10 bg-white px-4 py-3 pb-8 text-navy placeholder:text-navy/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-brandBlue"
                  placeholder="Share what you&apos;ve overcome, what you learned, or a message for others."
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-navy/60">
                  {storyValue.length}/{LONG_FIELD_MAX}
                </span>
              </div>
              <p className="mt-2 text-xs text-navy/60">Please avoid sharing sensitive personal details or names you don&apos;t have permission to include.</p>
            </div>

            <fieldset className="mt-6">
              <legend className="block text-sm font-medium text-navy mb-2">Authorize name usage</legend>
              <p className="text-xs text-navy/60 mb-2">Choose whether we can display your name with your story.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-navy/80">
                  <input type="radio" name="useName" value="yes" required className="h-4 w-4 text-brandOrange focus:ring-brandOrange" />
                  Yes &mdash; use my name in the story post
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-navy/80">
                  <input type="radio" name="useName" value="no" className="h-4 w-4 text-brandOrange focus:ring-brandOrange" />
                  No &mdash; keep me anonymous
                </label>
              </div>
            </fieldset>

            <div className="mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button className="btn-primary disabled:opacity-50" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting\u2026' : 'Submit Story'}
                </button>
                {submitted && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    Thanks! Your story was received. Please check your email for confirmation.
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
        {/* Iframe removed: switched to fetch-based submission with no-cors fallback */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Render approved stories only. */}
          {visibleStories.map((st) => (
            <div key={st.id} className="card flex h-full flex-col">
              <p
                className={`text-sm italic mb-4 ${expandedStoryIds.has(st.id) ? '' : 'line-clamp-3'}`}
              >
                “{st.story}”
              </p>
              {st.story.length > 180 && (
                <button
                  type="button"
                  className="mb-4 w-fit text-xs font-semibold text-brandBlue underline underline-offset-2"
                  onClick={() => toggleStoryExpanded(st.id)}
                >
                  {expandedStoryIds.has(st.id) ? 'Show less' : 'More'}
                </button>
              )}
              <p className="mt-auto text-xs text-navy/60">{st.name}</p>
              {editorMode && (
                <div className="mt-3">
                  <button type="button" className="text-xs text-red-200 underline" onClick={() => hideStory(st.id)}>Hide locally</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {!storiesLoading && visibleStories.length === 0 && (
          <div className="mb-16 rounded-xl border border-black/10 bg-[#F8FBFD] px-6 py-5 text-sm text-navy/70">
            No community stories have been approved for display yet. Check back soon.
          </div>
        )}
        {storiesLoading && (
          <div className="mb-16 rounded-xl border border-black/10 bg-[#F8FBFD] px-6 py-5 text-sm text-navy/60">
            Loading community stories...
          </div>
        )}
      </section>
    </Layout>
  );
}
