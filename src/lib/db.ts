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
