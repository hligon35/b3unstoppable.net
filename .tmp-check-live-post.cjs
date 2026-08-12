const Database = require('better-sqlite3');
const db = new Database('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a7627861d0fac036cdc69630a2b3c69c74ee42295bc4d380df84edfc6a86dde1.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(tables.map((t) => t.name));
if (tables.some((t) => t.name === 'blog_posts')) {
  console.log(db.prepare('SELECT id,title,slug,status,publish_at FROM blog_posts ORDER BY id DESC LIMIT 5').all());
}
