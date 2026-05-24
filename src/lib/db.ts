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
