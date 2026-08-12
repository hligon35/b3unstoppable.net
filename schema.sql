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

CREATE TABLE IF NOT EXISTS admin_credentials (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  content_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_newsletters (
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
);

CREATE TABLE IF NOT EXISTS blog_posts (
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
);

CREATE TABLE IF NOT EXISTS blog_comments (
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
);

CREATE TABLE IF NOT EXISTS blog_comment_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blog_comment_reports (
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
);

CREATE TABLE IF NOT EXISTS blog_comment_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('support', 'insight', 'fire')),
  fingerprint_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
  UNIQUE(comment_id, reaction_type, fingerprint_hash)
);

CREATE TABLE IF NOT EXISTS blog_comment_moderation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status_created ON blog_comments(post_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_blog_comment_verifications_comment ON blog_comment_verifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_blog_comment_reports_comment_status ON blog_comment_reports(comment_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comment_reactions_comment_type ON blog_comment_reactions(comment_id, reaction_type);