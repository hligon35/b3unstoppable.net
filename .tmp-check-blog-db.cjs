const Database = require("better-sqlite3");
const files = ["data/app.db", ".open-next/server-functions/default/data/app.db"];

for (const file of files) {
  try {
    const db = new Database(file, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(`\nDB: ${file}`);
    console.log(tables.map((t) => t.name).join(", ") || "(no tables)");

    if (tables.some((t) => t.name === "blog_posts")) {
      const rows = db
        .prepare("SELECT slug, title, status, publish_at FROM blog_posts ORDER BY datetime(COALESCE(publish_at, created_at)) DESC")
        .all();
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (error) {
    console.log(`\nDB: ${file} ERROR ${error.message}`);
  }
}
