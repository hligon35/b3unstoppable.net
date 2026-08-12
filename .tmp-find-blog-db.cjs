const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(db|sqlite|sqlite3)$/i.test(entry.name)) {
      out.push(full);
    }
  }
}

const files = [];
walk(process.cwd(), files);

for (const file of files) {
  try {
    const db = new Database(file, { readonly: true });
    const hasBlog = db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='blog_posts' LIMIT 1").get();
    if (hasBlog) {
      const rows = db.prepare("SELECT slug, status, publish_at FROM blog_posts ORDER BY id DESC LIMIT 5").all();
      console.log(`BLOG_DB: ${file}`);
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch {}
}
