# Sanity CMS Integration (Vercel + Next.js Pages Router)

This repo supports a Sanity-powered homepage in `src/pages/index.tsx` with:

- Static generation + ISR (`revalidate: 120`)
- Preview mode (`/api/preview` and `/api/exit-preview`)
- On-demand revalidation webhook (`/api/revalidate`)
- Media support via Sanity image uploads (`hero.backgroundImage`)

## 1) Sanity project setup

1. Create a free Sanity project and dataset (`production` is default in this repo).
2. In your Sanity Studio, register the schema from:
   - `cms/sanity/schemas/homePage.schema.js`
3. Create one `homePage` document and set its document ID to `homePage`.
4. Fill in section fields (hero/about/podcast/community/shop/newsletter).
5. Upload hero media in `hero.backgroundImage`.

## 2) Environment variables (Vercel + local)

Add these variables in Vercel Project Settings and `.env.local`:

- `SANITY_PROJECT_ID` (required)
- `SANITY_DATASET` (optional, default `production`)
- `SANITY_API_VERSION` (optional, default `2025-01-01`)
- `SANITY_READ_TOKEN` (required only for previewing drafts)
- `SANITY_PREVIEW_SECRET` (required for preview endpoint)
- `SANITY_REVALIDATE_SECRET` (required for webhook endpoint)

## 3) Preview mode for client review

Open preview mode with:

`/api/preview?secret=YOUR_SANITY_PREVIEW_SECRET&slug=/`

Exit preview mode with:

`/api/exit-preview`

While preview mode is active, the homepage shows a small preview banner and serves draft-aware CMS content.

## 4) Revalidation webhook (publish updates quickly)

Create a Sanity webhook to call:

- URL: `https://www.b3unstoppable.net/api/revalidate?secret=YOUR_SANITY_REVALIDATE_SECRET`
- Method: `POST`
- Optional JSON body: `{ "path": "/" }`

Recommended trigger: publish/unpublish events for `homePage`.

## 5) Ongoing content management flow

1. Edit homepage copy/media in Sanity Studio UI.
2. Use preview link for stakeholder review before publish.
3. Publish approved changes.
4. Webhook triggers Next.js on-demand revalidation for near-immediate updates.

If the webhook is unavailable, homepage updates still appear after the ISR window (120 seconds).
