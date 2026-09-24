# Major Update Report — `major-update` branch

Date: this session · Branch: `major-update` (not merged, not pushed)
Companion document: [major-update-review.md](major-update-review.md) (pre-implementation plan)

## 1. Executive Summary

This pass performed a targeted, low-risk hardening and cleanup update of the existing
Next.js 15 / Cloudflare Workers (OpenNext) application. No routes, integrations, database
schema, or branding were rewritten or replaced. Work was scoped to six reversible phases
identified in `major-update-review.md`, focused on: removing sensitive data from version
control, eliminating duplicate/stale deployment configuration, adding brute-force protection
to admin login, fixing a canonical-domain (www vs apex) inconsistency across SEO surfaces,
completing an empty PWA manifest, centralizing a previously hardcoded PayPal client ID behind
an environment variable, and bringing `README.md` in line with the app's actual current
feature set. All changes were validated with `typecheck`, `lint`, `test`, `next build`, and
`opennext:build`, all of which pass cleanly with no new errors or warnings introduced.

No secrets were added, exposed, committed, or pushed. The branch has not been merged or
pushed to the remote — that decision is left to the user.

## 2. Features and Fixes Implemented

1. **Sensitive/generated files removed from version control** — local dev DB, debug logs,
   and subscriber CSV exports were tracked in git; now untracked (working copies preserved)
   and added to `.gitignore` so they can't be re-added by accident.
2. **Deployment configuration de-duplicated** — two conflicting GitHub Actions deploy
   workflows and two conflicting wrangler configs existed. Kept the correct/complete ones,
   removed the stale/broken duplicates.
3. **Admin login rate limiting** — `POST /api/login` now enforces the existing
   `applyFormsRateLimit` middleware (same mechanism used by contact/newsletter/submit forms)
   under a new `login` route bucket, mitigating credential brute-forcing.
4. **Canonical SEO host fixed** — standardized all canonical/OG/sitemap/robots/email-footer
   references on the apex domain (`https://b3unstoppable.net`), matching the actual deployed
   `NEXT_PUBLIC_SITE_URL`. Previously several files still referenced `www.b3unstoppable.net`.
5. **Sitemap completeness** — added 3 previously-missing routes (`/booking/`, `/speaking/`,
   `/journal/`) to `public/sitemap.xml`.
6. **PWA manifest populated** — `public/manifest.webmanifest` was empty; now contains valid
   name/short_name/icons/theme metadata, and is linked from `<Head>` in `_document.tsx`.
7. **PayPal client ID centralized** — previously hardcoded in two places (`shop.tsx`,
   `SiteEditorPanel.tsx`); now reads `NEXT_PUBLIC_PAYPAL_CLIENT_ID` with the original value
   as a safe fallback, so it can be swapped without a code change.
8. **Documentation accuracy** — `README.md` rewritten to reflect actual routes, roles, env
   vars, database, forms/email, monitoring/cron, and deployment workflow (previous version
   listed already-shipped features as "pending" and documented unused Stripe env vars).
   `env.github` placeholder corrected (a real-looking value was replaced with a proper
   placeholder format).

## 3. Files Changed

**Deleted:**
- `.github/workflows/deploy.yml` (stale duplicate deploy workflow)
- `wrangler.toml` (stale duplicate of `wrangler.jsonc`)

**Untracked (kept on disk, removed from git only):**
- `data/app.db`, `data/debug/alert-cache.json`, `data/debug/server-log.jsonl`,
  `subscribers.csv`, `subscribers-live.csv`

**Modified:**
- `.gitignore`
- `utils/security/formsProtection.ts` (added `login` route + default limit)
- `src/server/admin/api/login.ts` (rate limiting)
- `src/lib/siteMetadata.ts`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`,
  `src/lib/newsletters.ts`, `src/pages/newsletter-builder.tsx` (canonical host)
- `public/manifest.webmanifest`, `src/pages/_document.tsx` (PWA manifest)
- `src/pages/shop.tsx`, `src/components/SiteEditorPanel.tsx`,
  `env.cloudflare.example` (PayPal env var)
- `env.github` (placeholder correction, gitignored/local-only)
- `README.md` (full rewrite)

**Created:**
- `major-update-review.md`, `major-update-report.md` (this file)

## 4. Database Changes

None. `schema.sql` and `src/lib/db.ts` were reviewed only; no migrations were made or are
required for this pass.

## 5. API Changes

- `POST /api/login` (`src/server/admin/api/login.ts`): now calls
  `applyFormsRateLimit(req, res, 'login')` before processing credentials; returns HTTP 429
  with `{ message: 'Too many login attempts. Please try again later.' }` when the limit is
  exceeded. No other endpoint behavior changed.

## 6. Authentication Changes

- Login endpoint is now rate-limited (see above).
- CSRF enforcement on login was **not** made mandatory — it remains conditional on
  `process.env.CSRF_TOKEN` being set, exactly as before. This is intentionally left as a
  decision for the user since enforcing it unconditionally could lock out login if the
  `CSRF_TOKEN` secret isn't provisioned in the Cloudflare environment yet (see Unresolved
  Issues).

## 7. Deployment Changes

- `deploy-cloudflare.yml` is now the sole authoritative GitHub Actions deploy workflow
  (Node 22, `@opennextjs/cloudflare build` + `deploy`, uses `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` secrets, has concurrency guard + `workflow_dispatch`).
- `deploy.yml` removed (used wrong/unused secret names, triggered on a stale branch).
- `wrangler.toml` removed; `wrangler.jsonc` is now the single wrangler config source of truth.

## 8. Workflow Changes

- `monitoring-heartbeat.yml`, `weekly-monitoring-report.yml`, `update-content.yml` — untouched,
  still valid and unaffected by the above cleanup.

## 9. Security Improvements

- Admin login brute-force protection (rate limiting).
- Removed locally-generated sensitive data (DB file, debug logs, subscriber CSVs) from
  version control going forward.
- Corrected a placeholder value in `env.github` that resembled a real credential.

## 10. Accessibility Improvements

None implemented in this pass. No accessibility-specific issues were identified as
quick/reversible fixes within the phases actually executed; a full accessibility audit was
out of scope for this targeted pass (see Unresolved Issues).

## 11. SEO Improvements

- Canonical host consistency (apex domain) across metadata, sitemap, robots.txt, llms.txt,
  and newsletter email templates.
- Sitemap now includes `/booking/`, `/speaking/`, `/journal/` (previously missing).
- PWA manifest now valid/populated (was empty), improving installability signals.

## 12. Performance Improvements

None implemented in this pass — no performance-specific changes were in scope for the
executed phases.

## 13. Tests Run and Results

All commands run post-implementation, from a clean working tree with all Phase 1–6 changes
applied:

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ Pass — 0 errors |
| `npm run lint` | ✅ Pass — 0 errors, 23 warnings (all pre-existing, unrelated to this session's changes — unused vars, `<img>` vs `next/image` suggestions, exhaustive-deps hints) |
| `npm test` | ✅ Pass — 5/5 tests (sanitizePlainText, sanitizeSingleLineText, sanitizeOptionalUrl, isValidEmail, buildCommentTree) |
| `npm run build` | ✅ Pass — Next.js production build compiled successfully, all pages generated |
| `npm run opennext:build` | ✅ Pass — Cloudflare Worker bundle built successfully (`.open-next/worker.js`) |

Baseline (pre-change) results were identical for lint (same 23 warnings) and test (same 5/5
pass), confirming no regressions were introduced.

## 14. Unresolved Issues

- **CSRF enforcement is optional, not mandatory** on the login endpoint — depends on whether
  `CSRF_TOKEN` is provisioned as a Cloudflare secret. Recommend provisioning it and then
  making the check unconditional in a follow-up change.
- **Git history still contains old committed versions** of `subscribers.csv`,
  `subscribers-live.csv`, `data/app.db`, and the debug log/cache files. Removing them from
  history (e.g. via `git filter-repo` or BFG) is destructive and rewrites commit hashes on a
  shared branch, so it was intentionally **not** done — requires an explicit user decision
  and coordination if the branch/repo is shared.
- **Blog markdown content is not passed through a server-side HTML sanitizer** before
  storage/render (`src/lib/blogs.server.ts` / `blogs.ts`). This was flagged for verification
  during review but not changed, since altering sanitization behavior is a functional/security
  change that needs explicit scoping and testing beyond this pass.
- **`@stripe/stripe-js`** remains an installed-but-unused dependency; left in place per
  change-control guidance (not authorized to add/remove payment processors without approval).
- No accessibility or performance audit was performed in this pass.

## 15. Required Cloudflare Setup

- No new bindings or resources are required. Existing bindings (`B3U_DB`, `ASSETS`,
  `WORKER_SELF_REFERENCE`) are unchanged.
- Optional (recommended, not required for the app to function — safe fallbacks exist):
  - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — if unset, the shop page falls back to the original
    hardcoded client ID, so behavior is unchanged until this is explicitly set.
  - `FORMS_RATE_LIMIT_LOGIN_MAX` — if unset, defaults to `8` attempts per window.
  - `CSRF_TOKEN` — if you want to enforce CSRF checks on login, provision this secret (the
    check activates automatically once it's present; see Unresolved Issues).

## 16. Required GitHub Secret Setup

- Confirm `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repository secrets —
  these are consumed by `deploy-cloudflare.yml`, which is now the only deploy workflow. No
  new secrets are required beyond what was already needed by that workflow.

## 17. Required Resend Setup

- No changes to Resend integration. `RESEND_API_KEY` requirement is unchanged; the
  `env.github` placeholder was only corrected in formatting/labeling for local documentation
  purposes (it was already gitignored/untracked, not a live value).

## 18. Required Google Apps Script Setup

- No changes to `formScript.gs` or the Apps Script backup pipeline. `FORMS_BACKUP_URL` /
  `FORMS_SIGNING_SECRET` requirements are unchanged.

## 19. Required D1 Migration or Production Command

- None. No schema changes were made.

## 20. Manual QA Checklist

- [ ] Load `/` and confirm homepage renders and navigation works.
- [ ] Confirm `/sitemap.xml` and `/robots.txt` serve the apex domain and the 3 newly added
      routes.
- [ ] Submit the contact form and confirm normal rate-limit behavior is unaffected.
- [ ] Attempt several rapid admin login attempts and confirm a 429 response after the
      configured threshold (default 8 within the shared window), then confirm normal login
      still succeeds after the window resets.
- [ ] Load `/shop` and confirm the PayPal Hosted Buttons widget still renders/functions
      (client ID now sourced from env var with fallback).
- [ ] Open Site Editor admin panel → Shop tab and confirm the PayPal preview still renders.
- [ ] Install the site as a PWA (or inspect manifest in devtools) and confirm
      `manifest.webmanifest` is valid and linked.
- [ ] Send/queue a test newsletter and confirm the email footer/logo now reference the apex
      domain.
- [ ] Confirm GitHub Actions `deploy-cloudflare.yml` still runs successfully on the next
      merge to `main` (only after this branch is merged, per user's own timeline).

## 21. Rollback Considerations

- All changes are isolated to the `major-update` branch; `main` is untouched until an
  explicit merge.
- File deletions (`deploy.yml`, `wrangler.toml`) and the `git rm --cached` operations are
  fully reversible via `git checkout main -- <path>` or `git revert` on the merge commit —
  no destructive history rewrite was performed.
- The PayPal client ID change is backward compatible (same value used as a fallback), so
  reverting the code change alone is sufficient if needed; no env var is required to roll
  back.
- The login rate limiter uses the same in-memory mechanism already used elsewhere in the
  app; disabling it (if needed) only requires removing the `applyFormsRateLimit` call added
  to `login.ts`.
- To fully roll back this update: `git checkout main` and discard/delete the `major-update`
  branch — no shared state, secrets, or database changes depend on it.
