# B3U Major Update — Initial Review

Branch: `major-update`
Date: 2026-09-14

This document is the required pre-implementation review. It captures current architecture,
what must be preserved, problems found, and the plan for the implementation phases that follow.
No secret values are included below — only variable/file names and behavior.

## 1. Current Architecture (confirmed)

- **Framework:** Next.js 15 (Pages Router) + TypeScript + React 19 + Tailwind CSS.
- **Deployment:** OpenNext (`@opennextjs/cloudflare`) building a Cloudflare Worker (`worker/index.ts`),
  which wraps the OpenNext handler and adds a `scheduled()` cron handler that calls
  `POST /api/newsletters/process` every minute (`triggers.crons: ["* * * * *"]` in `wrangler.jsonc`).
- **Database:** Cloudflare D1 binding `B3U_DB` (`src/lib/db.ts`), with a `better-sqlite3` local
  fallback (`data/app.db`) used only when no D1 binding is present (dev). Schema is created via
  `CREATE TABLE IF NOT EXISTS` statements embedded in `db.ts` (mirrors `schema.sql`), guarded by a
  cached in-memory promise to avoid duplicate `batch()` calls per isolate.
- **Auth:** Cookie-based admin sessions (`admin_auth`, HttpOnly/SameSite=Lax/Secure-in-prod, 2h
  expiry). Roles: `full` and `newsletter` (email-based role mapping for Google OAuth login only).
  Enforced in `src/middleware.ts` (route gate) and per-API via `isAuthenticatedRequest()` /
  `hasRequiredAdminRole()` in `src/lib/adminAuth.ts`.
- **Email:** Resend is the primary provider (`RESEND_API_KEY`, batch sending for newsletters,
  transactional sends for password reset / comment verification / contact). Google Apps Script
  (`formScript.gs`, `FORMS_BACKUP_URL`) is the documented backup/persistence path for forms.
- **Forms protection:** Turnstile verification + in-memory per-IP/UA rate limiting
  (`utils/security/formsProtection.ts`) + honeypot/timing fields, applied to contact/newsletter/
  submit/comment/report endpoints.
- **Blog/Journal:** Full CRUD (`src/lib/blogs.server.ts`), comments with email verification,
  reactions, reports, and an admin moderation queue (`src/pages/admin/blog/moderation.tsx`).
- **Newsletter:** Scheduling table (`scheduled_newsletters`), claim-then-send processing
  (`processDueNewsletters`) to avoid double sends, Resend batch delivery, cron-triggered via the
  Worker `scheduled()` handler.
- **Site Editor:** JSON content draft stored in D1 (`site_content` table), admin-only PUT, public
  GET for rendering.
- **Analytics:** Cloudflare GraphQL Analytics proxied through `/api/cf-analytics` (admin-only),
  rendered in `CloudflareAnalyticsPanel`. Distinct from the app's own request/error logging under
  `utils/debug/*` and `/api/debug/*`.
- **CI/CD:** 5 GitHub Actions workflows: two competing deploy workflows, a heartbeat monitor
  (every 30 min), a weekly report (Mon 13:00 UTC), and a scheduled podcast/YouTube content refresh.

## 2. Existing Functionality To Preserve

- All current public routes: `/`, `/about`, `/podcast`, `/community`, `/shop`, `/contact`,
  `/booking`, `/speaking`, `/masterclass`, `/event-gallery`, `/journal`, `/journal/[slug]`,
  `/login`, `/forgot-password`, `/reset-password`.
- Admin routes: `/admin` (tabs: Web Traffic, Newsletter, Blog, Site Editor, Help),
  `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]`, `/admin/blog/moderation`.
- Brand palette (`#7BAFD4` / `#CC5500` / `#0A1A2A`) and existing visual direction/messaging.
- Resend-primary / Apps-Script-backup email architecture — not replacing either.
- D1 as the production database — not replacing.
- PayPal as the existing (working) commerce integration on `/shop` — not adding Stripe/other
  processors; `@stripe/stripe-js` is an unused dependency (see §3).
- Trailing-slash URL convention (`trailingSlash: true` in `next.config.mjs`) — all existing links
  already use trailing slashes; sitemap/canonical fixes must keep this convention.

## 3. Problems Discovered

### Security / data exposure
1. **Sensitive/generated files are tracked in git**: `subscribers.csv`, `subscribers-live.csv`
   (real subscriber emails), `data/app.db` (local SQLite DB), `data/debug/alert-cache.json`,
   `data/debug/server-log.jsonl` are all committed (`git ls-files` confirms tracking) even though
   they are exactly the kind of generated/sensitive data `.gitignore` should exclude. They are not
   currently covered by any ignore rule.
   - `env.cloudflare` / `env.github` themselves are correctly gitignored and were verified to have
     **never** contained real secrets in git history (the historical committed version, before it
     was renamed to `env.cloudflare.example`, only had placeholder values) — no action needed there
     beyond keeping the ignore rule.
2. **No rate limiting on `POST /api/login`** (`src/server/admin/api/login.ts`) — brute-force risk
   against the single admin credential pair. Forms already have a reusable in-memory rate limiter
   (`utils/security/formsProtection.ts`) that isn't applied here.
3. **CSRF check on login/password-reset is optional** — only enforced if `process.env.CSRF_TOKEN`
   is set, and `CSRF_TOKEN` is not currently present in the managed `wrangler.jsonc` vars list.
   Flagged as a decision item (see §5) rather than silently changed, since making it mandatory
   without first provisioning the secret would lock out the real admin.
4. **PayPal client ID hardcoded and duplicated** in `src/pages/shop.tsx` and
   `src/components/SiteEditorPanel.tsx`. Not a secret (PayPal client IDs are public by design), but
   duplicated and not configurable without a code change.

### Deployment / workflow duplication
5. **Two competing deploy workflows** both trigger on `push: main`:
   `.github/workflows/deploy.yml` (Node 24, `npm run deploy`, uses `CF_ACCOUNT_ID`/`CF_ZONE_ID`/
   `WRANGLER_TOKEN` — none of which match the secret names actually consumed by
   `opennextjs-cloudflare`/wrangler) and `.github/workflows/deploy-cloudflare.yml` (Node 22,
   direct `opennextjs-cloudflare build`/`deploy`, correct `CLOUDFLARE_API_TOKEN` /
   `CLOUDFLARE_ACCOUNT_ID`, has `concurrency` + `workflow_dispatch` + `permissions`). `deploy.yml`
   is stale/broken and also triggers on a leftover feature branch (`newsletter-template-tabs`).
6. **`wrangler.toml`** (`name = "b3uv3"`, `compatibility_date = "2026-01-30"`) is a stale duplicate
   of `wrangler.jsonc` (`name = "b3unstoppable"`, `compatibility_date = "2026-05-24"`, full D1/
   assets/services/cron config). `wrangler.jsonc` is what OpenNext/wrangler actually reads.

### SEO / canonical host inconsistency
7. **Canonical host mismatch**: the deployed `NEXT_PUBLIC_SITE_URL` var in `wrangler.jsonc` is the
   apex domain (`https://b3unstoppable.net`, no `www`), but `src/lib/siteMetadata.ts`
   (`siteUrl`), `public/robots.txt` (Sitemap line), `public/sitemap.xml` (all `<loc>` entries), and
   the newsletter email footer/logo URLs in `src/lib/newsletters.ts` /
   `src/pages/newsletter-builder.tsx` all hardcode `www.b3unstoppable.net`. This produces
   inconsistent canonical tags, OG URLs, and sitemap entries vs. the actual configured host.
8. **`public/sitemap.xml` is missing routes**: `/journal`, `/booking`, `/speaking` are not listed
   (login/reset/admin/newsletter-builder are correctly excluded).
9. **`public/manifest.webmanifest` is empty** — no name/icons/theme-color, so "Add to Home Screen"
   / PWA metadata is broken.

### Documentation drift
10. **`README.md` "Pending / Next Feature Targets" table is outdated** — it lists Podcast Player,
    Newsletter Integration, SEO & Meta, Mobile Menu, etc. as `TODO`, but all of these already have
    working implementations in the codebase. It also documents a `STRIPE_PUBLIC_KEY`/
    `STRIPE_SECRET_KEY` env setup that isn't used anywhere and omits Turnstile, D1, admin roles,
    blog/newsletter admin, and monitoring env vars that are actually required.
11. **`DEBUG_SYSTEM.md`** doesn't reference the GitHub Actions monitoring workflows or their cron
    schedules, even though those workflows are the primary consumers of the monitoring endpoints.

### Minor / lower-risk
12. Unused dependency: `@stripe/stripe-js` is installed but never imported anywhere in the code
    (PayPal is the only active processor). Leaving as-is per "do not add a new payment processor /
    do not remove functionality without reason" — flagged only as dead weight, not removed unless
    requested, since removing a dependency someone may be mid-integrating on a feature branch is
    the kind of low-value churn the instructions ask to avoid.
13. `env.github` documents `RESEND_API_KEY` with a value that looks like a Resend **audience ID**
    format, not an API key — likely a copy/paste labeling mistake in the example doc only (no real
    secret at risk since example values aren't real keys); will correct the label.

## 4. Recommended Changes (this pass)

1. Untrack sensitive/generated files (`git rm --cached`) and extend `.gitignore` so they can't be
   re-committed; keep the local working copies untouched (no data is deleted).
2. Remove the stale `deploy.yml` workflow and `wrangler.toml`; keep `deploy-cloudflare.yml` and
   `wrangler.jsonc` as the single authoritative deploy/config path.
3. Add rate limiting to `POST /api/login` reusing the existing forms rate-limit helper.
4. Standardize canonical host on the apex domain (`https://b3unstoppable.net`, matching the actual
   deployed `NEXT_PUBLIC_SITE_URL`) across `siteMetadata.ts`, `robots.txt`, `sitemap.xml`, and the
   newsletter email templates; add the missing sitemap routes.
5. Populate `public/manifest.webmanifest` with real brand-consistent PWA metadata.
6. Centralize the PayPal client ID behind `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (falls back to the
   existing ID if the env var isn't set, so nothing breaks if it's not yet configured in
   Cloudflare) and update both call sites.
7. Rewrite `README.md` to reflect actual current architecture/routes/env vars/roles, and correct
   the `env.github` label noted above.
8. Re-run `typecheck`, `lint`, `test`, and `build`/`opennext:build` after changes; fix anything the
   change set breaks.

## 5. Risks / Decisions Requiring Attention (not silently changed)

- **CSRF_TOKEN enforcement**: making CSRF mandatory on login/password-reset is the right long-term
  fix, but `CSRF_TOKEN` is not currently provisioned in the Cloudflare vars. Enforcing it today
  would lock out the real admin. **Recommendation:** provision `CSRF_TOKEN` as a Cloudflare secret,
  then flip enforcement to mandatory in a follow-up change. Left as an explicit recommendation.
- **Git history for `subscribers-live.csv` / `data/app.db` / debug logs**: untracking the files
  stops *future* commits from including them, but the content remains in prior commits. Rewriting
  git history (e.g. `git filter-repo`/BFG) is a destructive, hard-to-reverse operation affecting a
  shared remote — **not performed without explicit approval**. Flagged for the user to decide.
- **`@stripe/stripe-js` dependency**: left installed but unused; removing it is low-risk but out of
  scope unless requested, per change-control guidance to avoid unrequested churn.
- **Blog/Markdown sanitization**: blog content is stored as markdown/plaintext with app-level
  sanitization helpers for comments (`blogEngagementShared.ts`), but there is no server-side HTML
  sanitizer pass on blog post body content itself — rendering safety currently depends on the
  frontend renderer escaping by default. Recommend confirming the markdown renderer used for
  `contentMarkdown` does not enable raw HTML passthrough; flagged for verification rather than a
  blind change, since altering the rendering pipeline touches all published posts.

## 6. Files Likely To Be Changed

- `.gitignore`, removal of tracked sensitive/generated files from the index.
- `.github/workflows/deploy.yml` (removed), `wrangler.toml` (removed).
- `src/server/admin/api/login.ts`, `utils/security/formsProtection.ts`.
- `src/lib/siteMetadata.ts`, `public/robots.txt`, `public/sitemap.xml`, `src/lib/newsletters.ts`,
  `src/pages/newsletter-builder.tsx`.
- `public/manifest.webmanifest`.
- `src/pages/shop.tsx`, `src/components/SiteEditorPanel.tsx`, `env.cloudflare.example`.
- `README.md`, `env.github`.

Implementation proceeds in the phases above; results and validation output will be recorded in
`major-update-report.md` at the end.
