import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import {
  BLOG_STATUS_OPTIONS,
  buildDefaultBlogInput,
  getReadingTimeMinutes,
  slugifyBlogTitle,
  validateBlogInput,
  type BlogInput,
  type BlogPost,
  type BlogStatus,
} from '@/lib/blogs';
import JournalArticleLayout from './JournalArticleLayout';

type SaveAction = 'draft' | 'publish' | 'schedule';
type EditorTab = 'edit' | 'preview';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

type BlogEditorScreenProps = {
  backHref: string;
  mode: 'new' | 'edit';
  initialPost: BlogInput;
  existingPost?: BlogPost | null;
  onPersist: (payload: BlogInput) => Promise<{ ok: boolean; message: string; id?: number }>;
};

const AUTOSAVE_PREFIX = 'b3u-blog-editor-draft';
const PODCAST_PAGE_BASE = '/podcast/';
const MAIN_CONTENT_EXAMPLE = `## The Shift Begins
Most people do not fail because they lack talent. They stall because they carry yesterday's story into tomorrow's opportunity.

### What Changes Outcomes
- Name the pattern
- Interrupt the pattern
- Replace the pattern with a repeatable practice

> Change becomes real when behavior changes before confidence catches up.

1. Choose one small action.
2. Repeat it daily for 7 days.

Use **bold** words when you want strong emphasis, and *italic* words for a softer tone.

[Join the Masterclass](/masterclass)

![B3U event image](https://image.url)`;

const INTERNAL_LINK_OPTIONS = [
  { value: '/', label: 'Home' },
  { value: '/about/', label: 'About' },
  { value: '/podcast/', label: 'Podcast' },
  { value: '/community/', label: 'Community' },
  { value: '/event-gallery/', label: 'Events' },
  { value: '/journal/', label: 'Journal' },
  { value: '/shop/', label: 'Shop' },
  { value: '/contact/', label: 'Contact' },
  { value: '/masterclass', label: 'Masterclass' },
  { value: '/newsletter-builder', label: 'Newsletter Builder' },
] as const;

type PodcastDirectoryEpisode = {
  id: string;
  title: string;
};

function toDateTimeInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
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

async function normalizeImageToEditorialRatio(file: File) {
  const imageBitmap = await createImageBitmap(file);
  const targetRatio = 16 / 9;

  const sourceWidth = imageBitmap.width;
  const sourceHeight = imageBitmap.height;
  const sourceRatio = sourceWidth / sourceHeight;

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = Math.round(sourceHeight * targetRatio);
    offsetX = Math.round((sourceWidth - cropWidth) / 2);
  } else if (sourceRatio < targetRatio) {
    cropHeight = Math.round(sourceWidth / targetRatio);
    offsetY = Math.round((sourceHeight - cropHeight) / 2);
  }

  const maxWidth = 1600;
  const outputWidth = Math.min(maxWidth, cropWidth);
  const outputHeight = Math.round(outputWidth / targetRatio);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Image editing is unavailable in this browser.');
  }

  context.drawImage(
    imageBitmap,
    offsetX,
    offsetY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const dataUrl = canvas.toDataURL('image/webp', 0.9);
  imageBitmap.close();

  return { dataUrl, outputWidth, outputHeight };
}

function noticeClassName(tone: 'info' | 'success' | 'error') {
  if (tone === 'success') {
    return 'border-brandBlue/20 bg-brandBlue-light/20 text-navy';
  }

  if (tone === 'error') {
    return 'border-brandOrange/25 bg-brandOrange/10 text-navy';
  }

  return 'border-brandBlue/20 bg-brandBlue-light/10 text-navy';
}

function buildPodcastEpisodeLink(episodeId: string) {
  const params = new URLSearchParams({ episode: episodeId, autoplay: '1' });
  return `${PODCAST_PAGE_BASE}?${params.toString()}`;
}

function getEpisodeIdFromPodcastUrl(value: string) {
  if (!value) {
    return '';
  }

  try {
    const url = value.startsWith('http://') || value.startsWith('https://')
      ? new URL(value)
      : new URL(value, 'https://b3u.local');

    if (!url.pathname.startsWith('/podcast')) {
      return '';
    }

    return url.searchParams.get('episode') || '';
  } catch {
    return '';
  }
}

export default function BlogEditorScreen({ backHref, mode, initialPost, existingPost, onPersist }: BlogEditorScreenProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<BlogInput>(() => buildDefaultBlogInput(initialPost));
  const [publishAtInput, setPublishAtInput] = useState(() => toDateTimeInputValue(initialPost.publishAt));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'error'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [previewTab, setPreviewTab] = useState<EditorTab>('edit');
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
  const [searchSocialOpen, setSearchSocialOpen] = useState(true);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialPost.slug));
  const [podcastOptions, setPodcastOptions] = useState<PodcastDirectoryEpisode[]>([]);
  const [isLoadingPodcastOptions, setIsLoadingPodcastOptions] = useState(true);
  const readingTimeMinutes = useMemo(() => getReadingTimeMinutes({
    contentMarkdown: draft.contentMarkdown,
    openingStory: draft.openingStory,
  }), [draft.contentMarkdown, draft.openingStory]);
  const selectedPodcastEpisodeId = useMemo(() => getEpisodeIdFromPodcastUrl(draft.relatedPodcastUrl), [draft.relatedPodcastUrl]);
  const selectedInternalCtaValue = useMemo(() => {
    return INTERNAL_LINK_OPTIONS.some((option) => option.value === draft.ctaUrl) ? draft.ctaUrl : '';
  }, [draft.ctaUrl]);

  const autosaveKey = `${AUTOSAVE_PREFIX}:${mode}:${existingPost?.id ?? 'new'}`;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(autosaveKey);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<BlogInput>;
      const hydrated = buildDefaultBlogInput(parsed);
      setDraft(hydrated);
      setPublishAtInput(toDateTimeInputValue(hydrated.publishAt));
      setSaveState('dirty');
      setNotice('Loaded a local autosave draft.');
      setNoticeTone('info');
    } catch {
      // Ignore invalid draft payload.
    }
  }, [autosaveKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (saveState === 'saving') {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(autosaveKey, JSON.stringify(draft));
        setSaveState('saved');
      } catch {
        setNotice('Autosave could not store this draft locally.');
        setNoticeTone('error');
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [autosaveKey, draft, saveState]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (saveState === 'dirty' || saveState === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState]);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (saveState !== 'dirty') {
        return;
      }

      const shouldLeave = window.confirm('You have unsaved changes. Leave this page anyway?');

      if (!shouldLeave) {
        router.events.emit('routeChangeError');
        throw new Error(`Route change aborted: ${url}`);
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    return () => router.events.off('routeChangeStart', handleRouteChangeStart);
  }, [router.events, saveState]);

  useEffect(() => {
    let cancelled = false;

    async function loadPodcastOptions() {
      try {
        const response = await fetch('/data/podcast.json');

        if (!response.ok) {
          throw new Error('Unable to load podcast list.');
        }

        const payload = await response.json() as { episodes?: Array<{ id?: unknown; title?: unknown }> };
        const episodes = Array.isArray(payload.episodes) ? payload.episodes : [];
        const normalized = episodes
          .map((episode) => ({
            id: typeof episode.id === 'string' ? episode.id : '',
            title: typeof episode.title === 'string' ? episode.title : '',
          }))
          .filter((episode) => episode.id && episode.title);

        if (!cancelled) {
          setPodcastOptions(normalized);
        }
      } catch {
        if (!cancelled) {
          setPodcastOptions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPodcastOptions(false);
        }
      }
    }

    void loadPodcastOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft<K extends keyof BlogInput>(key: K, value: BlogInput[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };

      if (key === 'title' && !slugManuallyEdited) {
        next.slug = slugifyBlogTitle(String(value || ''));
      }

      return next;
    });
    setSaveState('dirty');
  }

  function updateStatus(status: BlogStatus) {
    updateDraft('status', status);
  }

  function updateTags(value: string) {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    updateDraft('tags', tags);
  }

  function applyPodcastSelection(episodeId: string) {
    const selected = podcastOptions.find((episode) => episode.id === episodeId);

    if (!selected) {
      return;
    }

    setDraft((current) => ({
      ...current,
      relatedPodcastTitle: selected.title,
      relatedPodcastUrl: buildPodcastEpisodeLink(selected.id),
    }));
    setSaveState('dirty');
    setNotice('Podcast details were filled from your podcast library.');
    setNoticeTone('info');
  }

  async function handleFeaturedImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const normalized = await normalizeImageToEditorialRatio(file);
      updateDraft('featuredImageUrl', normalized.dataUrl);
      setNotice(`Featured image normalized to ${normalized.outputWidth}px x ${normalized.outputHeight}px.`);
      setNoticeTone('success');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to process featured image.');
      setNoticeTone('error');
    }
  }

  async function handleSocialImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const normalized = await normalizeImageToEditorialRatio(file);
      updateDraft('socialImageUrl', normalized.dataUrl);
      setNotice(`Social image normalized to ${normalized.outputWidth}px x ${normalized.outputHeight}px.`);
      setNoticeTone('success');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to process social image.');
      setNoticeTone('error');
    }
  }

  async function persist(action: SaveAction) {
    const normalizedPublishAt = publishAtInput ? toUtcIsoStringFromDateTimeInput(publishAtInput) : null;
    const nextStatus: BlogStatus = action === 'draft' ? 'draft' : action === 'schedule' ? 'scheduled' : 'published';
    const payload: BlogInput = {
      ...draft,
      status: nextStatus,
      publishAt: normalizedPublishAt,
    };

    const validation = validateBlogInput(payload, existingPost || null);
    setErrors(validation.errors);

    if (!validation.isValid) {
      setNotice('Please resolve the highlighted fields and try again.');
      setNoticeTone('error');
      return;
    }

    if (action === 'publish') {
      const confirmed = window.confirm('Publish this article now?');

      if (!confirmed) {
        return;
      }
    }

    if (action === 'schedule') {
      const confirmed = window.confirm('Schedule this article with the selected date and time?');

      if (!confirmed) {
        return;
      }
    }

    if (existingPost?.status === 'published' && existingPost.slug !== payload.slug) {
      const confirmed = window.confirm('This article is already published. Changing its slug can break links. Continue?');

      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    setSaveState('saving');

    const result = await onPersist(payload);

    setIsSaving(false);

    if (!result.ok) {
      setSaveState('dirty');
      setNotice(result.message);
      setNoticeTone('error');
      return;
    }

    try {
      window.localStorage.removeItem(autosaveKey);
    } catch {
      // Best effort only.
    }

    setSaveState('saved');
    setNotice(result.message);
    setNoticeTone('success');

    if (mode === 'new' && result.id) {
      await router.replace(`/admin/blog/${result.id}/edit`);
    }
  }

  const statusBadgeClassName = draft.status === 'published'
    ? 'bg-brandBlue-light/25 text-navy'
    : draft.status === 'scheduled'
      ? 'bg-brandOrange/15 text-brandOrange-dark'
      : 'bg-slate-200 text-slate-700';

  const preview = (
    <JournalArticleLayout
      article={{
        ...draft,
        title: draft.title,
        slug: draft.slug,
      }}
      readingTimeMinutes={readingTimeMinutes}
      showPlaceholders
      previewViewport={previewViewport}
    />
  );

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={backHref} className="inline-flex min-h-11 items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">
              Back to Blog
            </Link>
            <Link href="/admin/blog?status=draft" className="inline-flex min-h-11 items-center rounded-full border border-brandBlue/25 bg-brandBlue-light/20 px-4 py-2 text-sm font-semibold text-navy transition hover:border-brandBlue hover:bg-brandBlue-light/30">
              Saved drafts
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeClassName}`}>{draft.status}</span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">{saveState === 'saving' ? 'Saving...' : saveState === 'dirty' ? 'Unsaved changes' : 'All changes saved locally'}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => void persist('draft')} disabled={isSaving} className="min-h-11 shrink-0 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue disabled:opacity-60">
            Save draft
          </button>
          <button type="button" onClick={() => setPreviewTab('preview')} className="min-h-11 shrink-0 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">
            Preview
          </button>
          <button type="button" onClick={() => void persist(draft.status === 'scheduled' ? 'schedule' : 'publish')} disabled={isSaving} className="min-h-11 shrink-0 rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandBlue-dark disabled:opacity-60">
            {draft.status === 'scheduled' ? 'Schedule' : 'Publish'}
          </button>
        </div>
      </div>

      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${noticeClassName(noticeTone)}`}>{notice}</div> : null}

      {errors.slugChangeWarning ? <div className="rounded-2xl border border-brandOrange/25 bg-brandOrange/10 px-4 py-3 text-sm text-navy">{errors.slugChangeWarning}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,47%)_minmax(0,53%)] 2xl:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
        <div className={`space-y-6 ${previewTab === 'preview' ? 'hidden xl:block' : ''}`}>
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Story details</h2>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Blog title</span>
                <input type="text" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" required />
                {errors.title ? <span className="mt-1 block text-sm text-red-700">{errors.title}</span> : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">URL slug</span>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(event) => {
                    setSlugManuallyEdited(true);
                    updateDraft('slug', event.target.value);
                  }}
                  className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20"
                  required
                />
                {errors.slug ? <span className="mt-1 block text-sm text-red-700">{errors.slug}</span> : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Short introduction / deck</span>
                <textarea value={draft.deck} onChange={(event) => updateDraft('deck', event.target.value)} className="min-h-[90px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" maxLength={320} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Author</span>
                  <input type="text" value={draft.author} onChange={(event) => updateDraft('author', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Category</span>
                  <input type="text" value={draft.category} onChange={(event) => updateDraft('category', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" placeholder="Burn, Break, Become" />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Tags (comma separated)</span>
                <input type="text" value={draft.tags.join(', ')} onChange={(event) => updateTags(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Publication status</span>
                  <select value={draft.status} onChange={(event) => updateStatus(event.target.value as BlogStatus)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20">
                    {BLOG_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Publish / schedule date</span>
                  <input type="datetime-local" value={publishAtInput} onChange={(event) => setPublishAtInput(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" />
                  {errors.publishAt ? <span className="mt-1 block text-sm text-red-700">{errors.publishAt}</span> : null}
                </label>
              </div>

              <p className="text-sm text-gray-600">Estimated reading time: <strong>{readingTimeMinutes} minute{readingTimeMinutes === 1 ? '' : 's'}</strong></p>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Featured image</h2>
            <p className="mt-2 text-sm text-gray-600">Recommended width: at least 1200px. Image will be normalized to a 16:9 frame.</p>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Upload image</span>
                <input type="file" accept="image/*" onChange={(event) => void handleFeaturedImageUpload(event)} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Or image URL</span>
                <input type="url" value={draft.featuredImageUrl || ''} onChange={(event) => updateDraft('featuredImageUrl', event.target.value.trim() || null)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" placeholder="https://..." />
              </label>

              {draft.featuredImageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <div className="aspect-[16/9] w-full bg-slate-100">
                    <img src={draft.featuredImageUrl} alt="Featured preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-end border-t border-gray-200 bg-white px-3 py-2">
                    <button type="button" onClick={() => updateDraft('featuredImageUrl', null)} className="min-h-11 rounded-full border border-brandOrange/30 px-4 py-2 text-sm font-semibold text-brandOrange transition hover:bg-brandOrange hover:text-white">Remove image</button>
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Image alt text</span>
                <input type="text" value={draft.featuredImageAlt} onChange={(event) => updateDraft('featuredImageAlt', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" />
                {errors.featuredImageAlt ? <span className="mt-1 block text-sm text-red-700">{errors.featuredImageAlt}</span> : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Caption (optional)</span>
                <input type="text" value={draft.featuredImageCaption || ''} onChange={(event) => updateDraft('featuredImageCaption', event.target.value || null)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Article content</h2>
            <p className="mt-2 text-sm text-gray-600">Markdown supported: paragraphs, H2/H3, bold, italic, links, lists, pull quotes and inline images. Undo/redo works with your browser keyboard shortcuts.</p>
            <details className="mt-3 rounded-xl border border-gray-200 bg-slate-50/80 p-3 text-sm text-gray-700">
              <summary className="cursor-pointer font-medium text-slate-800">Formatting tips (plain language)</summary>
              <div className="mt-3 space-y-1.5 leading-6">
                <p><span className="font-semibold text-slate-900">##</span> starts a main section heading.</p>
                <p><span className="font-semibold text-slate-900">###</span> starts a smaller subheading under that section.</p>
                <p><span className="font-semibold text-slate-900">&gt;</span> turns a line into a pull quote or highlighted thought.</p>
                <p><span className="font-semibold text-slate-900">-</span> makes a bullet list item.</p>
                <p><span className="font-semibold text-slate-900">1.</span> starts a numbered list.</p>
                <p><span className="font-semibold text-slate-900">**text**</span> makes words bold. <span className="font-semibold text-slate-900">*text*</span> makes words italic.</p>
                <p><span className="font-semibold text-slate-900">[label](url)</span> creates a clickable link.</p>
                <p><span className="font-semibold text-slate-900">![alt text](image-url)</span> inserts an inline image in the story.</p>
              </div>
            </details>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Main content</span>
              <textarea value={draft.contentMarkdown} onChange={(event) => updateDraft('contentMarkdown', event.target.value)} className="min-h-[340px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" placeholder={MAIN_CONTENT_EXAMPLE} />
            </label>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">B3U editorial sections</h2>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Opening story</span>
                <textarea value={draft.openingStory} onChange={(event) => updateDraft('openingStory', event.target.value)} className="min-h-[110px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Burn section title</span>
                  <input type="text" value={draft.burnTitle} onChange={(event) => updateDraft('burnTitle', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Burn section body</span>
                  <textarea value={draft.burnBody} onChange={(event) => updateDraft('burnBody', event.target.value)} className="min-h-[110px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Break section title</span>
                  <input type="text" value={draft.breakTitle} onChange={(event) => updateDraft('breakTitle', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Break section body</span>
                  <textarea value={draft.breakBody} onChange={(event) => updateDraft('breakBody', event.target.value)} className="min-h-[110px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Become section title</span>
                  <input type="text" value={draft.becomeTitle} onChange={(event) => updateDraft('becomeTitle', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Become section body</span>
                  <textarea value={draft.becomeBody} onChange={(event) => updateDraft('becomeBody', event.target.value)} className="min-h-[110px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Pull quote</span>
                <textarea value={draft.pullQuote} onChange={(event) => updateDraft('pullQuote', event.target.value)} className="min-h-[100px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Reflection question</span>
                <textarea value={draft.reflectionQuestion} onChange={(event) => updateDraft('reflectionQuestion', event.target.value)} className="min-h-[90px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
              </label>

              <div className="rounded-2xl border border-gray-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Reader action links (optional)</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">This controls the button and related podcast box shown near the end of the live article. Leave fields empty if you do not want these shown.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Button text (what readers click)</span>
                  <input type="text" value={draft.ctaLabel} onChange={(event) => updateDraft('ctaLabel', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" placeholder="Example: Join the Masterclass" />
                  <span className="mt-1 block text-xs text-gray-500">Use short action words like Join, Watch, Read, or Start.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Button link (where it goes)</span>
                  <select value={selectedInternalCtaValue} onChange={(event) => {
                    if (!event.target.value) {
                      return;
                    }

                    updateDraft('ctaUrl', event.target.value);
                  }} className="mb-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900">
                    <option value="">Quick pick a page on this site</option>
                    {INTERNAL_LINK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input type="url" value={draft.ctaUrl} onChange={(event) => updateDraft('ctaUrl', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" placeholder="Example: /masterclass or https://example.com" />
                  <span className="mt-1 block text-xs text-gray-500">Pick an internal page above, or paste any external website link below. The button appears only when both button text and button link are filled in.</span>
                  {errors.ctaUrl ? <span className="mt-1 block text-sm text-red-700">{errors.ctaUrl}</span> : null}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Choose from podcast library (auto-fills title + link)</span>
                  <select value={selectedPodcastEpisodeId} onChange={(event) => applyPodcastSelection(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900" disabled={isLoadingPodcastOptions || podcastOptions.length === 0}>
                    <option value="">{isLoadingPodcastOptions ? 'Loading podcast episodes...' : 'Select a podcast episode'}</option>
                    {podcastOptions.map((episode) => (
                      <option key={episode.id} value={episode.id}>{episode.title}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-gray-500">Selecting an episode links to your podcast page and attempts to start that episode automatically.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Podcast card title (optional)</span>
                  <input type="text" value={draft.relatedPodcastTitle} onChange={(event) => updateDraft('relatedPodcastTitle', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" placeholder="Example: Episode 14: Transition Without Losing Yourself" />
                  <span className="mt-1 block text-xs text-gray-500">If left blank, a default podcast title will be used.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Podcast link (optional)</span>
                  <input type="url" value={draft.relatedPodcastUrl} onChange={(event) => updateDraft('relatedPodcastUrl', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" placeholder="Example: /podcast/?episode=123&autoplay=1 or https://open.spotify.com/..." />
                  <span className="mt-1 block text-xs text-gray-500">You can keep the auto-filled internal link, or replace it with any external podcast link.</span>
                  {errors.relatedPodcastUrl ? <span className="mt-1 block text-sm text-red-700">{errors.relatedPodcastUrl}</span> : null}
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <button type="button" onClick={() => setSearchSocialOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-brandBlue">
              <span>Search & Social</span>
              <span>{searchSocialOpen ? 'Hide' : 'Show'}</span>
            </button>

            {searchSocialOpen ? (
              <div className="mt-4 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">SEO title</span>
                  <input type="text" value={draft.seoTitle} onChange={(event) => updateDraft('seoTitle', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Meta description (recommended under 160 chars)</span>
                  <textarea value={draft.seoDescription} onChange={(event) => updateDraft('seoDescription', event.target.value)} className="min-h-[90px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
                  <span className="mt-1 block text-xs text-gray-500">{draft.seoDescription.length}/160</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Social sharing image</span>
                  <input type="file" accept="image/*" onChange={(event) => void handleSocialImageUpload(event)} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Canonical URL (optional)</span>
                  <input type="url" value={draft.canonicalUrl} onChange={(event) => updateDraft('canonicalUrl', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Social caption (optional)</span>
                  <textarea value={draft.socialCaption} onChange={(event) => updateDraft('socialCaption', event.target.value)} className="min-h-[90px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900" />
                </label>

                <div className="rounded-2xl border border-[#d9e9f2] bg-[#f8fcff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#003E68]">Open Graph preview</p>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="h-20 w-28 overflow-hidden rounded-xl bg-slate-200">
                      {(draft.socialImageUrl || draft.featuredImageUrl) ? <img src={draft.socialImageUrl || draft.featuredImageUrl || ''} alt="OG preview" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-[#10162A]">{draft.seoTitle || draft.title || 'Blog title'}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-[#405364]">{draft.seoDescription || draft.deck || 'Meta description will appear here.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className={`${previewTab === 'edit' ? 'hidden xl:block' : ''}`}>
          <div className="sticky top-4 space-y-3">
            <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-full border border-gray-200 p-1">
                  <button type="button" onClick={() => setPreviewViewport('desktop')} className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${previewViewport === 'desktop' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Desktop</button>
                  <button type="button" onClick={() => setPreviewViewport('tablet')} className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${previewViewport === 'tablet' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Tablet</button>
                  <button type="button" onClick={() => setPreviewViewport('mobile')} className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${previewViewport === 'mobile' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Mobile</button>
                </div>
                <button type="button" onClick={() => setPreviewCollapsed((current) => !current)} className="min-h-11 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brandBlue hover:text-brandBlue">{previewCollapsed ? 'Expand preview' : 'Collapse preview'}</button>
              </div>
            </div>

            {!previewCollapsed ? preview : null}
          </div>
        </div>
      </div>

      <div className="xl:hidden">
        <div className="inline-flex rounded-full border border-gray-200 p-1">
          <button type="button" onClick={() => setPreviewTab('edit')} className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold ${previewTab === 'edit' ? 'bg-slate-950 text-white' : 'text-slate-700'}`}>Edit</button>
          <button type="button" onClick={() => setPreviewTab('preview')} className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold ${previewTab === 'preview' ? 'bg-slate-950 text-white' : 'text-slate-700'}`}>Preview</button>
        </div>
      </div>
    </div>
  );
}
