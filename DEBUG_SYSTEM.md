# Debug System

## Overview

This project now includes a modular, additive monitoring layer that captures runtime errors, API activity, performance events, local debug logs, email alerts, and weekly reporting without rewriting existing business logic.

The system is designed to be safe to disable and safe to leave in place:

- Existing forms, pages, and APIs continue to run through their current logic.
- Monitoring is attached through wrappers, listeners, middleware, and dedicated debug endpoints.
- When debug logging is disabled, console noise stays silent.

## Architecture

Core modules live in:

- `utils/debug/`
- `utils/logger/`

Primary integration points:

- `src/pages/_app.tsx`
  - installs client monitoring
  - tracks pageviews and route timings
  - wraps the app in a React error boundary
  - exposes the optional developer debug panel
- `src/lib/formsSubmit.ts`
  - routes form fetch calls through the monitored client fetch wrapper
- `src/pages/api/forms/[[...path]].ts`
  - wrapped with API monitoring middleware
  - outbound fetch calls are monitored and timed
- `src/pages/api/debug/*`
  - ingest client logs
  - export server logs
  - receive heartbeat pings
  - generate and optionally email weekly reports

## What It Captures

### Client-side

- `window.onerror`
- `window.onunhandledrejection`
- React render errors through `DebugErrorBoundary`
- pageviews
- route transition timings
- initial page load timing
- monitored `fetch` requests
- session end timing

### Server-side

- uncaught exceptions
- unhandled promise rejections
- API request status, duration, and request metadata
- outbound API requests such as SendGrid and backup Apps Script relays
- server log file output with rolling retention

### Forms protection

Public forms now support layered anti-spam protection:

- hidden honeypot field and minimum fill-time checks
- Cloudflare Turnstile on contact and story submissions when `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are configured
- server-side rate limiting on forms API routes, keyed by route and client fingerprint

The rate limiter is in-memory, which is effective for the current deployment shape but is not a shared distributed limiter across multiple server instances.

## Log Levels

Supported levels:

- `info`
- `warn`
- `error`
- `success`
- `network`
- `performance`

## Environment Variables

### Core switches

- `DEBUG=true`
  - enables console logging on the server
- `NEXT_PUBLIC_DEBUG=true`
  - enables console logging in the browser
- `DEBUG_NETWORK=true`
  - enables network log console output on the server
- `NEXT_PUBLIC_DEBUG_NETWORK=true`
  - enables network log console output in the browser
- `DEBUG_PERFORMANCE=true`
  - enables performance log console output on the server
- `NEXT_PUBLIC_DEBUG_PERFORMANCE=true`
  - enables performance log console output in the browser
- `MONITORING_ENABLED=true`
  - enables server-side monitoring capture
- `NEXT_PUBLIC_MONITORING_ENABLED=true`
  - enables browser-to-server telemetry capture

### Optional tuning

- `DEBUG_JSON_LOGS=true`
- `NEXT_PUBLIC_DEBUG_JSON_LOGS=true`
- `DEBUG_SLOW_API_MS=1200`
- `NEXT_PUBLIC_DEBUG_SLOW_API_MS=1200`
- `DEBUG_SLOW_PAGE_MS=2500`
- `NEXT_PUBLIC_DEBUG_SLOW_PAGE_MS=2500`
- `DEBUG_LARGE_PAYLOAD_BYTES=250000`
- `NEXT_PUBLIC_DEBUG_LARGE_PAYLOAD_BYTES=250000`
- `DEBUG_ALERT_COOLDOWN_MS=3600000`
- `DEBUG_SERVER_BUFFER_LIMIT=2000`
- `DEBUG_SERVER_MAX_BYTES=2000000`
- `NEXT_PUBLIC_DEBUG_BUFFER_LIMIT=250`
- `NEXT_PUBLIC_DEBUG_PANEL=true`

### Email and protected endpoints

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `FORMS_RATE_LIMIT_WINDOW_MS`
- `FORMS_RATE_LIMIT_CONTACT_MAX`
- `FORMS_RATE_LIMIT_NEWSLETTER_MAX`
- `FORMS_RATE_LIMIT_SUBMIT_MAX`
- `MONITORING_FROM_EMAIL`
  - optional override for monitoring emails
- `MONITORING_TO_EMAIL`
  - defaults to `hligon@getsparqd.com`
- `MONITORING_EMAIL_ALERTS=true`
- `MONITORING_CRON_TOKEN`
  - required for protected debug routes and scheduled jobs
- `NEXT_PUBLIC_SITE_URL`
  - used to generate links back to log export routes in emails

## How Email Alerts Work

Critical errors are captured on the server and deduplicated by fingerprint using a cooldown cache.

Alert emails include:

- error summary
- plain-English explanation
- suggested fixes
- technical details
- stack trace
- recent log snippets
- link to exported logs when `NEXT_PUBLIC_SITE_URL` and `MONITORING_CRON_TOKEN` are configured

Monitoring alert emails are sent through SendGrid to:

- `hligon@getsparqd.com`

## How Weekly Reports Work

The weekly report endpoint aggregates the last 7 days of captured monitoring events and compares them against the prior 7 days.

It currently summarizes:

- total visitors
- page views
- bounce rate estimate
- top pages
- slowest pages
- API error rate
- average page load trend
- slow API count
- large payload count
- uptime estimate based on scheduled heartbeat pings

The weekly email can now separate analytics sources visually:

- App Tracking
  - direct browser and API telemetry collected by this project
- Cloudflare Analytics
  - optional external traffic totals when either the Cloudflare Google Sheets Apps Script endpoint is configured or direct Cloudflare credentials are configured
- External Analytics
  - currently represented by Cloudflare sources so they are clearly distinguished from internal app metrics

Cloudflare can contribute weekly visitor and pageview comparisons today through either of these paths:

- `CLOUDFLARE_ANALYTICS_SCRIPT_URL`
  - preferred when you want the weekly report to consume the Google Sheets/App Script analytics pipeline
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_TAG`, and a Cloudflare site tag
  - used as a direct Cloudflare GraphQL fallback when no Apps Script source is configured

If the Apps Script endpoint is protected, also set:

- `CLOUDFLARE_ANALYTICS_SCRIPT_SECRET`

The site now relies on Cloudflare analytics sources instead of Vercel Analytics.

Report email content is intended to be easy to scan first, technical second.

## Scheduled Jobs

Two GitHub Actions workflows were added:

- `.github/workflows/monitoring-heartbeat.yml`
  - pings `/api/debug/health` every 5 minutes
  - sends a direct outage email from GitHub Actions if the production health check fails
- `.github/workflows/weekly-monitoring-report.yml`
  - triggers `/api/debug/weekly-report?send=1` every Monday

Required GitHub Actions secrets:

- `MONITORING_BASE_URL`
  - example: `https://b3unstoppable.net`
- `MONITORING_CRON_TOKEN`
- `SENDGRID_API_KEY`
- `MONITORING_FROM_EMAIL`
- `MONITORING_TO_EMAIL`

## Protected Debug Endpoints

The following routes require `x-monitoring-token` or `?token=` matching `MONITORING_CRON_TOKEN`:

- `/api/debug/export`
- `/api/debug/health`
- `/api/debug/weekly-report`

The ingest endpoint is intentionally public because browser telemetry posts to it:

- `/api/debug/ingest`

## Developer Debug Panel

When `NEXT_PUBLIC_DEBUG=true`, press `CTRL + SHIFT + D` in the browser to toggle the debug panel.

The panel shows:

- recent client logs
- request failures
- performance timings
- exported local log buffer

The panel does not alter production UI unless debug mode is explicitly enabled.

## Local Log Storage

### Browser

- logs are stored in `localStorage`
- rolling buffer limit is configurable
- logs can be exported from the debug panel

### Server

- logs are stored in `data/debug/server-log.jsonl`
- alerts use `data/debug/alert-cache.json`
- log rotation trims older entries after the configured size or entry limit

## Adding New Hooks

Recommended patterns:

- Browser fetches: use `monitoredFetch` from `utils/debug/client`
- API routes: wrap handlers with `withApiMonitoring` from `utils/debug/server`
- Server outbound requests: use `monitoredServerFetch` from `utils/debug/server`
- Manual browser logs: use `logClientEntry` from `utils/logger/client`
- Manual server logs: use `logServerEntry` from `utils/logger/server`

## Future Integration Hooks

`utils/debug/adapters.ts` includes placeholder adapters for:

- Sentry
- Cloudflare logs
- Datadog
- custom dashboards

These are intentionally additive and can be implemented later without changing the current instrumentation layout.

## How To Disable The System

To disable console logging:

- set `DEBUG=false`
- set `NEXT_PUBLIC_DEBUG=false`

To disable telemetry capture:

- set `MONITORING_ENABLED=false`
- set `NEXT_PUBLIC_MONITORING_ENABLED=false`

To disable developer email alerts:

- set `MONITORING_EMAIL_ALERTS=false`

To disable the debug panel:

- set `NEXT_PUBLIC_DEBUG_PANEL=false`

To stop automated uptime and weekly reports:

- disable the GitHub Actions workflows
- or remove the two `MONITORING_*` GitHub secrets
