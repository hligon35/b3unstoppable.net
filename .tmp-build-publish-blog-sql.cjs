const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const localDbPath = path.join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', 'a7627861d0fac036cdc69630a2b3c69c74ee42295bc4d380df84edfc6a86dde1.sqlite');
const outSqlPath = path.join(process.cwd(), '.tmp-publish-blog.sql');
const slug = 'client-preview-burn-break-become-transition';

const db = new Database(localDbPath, { readonly: true });
const row = db.prepare('SELECT * FROM blog_posts WHERE slug = ? ORDER BY id DESC LIMIT 1').get(slug);

if (!row) {
  throw new Error(`No local blog row found for slug: ${slug}`);
}

const fields = [
  'title',
  'slug',
  'deck',
  'author',
  'category',
  'tags_json',
  'status',
  'publish_at',
  'featured_image_url',
  'featured_image_alt',
  'featured_image_caption',
  'social_image_url',
  'content_markdown',
  'opening_story',
  'burn_title',
  'burn_body',
  'break_title',
  'break_body',
  'become_title',
  'become_body',
  'pull_quote',
  'reflection_question',
  'cta_label',
  'cta_url',
  'related_podcast_title',
  'related_podcast_url',
  'seo_title',
  'seo_description',
  'canonical_url',
  'social_caption'
];

function sqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

const createTableSql = `CREATE TABLE IF NOT EXISTS blog_posts (
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
);`;

const insertColumns = fields.join(',\n  ');
const insertValues = fields.map((field) => {
  if (field === 'status') {
    return `'published'`;
  }

  if (field === 'publish_at') {
    return 'CURRENT_TIMESTAMP';
  }

  return sqlValue(row[field]);
}).join(',\n  ');

const updateAssignments = fields.map((field) => {
  if (field === 'slug') {
    return null;
  }

  if (field === 'status') {
    return "status = 'published'";
  }

  if (field === 'publish_at') {
    return 'publish_at = CURRENT_TIMESTAMP';
  }

  return `${field} = excluded.${field}`;
}).filter(Boolean).concat(['updated_at = CURRENT_TIMESTAMP']).join(',\n  ');

const upsertSql = `INSERT INTO blog_posts (
  ${insertColumns}
) VALUES (
  ${insertValues}
)
ON CONFLICT(slug) DO UPDATE SET
  ${updateAssignments};`;

const verifySql = `SELECT id, slug, status, publish_at, updated_at FROM blog_posts WHERE slug = '${slug}' ORDER BY id DESC LIMIT 1;`;

const fullSql = `${createTableSql}\n\n${upsertSql}\n\n${verifySql}\n`;
fs.writeFileSync(outSqlPath, fullSql, 'utf8');
console.log(`Wrote ${outSqlPath}`);
