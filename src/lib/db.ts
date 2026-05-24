import Database from 'better-sqlite3';
import path from 'path';

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

type BetterSqliteDatabase = Database.Database;

declare global {
  var __b3uDb: BetterSqliteDatabase | undefined;
}

function getDb() {
  if (!global.__b3uDb) {
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        referrer TEXT,
        user_agent TEXT,
        language TEXT,
        screen_size TEXT,
        ip TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    global.__b3uDb = db;
  }

  return global.__b3uDb;
}

export function insertSubscriber(email: string) {
  return getDb()
    .prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)')
    .run(email);
}

export function getSubscribers() {
  return getDb()
    .prepare('SELECT id, email, created_at FROM subscribers ORDER BY created_at DESC')
    .all() as SubscriberRow[];
}

export function insertPageView(data: {
  path: string;
  referrer?: string;
  userAgent?: string;
  language?: string;
  screenSize?: string;
  ip?: string;
}) {
  return getDb()
    .prepare(
      `INSERT INTO analytics (path, referrer, user_agent, language, screen_size, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(data.path, data.referrer ?? '', data.userAgent ?? '', data.language ?? '', data.screenSize ?? '', data.ip ?? '');
}

export function getAnalytics() {
  return getDb()
    .prepare(
      `SELECT path, COUNT(*) as views, DATE(timestamp) as date
       FROM analytics
       GROUP BY path, DATE(timestamp)
       ORDER BY date DESC, views DESC`,
    )
    .all() as AnalyticsRow[];
}

export function getTotalViews() {
  return getDb()
    .prepare('SELECT COUNT(*) as total FROM analytics')
    .get() as { total: number };
}

function getSummary(query: string) {
  return getDb().prepare(query).all() as SummaryRow[];
}

export function getTopReferrers() {
  return getSummary(
    `SELECT referrer as label, COUNT(*) as count
     FROM analytics
     WHERE referrer IS NOT NULL AND referrer != ''
     GROUP BY referrer
     ORDER BY count DESC
     LIMIT 10`,
  );
}

export function getTopBrowsers() {
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

export function getDeviceTypes() {
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
