import Database from 'better-sqlite3';
import path from 'path';
import { getCloudflareContext } from '@opennextjs/cloudflare';

type SubscriberRow = {
  id: number;
  email: string;
  created_at: string;
};

type AnalyticsRow = {
  path: string;
  views: number;
  date: string;
};

type SummaryRow = {
  count: number;
  label: string;
};

type AdminCredentialRow = {
  username: string;
  password_hash: string;
  updated_at: string;
};

type AdminPasswordResetRow = {
  id: number;
  username: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type SiteContentRow = {
  content_key: string;
  content_json: string;
  updated_at: string;
};

type ScheduledNewsletterRow = {
  id: number;
  subject: string;
  body_text: string;
  recipient_emails_json: string;
  recipient_count: number;
  scheduled_for: string;
  status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

type BlogPostRow = {
  id: number;
  title: string;
  slug: string;
  deck: string;
  author: string;
  category: string;
  tags_json: string;
  status: string;
  publish_at: string | null;
  featured_image_url: string | null;
  featured_image_alt: string;
  featured_image_caption: string | null;
  social_image_url: string | null;
  content_markdown: string;
  opening_story: string;
  burn_title: string;
  burn_body: string;
  break_title: string;
  break_body: string;
  become_title: string;
  become_body: string;
  pull_quote: string;
  reflection_question: string;
  cta_label: string;
  cta_url: string;
  related_podcast_title: string;
  related_podcast_url: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  social_caption: string;
  created_at: string;
  updated_at: string;
};

type BlogCommentRow = {
  id: number;
  post_id: number;
  parent_comment_id: number | null;
  status: string;
  is_email_verified: number;
  author_name: string;
  author_email: string;
  author_website: string | null;
  body: string;
  ip_hash: string;
  user_agent_hash: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  moderated_at: string | null;
};

type BlogCommentVerificationRow = {
  id: number;
  comment_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type BlogCommentReportRow = {
  id: number;
  comment_id: number;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  reporter_ip_hash: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

type BlogCommentReactionRow = {
  id: number;
  comment_id: number;
  reaction_type: string;
  fingerprint_hash: string;
  created_at: string;
};

type BlogCommentModerationEventRow = {
  id: number;
  comment_id: number;
  admin_username: string;
  action: string;
  note: string | null;
  created_at: string;
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all<T = unknown>(): Promise<D1LikeResult<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  exec: (query: string) => Promise<unknown>;
  batch: (statements: D1PreparedStatement[]) => Promise<unknown>;
};

type BetterSqliteDatabase = Database.Database;
type D1LikeResult<T> = {
  results?: T[];
};

type DashboardDatabase = D1Database | BetterSqliteDatabase;

const DASHBOARD_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    language TEXT,
    screen_size TEXT,
    ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_credentials (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS site_content (
    content_key TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS scheduled_newsletters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    recipient_emails_json TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    scheduled_for DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    deck TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    publish_at DATETIME,
    featured_image_url TEXT,
    featured_image_alt TEXT NOT NULL DEFAULT '',
    featured_image_caption TEXT,
    social_image_url TEXT,
    content_markdown TEXT NOT NULL DEFAULT '',
    opening_story TEXT NOT NULL DEFAULT '',
    burn_title TEXT NOT NULL DEFAULT '',
    burn_body TEXT NOT NULL DEFAULT '',
    break_title TEXT NOT NULL DEFAULT '',
    break_body TEXT NOT NULL DEFAULT '',
    become_title TEXT NOT NULL DEFAULT '',
    become_body TEXT NOT NULL DEFAULT '',
    pull_quote TEXT NOT NULL DEFAULT '',
    reflection_question TEXT NOT NULL DEFAULT '',
    cta_label TEXT NOT NULL DEFAULT '',
    cta_url TEXT NOT NULL DEFAULT '',
    related_podcast_title TEXT NOT NULL DEFAULT '',
    related_podcast_url TEXT NOT NULL DEFAULT '',
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    canonical_url TEXT NOT NULL DEFAULT '',
    social_caption TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS blog_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_comment_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'pending_moderation', 'approved', 'rejected', 'hidden', 'deleted')),
    is_email_verified INTEGER NOT NULL DEFAULT 0,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_website TEXT,
    body TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    user_agent_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    moderated_at DATETIME,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
    CHECK (parent_comment_id IS NULL OR parent_comment_id > 0)
  )`,
  `CREATE TABLE IF NOT EXISTS blog_comment_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS blog_comment_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    reporter_email TEXT,
    reporter_ip_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by TEXT,
    FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS blog_comment_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('support', 'insight', 'fire')),
    fingerprint_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
    UNIQUE(comment_id, reaction_type, fingerprint_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS blog_comment_moderation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status_created ON blog_comments(post_id, status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_comment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_comment_verifications_comment ON blog_comment_verifications(comment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_comment_reports_comment_status ON blog_comment_reports(comment_id, status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_comment_reactions_comment_type ON blog_comment_reactions(comment_id, reaction_type)`
];

const DASHBOARD_SCHEMA_SQL = `${DASHBOARD_SCHEMA_STATEMENTS.join(';\n\n')};`;

declare global {
  var __b3uDb: BetterSqliteDatabase | undefined;
  var __b3uD1SchemaReady: Promise<void> | undefined;
}

function initializeCloudflareSchema(cloudflareDb: D1Database) {
  return cloudflareDb
    .batch(DASHBOARD_SCHEMA_STATEMENTS.map((statement) => cloudflareDb.prepare(statement)))
    .then(() => undefined)
    .catch((error) => {
      global.__b3uD1SchemaReady = undefined;
      throw error;
    });
}

function getCloudflareDb(): D1Database | null {
  try {
    const context = getCloudflareContext();
    const env = context?.env as Record<string, unknown> | undefined;
    return (env?.B3U_DB as D1Database | undefined) ?? null;
  } catch {
    return null;
  }
}

function getLocalDb() {
  if (!global.__b3uDb) {
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    const db = new Database(dbPath);

    db.exec(DASHBOARD_SCHEMA_SQL);

    global.__b3uDb = db;
  }

  return global.__b3uDb;
}

async function getDb(): Promise<DashboardDatabase> {
  const cloudflareDb = getCloudflareDb();

  if (cloudflareDb) {
    if (!global.__b3uD1SchemaReady) {
      global.__b3uD1SchemaReady = initializeCloudflareSchema(cloudflareDb);
    }

    await global.__b3uD1SchemaReady;
    return cloudflareDb;
  }

  return getLocalDb();
}

function isD1Database(db: DashboardDatabase): db is D1Database {
  return typeof (db as D1Database).batch === 'function';
}

async function queryAll<T>(query: string, bindings: unknown[] = []) {
  const db = await getDb();

  if (isD1Database(db)) {
    const result = await db.prepare(query).bind(...bindings).all<T>();
    return (result as D1LikeResult<T>).results ?? [];
  }

  return db.prepare(query).all(...bindings) as T[];
}

async function queryFirst<T>(query: string, bindings: unknown[] = []) {
  const db = await getDb();

  if (isD1Database(db)) {
    const result = await db.prepare(query).bind(...bindings).first<T>();
    return result ?? null;
  }

  return (db.prepare(query).get(...bindings) as T | undefined) ?? null;
}

async function execute(query: string, bindings: unknown[] = []) {
  const db = await getDb();

  if (isD1Database(db)) {
    return db.prepare(query).bind(...bindings).run();
  }

  return db.prepare(query).run(...bindings);
}

function getResultChanges(result: unknown) {
  if (result && typeof result === 'object') {
    if ('changes' in result && typeof result.changes === 'number') {
      return result.changes;
    }

    if (
      'meta' in result &&
      result.meta &&
      typeof result.meta === 'object' &&
      'changes' in result.meta &&
      typeof result.meta.changes === 'number'
    ) {
      return result.meta.changes;
    }
  }

  return 0;
}

async function executeChanges(query: string, bindings: unknown[] = []) {
  return getResultChanges(await execute(query, bindings));
}

export async function insertSubscriber(email: string) {
  return execute('INSERT OR IGNORE INTO subscribers (email) VALUES (?)', [email]);
}

export async function deleteSubscriber(id: number) {
  return executeChanges('DELETE FROM subscribers WHERE id = ?', [id]);
}

export async function getSubscribers() {
  return queryAll<SubscriberRow>('SELECT id, email, created_at FROM subscribers ORDER BY created_at DESC');
}

export async function insertPageView(data: {
  path: string;
  referrer?: string;
  userAgent?: string;
  language?: string;
  screenSize?: string;
  ip?: string;
}) {
  return execute(
    `INSERT INTO analytics (path, referrer, user_agent, language, screen_size, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.path, data.referrer ?? '', data.userAgent ?? '', data.language ?? '', data.screenSize ?? '', data.ip ?? ''],
  );
}

export async function getAnalytics() {
  return queryAll<AnalyticsRow>(
    `SELECT path, COUNT(*) as views, DATE(timestamp) as date
     FROM analytics
     GROUP BY path, DATE(timestamp)
     ORDER BY date DESC, views DESC`,
  );
}

export async function getTotalViews() {
  return (await queryFirst<{ total: number }>('SELECT COUNT(*) as total FROM analytics')) ?? { total: 0 };
}

async function getSummary(query: string) {
  return queryAll<SummaryRow>(query);
}

export async function getTopReferrers() {
  return getSummary(
    `SELECT referrer as label, COUNT(*) as count
     FROM analytics
     WHERE referrer IS NOT NULL AND referrer != ''
     GROUP BY referrer
     ORDER BY count DESC
     LIMIT 10`,
  );
}

export async function getTopBrowsers() {
  return getSummary(
    `SELECT CASE
        WHEN user_agent LIKE '%Chrome%' THEN 'Chrome'
        WHEN user_agent LIKE '%Firefox%' THEN 'Firefox'
        WHEN user_agent LIKE '%Safari%' THEN 'Safari'
        WHEN user_agent LIKE '%Edge%' THEN 'Edge'
        ELSE 'Other'
      END as label,
      COUNT(*) as count
     FROM analytics
     GROUP BY label
     ORDER BY count DESC`,
  );
}

export async function getDeviceTypes() {
  return getSummary(
    `SELECT CASE
        WHEN user_agent LIKE '%Mobile%' THEN 'Mobile'
        WHEN user_agent LIKE '%Tablet%' THEN 'Tablet'
        ELSE 'Desktop'
      END as label,
      COUNT(*) as count
     FROM analytics
     GROUP BY label
     ORDER BY count DESC`,
  );
}

export async function getAdminCredential(username: string) {
  return queryFirst<AdminCredentialRow>(
    'SELECT username, password_hash, updated_at FROM admin_credentials WHERE username = ?',
    [username],
  );
}

export async function saveAdminCredential(username: string, passwordHash: string) {
  return execute(
    `INSERT INTO admin_credentials (username, password_hash, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, updated_at = CURRENT_TIMESTAMP`,
    [username, passwordHash],
  );
}

export async function invalidateAdminPasswordResets(username: string) {
  return execute('UPDATE admin_password_resets SET used_at = CURRENT_TIMESTAMP WHERE username = ? AND used_at IS NULL', [username]);
}

export async function createAdminPasswordReset(username: string, tokenHash: string, expiresAt: string) {
  return execute(
    'INSERT INTO admin_password_resets (username, token_hash, expires_at) VALUES (?, ?, ?)',
    [username, tokenHash, expiresAt],
  );
}

export async function getAdminPasswordResetByTokenHash(tokenHash: string) {
  return queryFirst<AdminPasswordResetRow>(
    `SELECT id, username, token_hash, expires_at, used_at, created_at
     FROM admin_password_resets
     WHERE token_hash = ?`,
    [tokenHash],
  );
}

export async function markAdminPasswordResetUsed(id: number) {
  return execute('UPDATE admin_password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL', [id]);
}

export async function getSiteContentRecord(contentKey: string) {
  return queryFirst<SiteContentRow>(
    'SELECT content_key, content_json, updated_at FROM site_content WHERE content_key = ?',
    [contentKey],
  );
}

export async function saveSiteContentRecord(contentKey: string, contentJson: string) {
  return execute(
    `INSERT INTO site_content (content_key, content_json, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(content_key) DO UPDATE SET content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP`,
    [contentKey, contentJson],
  );
}

export async function createScheduledNewsletterRecord(params: {
  subject: string;
  bodyText: string;
  recipientEmailsJson: string;
  recipientCount: number;
  scheduledFor: string;
}) {
  await execute(
    `INSERT INTO scheduled_newsletters (
      subject,
      body_text,
      recipient_emails_json,
      recipient_count,
      scheduled_for,
      status,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP)`,
    [params.subject, params.bodyText, params.recipientEmailsJson, params.recipientCount, params.scheduledFor],
  );

  return queryFirst<ScheduledNewsletterRow>(
    `SELECT id, subject, body_text, recipient_emails_json, recipient_count, scheduled_for, status, last_error, created_at, updated_at, sent_at
     FROM scheduled_newsletters
     ORDER BY id DESC
     LIMIT 1`,
  );
}

export async function getScheduledNewsletterRecords(limit = 20) {
  return queryAll<ScheduledNewsletterRow>(
    `SELECT id, subject, body_text, recipient_emails_json, recipient_count, scheduled_for, status, last_error, created_at, updated_at, sent_at
     FROM scheduled_newsletters
     ORDER BY scheduled_for ASC, id ASC
     LIMIT ?`,
    [limit],
  );
}

export async function getScheduledNewsletterRecordById(id: number) {
  return queryFirst<ScheduledNewsletterRow>(
    `SELECT id, subject, body_text, recipient_emails_json, recipient_count, scheduled_for, status, last_error, created_at, updated_at, sent_at
     FROM scheduled_newsletters
     WHERE id = ?`,
    [id],
  );
}

export async function getDueScheduledNewsletterRecords(limit = 8) {
  return queryAll<ScheduledNewsletterRow>(
    `SELECT id, subject, body_text, recipient_emails_json, recipient_count, scheduled_for, status, last_error, created_at, updated_at, sent_at
     FROM scheduled_newsletters
     WHERE status = 'scheduled' AND scheduled_for <= CURRENT_TIMESTAMP
     ORDER BY scheduled_for ASC, id ASC
     LIMIT ?`,
    [limit],
  );
}

export async function claimScheduledNewsletterRecord(id: number) {
  const changes = await executeChanges(
    `UPDATE scheduled_newsletters
     SET status = 'processing', last_error = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'scheduled'`,
    [id],
  );

  return changes > 0;
}

export async function markScheduledNewsletterRecordSent(id: number) {
  return execute(
    `UPDATE scheduled_newsletters
     SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, last_error = NULL
     WHERE id = ?`,
    [id],
  );
}

export async function markScheduledNewsletterRecordFailed(id: number, errorMessage: string) {
  return execute(
    `UPDATE scheduled_newsletters
     SET status = 'failed', last_error = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [errorMessage, id],
  );
}

export async function resetScheduledNewsletterRecordToScheduled(id: number, errorMessage: string) {
  return execute(
    `UPDATE scheduled_newsletters
     SET status = 'scheduled', last_error = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [errorMessage, id],
  );
}

export async function updateScheduledNewsletterRecord(params: {
  id: number;
  subject: string;
  bodyText: string;
  recipientEmailsJson: string;
  recipientCount: number;
  scheduledFor: string;
}) {
  const changes = await executeChanges(
    `UPDATE scheduled_newsletters
     SET subject = ?,
         body_text = ?,
         recipient_emails_json = ?,
         recipient_count = ?,
         scheduled_for = ?,
         status = 'scheduled',
         last_error = NULL,
         updated_at = CURRENT_TIMESTAMP,
         sent_at = NULL
     WHERE id = ? AND status IN ('scheduled', 'failed')`,
    [
      params.subject,
      params.bodyText,
      params.recipientEmailsJson,
      params.recipientCount,
      params.scheduledFor,
      params.id,
    ],
  );

  return changes > 0;
}

export async function deleteScheduledNewsletterRecord(id: number) {
  const changes = await executeChanges(
    'DELETE FROM scheduled_newsletters WHERE id = ?',
    [id],
  );

  return changes > 0;
}

export async function listBlogPostRows(params?: {
  query?: string;
  status?: string;
  category?: string;
  limit?: number;
}) {
  const searchQuery = params?.query?.trim();
  const status = params?.status?.trim();
  const category = params?.category?.trim();
  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (searchQuery) {
    filters.push('title LIKE ?');
    bindings.push(`%${searchQuery}%`);
  }

  if (status && status !== 'all') {
    filters.push('status = ?');
    bindings.push(status);
  }

  if (category && category !== 'all') {
    filters.push('category = ?');
    bindings.push(category);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(200, params?.limit ?? 100));

  bindings.push(limit);

  return queryAll<BlogPostRow>(
    `SELECT id, title, slug, deck, author, category, tags_json, status, publish_at, featured_image_url, featured_image_alt, featured_image_caption, social_image_url,
            content_markdown, opening_story, burn_title, burn_body, break_title, break_body, become_title, become_body, pull_quote, reflection_question,
            cta_label, cta_url, related_podcast_title, related_podcast_url, seo_title, seo_description, canonical_url, social_caption, created_at, updated_at
     FROM blog_posts
     ${whereClause}
     ORDER BY updated_at DESC, id DESC
     LIMIT ?`,
    bindings,
  );
}

export async function listBlogPostCategories() {
  return queryAll<{ category: string }>(
    `SELECT DISTINCT category
     FROM blog_posts
     WHERE category IS NOT NULL AND category != ''
     ORDER BY category COLLATE NOCASE ASC`,
  );
}

export async function getBlogPostRowById(id: number) {
  return queryFirst<BlogPostRow>(
    `SELECT id, title, slug, deck, author, category, tags_json, status, publish_at, featured_image_url, featured_image_alt, featured_image_caption, social_image_url,
            content_markdown, opening_story, burn_title, burn_body, break_title, break_body, become_title, become_body, pull_quote, reflection_question,
            cta_label, cta_url, related_podcast_title, related_podcast_url, seo_title, seo_description, canonical_url, social_caption, created_at, updated_at
     FROM blog_posts
     WHERE id = ?`,
    [id],
  );
}

export async function getBlogPostRowBySlug(slug: string) {
  return queryFirst<BlogPostRow>(
    `SELECT id, title, slug, deck, author, category, tags_json, status, publish_at, featured_image_url, featured_image_alt, featured_image_caption, social_image_url,
            content_markdown, opening_story, burn_title, burn_body, break_title, break_body, become_title, become_body, pull_quote, reflection_question,
            cta_label, cta_url, related_podcast_title, related_podcast_url, seo_title, seo_description, canonical_url, social_caption, created_at, updated_at
     FROM blog_posts
     WHERE slug = ?`,
    [slug],
  );
}

export async function createBlogPostRow(params: {
  title: string;
  slug: string;
  deck: string;
  author: string;
  category: string;
  tagsJson: string;
  status: string;
  publishAt: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  featuredImageCaption: string | null;
  socialImageUrl: string | null;
  contentMarkdown: string;
  openingStory: string;
  burnTitle: string;
  burnBody: string;
  breakTitle: string;
  breakBody: string;
  becomeTitle: string;
  becomeBody: string;
  pullQuote: string;
  reflectionQuestion: string;
  ctaLabel: string;
  ctaUrl: string;
  relatedPodcastTitle: string;
  relatedPodcastUrl: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  socialCaption: string;
}) {
  await execute(
    `INSERT INTO blog_posts (
      title,
      slug,
      deck,
      author,
      category,
      tags_json,
      status,
      publish_at,
      featured_image_url,
      featured_image_alt,
      featured_image_caption,
      social_image_url,
      content_markdown,
      opening_story,
      burn_title,
      burn_body,
      break_title,
      break_body,
      become_title,
      become_body,
      pull_quote,
      reflection_question,
      cta_label,
      cta_url,
      related_podcast_title,
      related_podcast_url,
      seo_title,
      seo_description,
      canonical_url,
      social_caption,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      params.title,
      params.slug,
      params.deck,
      params.author,
      params.category,
      params.tagsJson,
      params.status,
      params.publishAt,
      params.featuredImageUrl,
      params.featuredImageAlt,
      params.featuredImageCaption,
      params.socialImageUrl,
      params.contentMarkdown,
      params.openingStory,
      params.burnTitle,
      params.burnBody,
      params.breakTitle,
      params.breakBody,
      params.becomeTitle,
      params.becomeBody,
      params.pullQuote,
      params.reflectionQuestion,
      params.ctaLabel,
      params.ctaUrl,
      params.relatedPodcastTitle,
      params.relatedPodcastUrl,
      params.seoTitle,
      params.seoDescription,
      params.canonicalUrl,
      params.socialCaption,
    ],
  );

  return queryFirst<BlogPostRow>(
    `SELECT id, title, slug, deck, author, category, tags_json, status, publish_at, featured_image_url, featured_image_alt, featured_image_caption, social_image_url,
            content_markdown, opening_story, burn_title, burn_body, break_title, break_body, become_title, become_body, pull_quote, reflection_question,
            cta_label, cta_url, related_podcast_title, related_podcast_url, seo_title, seo_description, canonical_url, social_caption, created_at, updated_at
     FROM blog_posts
     WHERE id = (SELECT MAX(id) FROM blog_posts)`,
  );
}

export async function updateBlogPostRow(params: {
  id: number;
  title: string;
  slug: string;
  deck: string;
  author: string;
  category: string;
  tagsJson: string;
  status: string;
  publishAt: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  featuredImageCaption: string | null;
  socialImageUrl: string | null;
  contentMarkdown: string;
  openingStory: string;
  burnTitle: string;
  burnBody: string;
  breakTitle: string;
  breakBody: string;
  becomeTitle: string;
  becomeBody: string;
  pullQuote: string;
  reflectionQuestion: string;
  ctaLabel: string;
  ctaUrl: string;
  relatedPodcastTitle: string;
  relatedPodcastUrl: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  socialCaption: string;
}) {
  const changes = await executeChanges(
    `UPDATE blog_posts
     SET title = ?,
         slug = ?,
         deck = ?,
         author = ?,
         category = ?,
         tags_json = ?,
         status = ?,
         publish_at = ?,
         featured_image_url = ?,
         featured_image_alt = ?,
         featured_image_caption = ?,
         social_image_url = ?,
         content_markdown = ?,
         opening_story = ?,
         burn_title = ?,
         burn_body = ?,
         break_title = ?,
         break_body = ?,
         become_title = ?,
         become_body = ?,
         pull_quote = ?,
         reflection_question = ?,
         cta_label = ?,
         cta_url = ?,
         related_podcast_title = ?,
         related_podcast_url = ?,
         seo_title = ?,
         seo_description = ?,
         canonical_url = ?,
         social_caption = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      params.title,
      params.slug,
      params.deck,
      params.author,
      params.category,
      params.tagsJson,
      params.status,
      params.publishAt,
      params.featuredImageUrl,
      params.featuredImageAlt,
      params.featuredImageCaption,
      params.socialImageUrl,
      params.contentMarkdown,
      params.openingStory,
      params.burnTitle,
      params.burnBody,
      params.breakTitle,
      params.breakBody,
      params.becomeTitle,
      params.becomeBody,
      params.pullQuote,
      params.reflectionQuestion,
      params.ctaLabel,
      params.ctaUrl,
      params.relatedPodcastTitle,
      params.relatedPodcastUrl,
      params.seoTitle,
      params.seoDescription,
      params.canonicalUrl,
      params.socialCaption,
      params.id,
    ],
  );

  return changes > 0;
}

export async function deleteBlogPostRow(id: number) {
  const changes = await executeChanges('DELETE FROM blog_posts WHERE id = ?', [id]);
  return changes > 0;
}

export async function createBlogCommentRow(params: {
  postId: number;
  parentCommentId: number | null;
  authorName: string;
  authorEmail: string;
  authorWebsite: string | null;
  body: string;
  ipHash: string;
  userAgentHash: string;
}) {
  await execute(
    `INSERT INTO blog_comments (
      post_id,
      parent_comment_id,
      status,
      is_email_verified,
      author_name,
      author_email,
      author_website,
      body,
      ip_hash,
      user_agent_hash,
      updated_at
    ) VALUES (?, ?, 'pending_verification', 0, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      params.postId,
      params.parentCommentId,
      params.authorName,
      params.authorEmail,
      params.authorWebsite,
      params.body,
      params.ipHash,
      params.userAgentHash,
    ],
  );

  return queryFirst<BlogCommentRow>(
    `SELECT id, post_id, parent_comment_id, status, is_email_verified, author_name, author_email, author_website, body, ip_hash, user_agent_hash,
            created_at, updated_at, approved_at, moderated_at
     FROM blog_comments
     WHERE id = (SELECT MAX(id) FROM blog_comments)`,
  );
}

export async function getBlogCommentRowById(id: number) {
  return queryFirst<BlogCommentRow>(
    `SELECT id, post_id, parent_comment_id, status, is_email_verified, author_name, author_email, author_website, body, ip_hash, user_agent_hash,
            created_at, updated_at, approved_at, moderated_at
     FROM blog_comments
     WHERE id = ?`,
    [id],
  );
}

export async function listBlogCommentRowsByPostId(postId: number, statuses: string[] = ['approved']) {
  const validStatuses = statuses.filter(Boolean);

  if (!validStatuses.length) {
    return [] as BlogCommentRow[];
  }

  const placeholders = validStatuses.map(() => '?').join(', ');

  return queryAll<BlogCommentRow>(
    `SELECT id, post_id, parent_comment_id, status, is_email_verified, author_name, author_email, author_website, body, ip_hash, user_agent_hash,
            created_at, updated_at, approved_at, moderated_at
     FROM blog_comments
     WHERE post_id = ? AND status IN (${placeholders})
     ORDER BY created_at ASC, id ASC`,
    [postId, ...validStatuses],
  );
}

export async function updateBlogCommentStatus(params: {
  id: number;
  status: string;
  markApproved: boolean;
}) {
  const approvedAtSql = params.markApproved ? ', approved_at = CURRENT_TIMESTAMP' : '';
  const changes = await executeChanges(
    `UPDATE blog_comments
     SET status = ?, moderated_at = CURRENT_TIMESTAMP${approvedAtSql}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [params.status, params.id],
  );

  return changes > 0;
}

export async function markBlogCommentEmailVerified(id: number) {
  const changes = await executeChanges(
    `UPDATE blog_comments
     SET is_email_verified = 1,
         status = CASE WHEN status = 'pending_verification' THEN 'pending_moderation' ELSE status END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id],
  );

  return changes > 0;
}

export async function createBlogCommentVerificationRow(params: {
  commentId: number;
  tokenHash: string;
  expiresAt: string;
}) {
  await execute(
    `INSERT INTO blog_comment_verifications (comment_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [params.commentId, params.tokenHash, params.expiresAt],
  );

  return queryFirst<BlogCommentVerificationRow>(
    `SELECT id, comment_id, token_hash, expires_at, used_at, created_at
     FROM blog_comment_verifications
     WHERE token_hash = ?`,
    [params.tokenHash],
  );
}

export async function getBlogCommentVerificationByTokenHash(tokenHash: string) {
  return queryFirst<BlogCommentVerificationRow>(
    `SELECT id, comment_id, token_hash, expires_at, used_at, created_at
     FROM blog_comment_verifications
     WHERE token_hash = ?`,
    [tokenHash],
  );
}

export async function markBlogCommentVerificationUsed(id: number) {
  const changes = await executeChanges(
    'UPDATE blog_comment_verifications SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL',
    [id],
  );

  return changes > 0;
}

export async function createBlogCommentReportRow(params: {
  commentId: number;
  reason: string;
  details: string | null;
  reporterEmail: string | null;
  reporterIpHash: string;
}) {
  await execute(
    `INSERT INTO blog_comment_reports (
      comment_id,
      reason,
      details,
      reporter_email,
      reporter_ip_hash,
      status
    ) VALUES (?, ?, ?, ?, ?, 'open')`,
    [params.commentId, params.reason, params.details, params.reporterEmail, params.reporterIpHash],
  );

  return queryFirst<BlogCommentReportRow>(
    `SELECT id, comment_id, reason, details, reporter_email, reporter_ip_hash, status, created_at, resolved_at, resolved_by
     FROM blog_comment_reports
     WHERE id = (SELECT MAX(id) FROM blog_comment_reports)`,
  );
}

export async function listBlogCommentReportRowsByStatus(status: 'open' | 'resolved' | 'dismissed' | 'all' = 'open', limit = 200) {
  if (status === 'all') {
    return queryAll<BlogCommentReportRow>(
      `SELECT id, comment_id, reason, details, reporter_email, reporter_ip_hash, status, created_at, resolved_at, resolved_by
       FROM blog_comment_reports
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [limit],
    );
  }

  return queryAll<BlogCommentReportRow>(
    `SELECT id, comment_id, reason, details, reporter_email, reporter_ip_hash, status, created_at, resolved_at, resolved_by
     FROM blog_comment_reports
     WHERE status = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [status, limit],
  );
}

export async function updateBlogCommentReportStatus(params: {
  id: number;
  status: 'open' | 'resolved' | 'dismissed';
  resolvedBy: string | null;
}) {
  const changes = await executeChanges(
    `UPDATE blog_comment_reports
     SET status = ?,
         resolved_at = CASE WHEN ? IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE NULL END,
         resolved_by = CASE WHEN ? IN ('resolved', 'dismissed') THEN ? ELSE NULL END
     WHERE id = ?`,
    [params.status, params.status, params.status, params.resolvedBy, params.id],
  );

  return changes > 0;
}

export async function addBlogCommentReactionRow(params: {
  commentId: number;
  reactionType: string;
  fingerprintHash: string;
}) {
  await execute(
    `INSERT OR IGNORE INTO blog_comment_reactions (comment_id, reaction_type, fingerprint_hash)
     VALUES (?, ?, ?)`,
    [params.commentId, params.reactionType, params.fingerprintHash],
  );
}

export async function removeBlogCommentReactionRow(params: {
  commentId: number;
  reactionType: string;
  fingerprintHash: string;
}) {
  const changes = await executeChanges(
    `DELETE FROM blog_comment_reactions
     WHERE comment_id = ? AND reaction_type = ? AND fingerprint_hash = ?`,
    [params.commentId, params.reactionType, params.fingerprintHash],
  );

  return changes > 0;
}

export async function listBlogCommentReactionRowsByCommentIds(commentIds: number[]) {
  if (!commentIds.length) {
    return [] as BlogCommentReactionRow[];
  }

  const placeholders = commentIds.map(() => '?').join(', ');

  return queryAll<BlogCommentReactionRow>(
    `SELECT id, comment_id, reaction_type, fingerprint_hash, created_at
     FROM blog_comment_reactions
     WHERE comment_id IN (${placeholders})`,
    commentIds,
  );
}

export async function getBlogCommentReactionForFingerprint(params: {
  commentId: number;
  reactionType: string;
  fingerprintHash: string;
}) {
  return queryFirst<BlogCommentReactionRow>(
    `SELECT id, comment_id, reaction_type, fingerprint_hash, created_at
     FROM blog_comment_reactions
     WHERE comment_id = ? AND reaction_type = ? AND fingerprint_hash = ?`,
    [params.commentId, params.reactionType, params.fingerprintHash],
  );
}

export async function createBlogCommentModerationEventRow(params: {
  commentId: number;
  adminUsername: string;
  action: string;
  note: string | null;
}) {
  await execute(
    `INSERT INTO blog_comment_moderation_events (comment_id, admin_username, action, note)
     VALUES (?, ?, ?, ?)`,
    [params.commentId, params.adminUsername, params.action, params.note],
  );

  return queryFirst<BlogCommentModerationEventRow>(
    `SELECT id, comment_id, admin_username, action, note, created_at
     FROM blog_comment_moderation_events
     WHERE id = (SELECT MAX(id) FROM blog_comment_moderation_events)`,
  );
}

export async function listBlogCommentRowsForModeration(params?: {
  status?: string;
  postId?: number;
  limit?: number;
}) {
  const filters: string[] = [];
  const bindings: unknown[] = [];

  if (params?.status && params.status !== 'all') {
    filters.push('status = ?');
    bindings.push(params.status);
  }

  if (params?.postId) {
    filters.push('post_id = ?');
    bindings.push(params.postId);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(300, params?.limit ?? 150));
  bindings.push(limit);

  return queryAll<BlogCommentRow>(
    `SELECT id, post_id, parent_comment_id, status, is_email_verified, author_name, author_email, author_website, body, ip_hash, user_agent_hash,
            created_at, updated_at, approved_at, moderated_at
     FROM blog_comments
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    bindings,
  );
}
