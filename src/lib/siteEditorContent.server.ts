import { getSiteContentRecord, saveSiteContentRecord } from './db';
import { defaultSiteDraft, mergeSiteDraft, type SiteDraft } from './siteEditorContent';

const SITE_CONTENT_KEY = 'published-site-editor';

export type PublishedSitePageProps = {
  initialSiteDraft: SiteDraft;
  initialSiteUpdatedAt: string | null;
};

export async function getPublishedSiteDraft() {
  const record = await getSiteContentRecord(SITE_CONTENT_KEY);

  if (!record) {
    return { draft: defaultSiteDraft, updatedAt: null as string | null };
  }

  try {
    return {
      draft: mergeSiteDraft(JSON.parse(record.content_json)),
      updatedAt: record.updated_at,
    };
  } catch {
    return { draft: defaultSiteDraft, updatedAt: record.updated_at };
  }
}

export async function savePublishedSiteDraft(draft: SiteDraft) {
  await saveSiteContentRecord(SITE_CONTENT_KEY, JSON.stringify(draft));
  return getPublishedSiteDraft();
}

export async function getPublishedSitePageProps(): Promise<PublishedSitePageProps> {
  const published = await getPublishedSiteDraft();

  return {
    initialSiteDraft: published.draft,
    initialSiteUpdatedAt: published.updatedAt,
  };
}