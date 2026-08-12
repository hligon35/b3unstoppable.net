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

INSERT INTO blog_posts (
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
  social_caption
) VALUES (
  'Client Preview: Burn, Break, Become Through Transition',
  'client-preview-burn-break-become-transition',
  'A practical editorial preview post showing how your team can draft, structure, and publish a full B3U journal article from start to finish.',
  'Dr. Bree Charles',
  'Burn, Break, Become',
  '["leadership","transformation","resilience","b3u"]',
  'published',
  CURRENT_TIMESTAMP,
  '/images/events/flyer.png',
  'B3U event flyer image',
  'Momentum starts when clarity meets commitment.',
  NULL,
  '## The Shift Begins
Most people do not fail because they lack talent. They stall because they carry yesterday''s story into tomorrow''s opportunity.

### What Changes Outcomes
- Name the pattern
- Interrupt the pattern
- Replace the pattern with a repeatable practice

> Change becomes real when behavior changes before confidence catches up.

1. Choose one small action.
2. Repeat it daily for 7 days.

Use **bold** words when you want strong emphasis, and *italic* words for a softer tone.

[Join the Masterclass](/masterclass)

![B3U event image](https://image.url)',
  'In a room full of high performers, one leader admitted she had mastered execution but avoided visibility. That confession became the beginning of her next chapter.',
  'Burn: Release the Old Script',
  'Burn the identity that only knows how to survive. Let go of the habit of shrinking to stay comfortable.',
  'Break: Interrupt the Cycle',
  'Break the loops that keep you rehearsing fear. Replace reaction with intentional response.',
  'Become: Build the Future Self',
  'Become the person your next assignment requires. Practice the behaviors before the title arrives.',
  'Your next level is not a mystery. It is a decision repeated daily.',
  'What identity are you still protecting that your future no longer needs?',
  'Join the Masterclass',
  '/masterclass',
  'Episode 14: Transition Without Losing Yourself',
  '/podcast',
  'Burn, Break, Become: A Transition Playbook | B3U',
  'Explore a practical Burn, Break, Become framework for navigating career and identity transitions with confidence and action.',
  '',
  'A practical framework for your next chapter.'
)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  deck = excluded.deck,
  author = excluded.author,
  category = excluded.category,
  tags_json = excluded.tags_json,
  status = 'published',
  publish_at = CURRENT_TIMESTAMP,
  featured_image_url = excluded.featured_image_url,
  featured_image_alt = excluded.featured_image_alt,
  featured_image_caption = excluded.featured_image_caption,
  social_image_url = excluded.social_image_url,
  content_markdown = excluded.content_markdown,
  opening_story = excluded.opening_story,
  burn_title = excluded.burn_title,
  burn_body = excluded.burn_body,
  break_title = excluded.break_title,
  break_body = excluded.break_body,
  become_title = excluded.become_title,
  become_body = excluded.become_body,
  pull_quote = excluded.pull_quote,
  reflection_question = excluded.reflection_question,
  cta_label = excluded.cta_label,
  cta_url = excluded.cta_url,
  related_podcast_title = excluded.related_podcast_title,
  related_podcast_url = excluded.related_podcast_url,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  canonical_url = excluded.canonical_url,
  social_caption = excluded.social_caption,
  updated_at = CURRENT_TIMESTAMP;

SELECT id, slug, status, publish_at, updated_at FROM blog_posts WHERE slug = 'client-preview-burn-break-become-transition' ORDER BY id DESC LIMIT 1;
