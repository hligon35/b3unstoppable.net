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
