# B3U — Burn, Break, Become Unstoppable

Production Next.js site for Dr. Bree Charles / B3U, deployed to Cloudflare Workers via OpenNext.

## Tech Stack
- Next.js 15 (Pages Router) + TypeScript + React 19
- Tailwind CSS (custom brand palette)
- Framer Motion + GSAP for animation
- OpenNext (`@opennextjs/cloudflare`) building a Cloudflare Worker (`worker/index.ts`)
- Cloudflare D1 (binding `B3U_DB`) as the production database, with a local SQLite fallback
  (`better-sqlite3`, `data/app.db`) for development only
- Resend for transactional/newsletter email, with Google Apps Script as a documented backup mailer
  and persistence layer for form submissions
- Cloudflare Turnstile for bot protection on public forms
- Cloudflare Web Analytics + a first-party Cloudflare GraphQL Analytics panel in the admin
- GitHub Actions for deployment and scheduled monitoring/content-refresh jobs

## Brand Tokens
```
Primary Blue:  #7BAFD4 (brandBlue)
Burnt Orange:  #CC5500 (brandOrange)
Navy Base:     #0A1A2A (navy)
```

## Routes

### Public
`/`, `/about`, `/podcast`, `/community`, `/shop`, `/contact`, `/booking`, `/speaking`,
`/masterclass`, `/event-gallery`, `/journal`, `/journal/[slug]`, `/login`, `/forgot-password`,
`/reset-password`.

### Admin (requires an authenticated session, enforced by `src/middleware.ts`)
`/admin` (tabs: Web Traffic, Newsletter, Blog, Site Editor, Help), `/admin/blog`,
`/admin/blog/new`, `/admin/blog/[id]`, `/admin/blog/moderation`.

Admin API routes live under `src/pages/api/**` as thin re-exports of implementations in
`src/server/admin/api/**`, and every handler enforces auth server-side via
`isAuthenticatedRequest()` / `hasRequiredAdminRole()` (`src/lib/adminAuth.ts`) — the middleware
page-gate is a UX convenience, not the security boundary.

## Admin Roles
Two roles, stored in the `admin_auth` session cookie (HttpOnly, SameSite=Lax, Secure in
production, 2h expiry):
- `full` — full dashboard access (blog, moderation, newsletter, site editor, analytics).
- `newsletter` — newsletter-only access. Assigned by email for Google OAuth logins
  (`NEWSLETTER_ONLY_EMAILS` in `src/lib/adminAuth.ts`); password login always issues `full`.

## Environment Variables
Copy `env.cloudflare.example` to `env.cloudflare` (gitignored) for local wrangler/dev use, or set
these as Cloudflare Worker vars/secrets and GitHub Actions secrets as noted below. No real values
are committed to this repository.

Key variables (see `env.cloudflare.example` for the full list):
- `NEXT_PUBLIC_SITE_URL` — canonical site origin (`https://b3unstoppable.net`).
- `NEXT_PUBLIC_FORMS_API` — should stay `/api/forms` so all forms go through the first-party API.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — password-login admin credentials.
- `CSRF_TOKEN` — optional but recommended CSRF secret checked on login and password-reset APIs.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_REPLY_TO`,
  `RESEND_TO_EMAIL`, `RESEND_AUDIENCE_IDS` — Resend email delivery configuration.
- `FORMS_BACKUP_URL`, `FORMS_SIGNING_SECRET` — Google Apps Script backup mailer endpoint.
- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile.
- `FORMS_RATE_LIMIT_WINDOW_MS` and `FORMS_RATE_LIMIT_{CONTACT,NEWSLETTER,SUBMIT,LOGIN}_MAX` —
  per-route in-memory rate limits.
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_TAG`/`CLOUDFLARE_ZONE_ID` — power the admin's
  `/api/cf-analytics` panel.
- `MONITORING_CRON_TOKEN`, `MONITORING_ENABLED`, `MONITORING_EMAIL_ALERTS`,
  `MONITORING_FROM_EMAIL`, `MONITORING_TO_EMAIL` — internal monitoring/alerting.
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — PayPal Hosted Buttons SDK client ID used on `/shop` and in the
  Site Editor's shop product preview.

## Database (D1 / local fallback)
- Production reads/writes go through the Cloudflare D1 binding `B3U_DB` (`src/lib/db.ts`).
  Schema is created with `CREATE TABLE IF NOT EXISTS` statements (mirrored in `schema.sql`) the
  first time a Worker isolate touches the database, cached per-isolate to avoid repeat batches.
- Local development without a D1 binding falls back to a local SQLite file at `data/app.db`
  (`better-sqlite3`). This file, subscriber CSV exports, and debug logs are gitignored and must
  never be committed — treat them as local-only, disposable dev data.
- There is no separate migration tool; schema changes should be added as additional
  `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` statements in both `schema.sql` and `src/lib/db.ts`.

## Forms & Email
- Public forms (contact, newsletter signup, community story submission, blog comments/reports)
  are protected by Turnstile, an in-memory rate limiter, and honeypot/timing checks
  (`utils/security/formsProtection.ts`).
- Resend is the primary delivery path. Google Apps Script (`formScript.gs`, `FORMS_BACKUP_URL`)
  remains the backup mailer and persistence layer for story submissions/moderation links.
- Newsletter subscribers are stored in D1 and scheduled sends are processed via
  `processDueNewsletters()` (`src/lib/newsletters.ts`), which claims each row before sending so a
  newsletter is never delivered twice even if the cron fires again mid-send.

## Monthly Maintenance System
`.github/workflows/monthly-maintenance.yml` runs on the 1st of every month (06:00 UTC) and can
also be triggered manually via `workflow_dispatch`. It never touches `main` and never deploys.

What it checks (via `scripts/monthly-maintenance.mjs`):
- Outdated/deprecated npm dependencies and `npm audit` security findings.
- TypeScript (`npm run typecheck`), ESLint, unit tests, `next build`, and the OpenNext Cloudflare
  build.
- `wrangler.jsonc` sanity (account id, compatibility date, D1 binding, assets directory).
- D1 schema drift between `schema.sql` and `src/lib/db.ts`.
- GitHub Actions workflow hygiene (duplicate names/schedules, missing `permissions:` blocks,
  inconsistent Node.js versions).
- Environment variables referenced in code but undocumented in `env.cloudflare.example` /
  `.env.local.example`.
- Tracked sensitive/generated files (CSVs, SQLite/db files, `.env*`, keys/certs) and possible
  secret-like strings in tracked text files (file + detector name only — values are never logged).
- Large tracked files, best-effort broken internal links, README doc-reference checks, and a few
  static accessibility/SEO presence checks (full Lighthouse/axe auditing is not wired up).

What it changes:
- Runs `npm update` to apply only non-breaking updates already allowed by the existing `^` ranges
  in `package.json`/`package-lock.json`. Major version bumps (Next.js, React, TypeScript,
  OpenNext, Wrangler, etc.) are never applied automatically — they're listed for manual review.
- If the update causes any check above to fail, it is reverted automatically and the regression is
  noted in the report.
- Regenerates `monthlyReport.md` at the repo root every run (maintenance date, branch, commit SHA,
  dependency/security/build findings, recommended manual actions, items requiring approval, items
  intentionally left unchanged, and whether the run is safe to review).

Safety model:
- All work happens on a bot-owned `monthlyUpdate` branch, which is reset from `main` at the start
  of every run (`git checkout -B monthlyUpdate origin/main`) — never store manual commits on this
  branch, they will be overwritten on the next run.
- Changes are pushed **only** when the repo remains buildable (typecheck/lint/test/build/OpenNext
  build all pass) and no secret-like value was introduced by the maintenance commit itself; the
  commit only ever touches `package.json`, `package-lock.json`, and `monthlyReport.md`.
- If a serious issue is found (e.g. the repo isn't buildable), nothing is pushed — the report is
  still generated and published as a `monthly-maintenance-report` workflow artifact and in the run's
  job summary so it can be reviewed.
- The workflow never merges `monthlyUpdate` into `main` and never deploys. A human must review and
  merge the branch manually.
- Requires no GitHub Actions secrets beyond the default `GITHUB_TOKEN` (already scoped to
  `contents: write` for this workflow only). It does not call any Cloudflare or Resend API and
  needs no user-managed credentials.

To trigger it manually: GitHub → **Actions** → **Monthly maintenance** → **Run workflow**. To
review results: open the `monthlyUpdate` branch (or the run's `monthly-maintenance-report`
artifact / job summary if nothing was pushed) and read `monthlyReport.md`, then open a normal pull
request from `monthlyUpdate` into `main` if you're satisfied with the changes — this workflow never
opens or merges that PR for you.

## Monitoring & Newsletter Cron
- The Cloudflare Worker's `scheduled()` handler (`worker/index.ts`) runs every minute
  (`triggers.crons` in `wrangler.jsonc`) and calls `POST /api/newsletters/process` internally via
  the `WORKER_SELF_REFERENCE` service binding, authenticated with `MONITORING_CRON_TOKEN`.
- `.github/workflows/monitoring-heartbeat.yml` pings `/api/debug/health` every 30 minutes, and
  `.github/workflows/weekly-monitoring-report.yml` triggers `/api/debug/weekly-report` weekly.
  Both require `MONITORING_BASE_URL`, `MONITORING_CRON_TOKEN`, and (for the heartbeat) mail-related
  secrets — see "GitHub Actions Secrets" below. Missing secrets cause a clean skip, not a failure.

## GitHub Actions Secrets
Set these in the repository's Actions secrets (not in `.env` files):
- Deployment (`deploy-cloudflare.yml`): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Monitoring (`monitoring-heartbeat.yml`, `weekly-monitoring-report.yml`):
  `MONITORING_BASE_URL`, `MONITORING_CRON_TOKEN`, `RESEND_API_KEY`, `MONITORING_FROM_EMAIL`,
  `MONITORING_TO_EMAIL`.
- `update-content.yml` (scheduled podcast/YouTube refresh) needs no secrets.
- `monthly-maintenance.yml` needs no secrets; it uses the default `GITHUB_TOKEN` only and performs
  no Cloudflare or Resend API calls (Cloudflare/Wrangler checks are static config/file checks, not
  live API calls, so no user-managed Cloudflare credentials are required for it to run).

`deploy-cloudflare.yml` is the single authoritative deployment workflow (build + deploy via
`@opennextjs/cloudflare`); a previously duplicated `deploy.yml` workflow has been removed.

## Local Development
```
npm install
npm run dev
```
Visit http://localhost:3000. `predev` ensures the dev environment is bootstrapped; `prebuild`
strips a generated `src/pages/api/submit` directory before `next build` if present.

Useful scripts:
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run format`
- `npm run opennext:build` / `npm run preview` — build/preview the Cloudflare Worker output locally
- `npm run deploy` — build and deploy via `opennextjs-cloudflare`
- `npm run wrangler:vars` / `npm run wrangler:secrets` — sync `env.cloudflare` into Cloudflare
  Worker vars/secrets (see `scripts/sync-cloudflare-vars.mjs` / `scripts/sync-cloudflare-secrets.mjs`)
- `npm run refresh:content` — refresh cached podcast/YouTube data under `public/data/`

## Deployment
- Worker config lives in `wrangler.jsonc` (`account_id`, D1 binding, assets, cron trigger,
  managed vars). This is the single source of truth for Worker configuration.
- Cloudflare deploys run through `.github/workflows/deploy-cloudflare.yml` on push to `main`
  (also runnable manually via `workflow_dispatch`).
- Keep `NEXT_PUBLIC_FORMS_API=/api/forms` so all forms route through the first-party API.

## Safe Handling of Local/Generated Data
`data/app.db`, `data/debug/*.json(l)`, and `subscribers*.csv` are gitignored and must stay local —
they can contain real subscriber or debug data. If you have older local copies with production
data, do not commit them; regenerate or discard as needed for development.

## License
Internal / proprietary.
