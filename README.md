# B3U Website v3 (Next.js)

Modern rebuild of the B3U podcast & community platform inspired by the section flow of ericthomas.com but fully rebranded.

## Tech Stack
- Next.js 15 (Pages Router)
- TypeScript
- Tailwind CSS (custom brand palette)
- Framer Motion (hero animations)
- GSAP (planned: scroll-driven reveals / parallax)
- Vercel Analytics
- SendGrid + Google Apps Script for forms delivery

## Brand Tokens
```
Primary Blue:  #7BAFD4 (brandBlue)
Burnt Orange:  #CC5500 (brandOrange)
Navy Base:     #0A1A2A (navy)
```

## Implemented Pages
- `/` Home (hero, about preview, podcast preview, testimonials, shop teaser, newsletter)
- `/about`
- `/podcast` (static filter buttons placeholder, grid)
- `/community` (stories + story submission form + gallery)
- `/shop` (mock cart state, product grid)
- `/contact` (contact form + socials)

## Pending / Next Feature Targets
| Area | Status | Notes |
|------|--------|-------|
| Sticky Nav Active Section Highlight | TODO | Add scroll spy with IntersectionObserver |
| Scroll Animations (GSAP) | TODO | Add timeline + data attributes for stagger |
| Podcast Player | TODO | Embed (e.g., Spotify) + dynamic episode metadata fetch |
| Episode Filtering | TODO | Connect buttons to state filter, maybe tag chips |
| Testimonials Carousel | BASIC | Placeholder – enhance with autoplay + swipe |
| Shop Checkout | TODO | Integrate Stripe Checkout or Snipcart |
| Newsletter Integration | TODO | Wire to Mailchimp/Formspree endpoint |
| SEO & Meta | TODO | Add `<Head>` per page + Open Graph + JSON-LD |
| Accessibility Pass | PARTIAL | Needs focus states audit, aria labels for nav/menu |
| Mobile Menu Drawer | TODO | Implement full screen overlay menu |
| Unit Tests | TODO | Add Jest/React Testing Library skeleton |

## Getting Started
```
cd v3
npm install   # already done once
npm run dev
```
Visit http://localhost:3000

## Environment Variables
Create `.env.local`:
```
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_FORMS_API=/api/forms
FORMS_BACKUP_URL=https://script.google.com/macros/s/your-script-id/exec
FORMS_SIGNING_SECRET=<same SECRET value configured in Apps Script>
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=info@b3unstoppable.net
SENDGRID_FROM_NAME=B3U
SENDGRID_REPLY_TO=info@b3unstoppable.net
SENDGRID_TO_EMAIL=info@b3unstoppable.net
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_VERSION=2026-01-01
SANITY_API_READ_TOKEN=sanity-read-token-for-preview
SANITY_PREVIEW_SECRET=any-long-random-string
SANITY_REVALIDATE_SECRET=any-long-random-string
```

## Vercel Deployment
- Deploy this repo to Vercel as a standard Next.js project.
- Connect Vercel to the `main` branch so every push deploys automatically.
- The site now uses the Next API route at `src/pages/api/forms/[[...path]].ts` for SendGrid-first form handling.
- The homepage now supports Sanity-powered dynamic content via `@sanity/client` in `src/lib/sanity.ts`.
- Preview mode endpoint: `/api/preview?secret=<SANITY_PREVIEW_SECRET>&slug=/`
- Exit preview endpoint: `/api/exit-preview`
- Revalidation webhook endpoint: `POST /api/revalidate` with header `x-vercel-reval-key: <SANITY_REVALIDATE_SECRET>`
- Google Apps Script remains the persistence layer and fallback mailer. Story submissions still rely on it for moderation links and the approved-story feed.
- Vercel Analytics is enabled in `src/pages/_app.tsx` through `@vercel/analytics/react`.
- Cloudflare Web Analytics can run alongside Vercel Analytics by setting `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`.
- Required Vercel env vars: `NEXT_PUBLIC_FORMS_API`, `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`, `FORMS_BACKUP_URL`, `FORMS_SIGNING_SECRET`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SENDGRID_REPLY_TO`, `SENDGRID_TO_EMAIL`.
- Required Sanity env vars for Vercel: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION`, `SANITY_PREVIEW_SECRET`, `SANITY_REVALIDATE_SECRET`.
- Optional Sanity env var for previewing drafts: `SANITY_API_READ_TOKEN`.
- Optional weekly-report analytics merge vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_TAG`, `CLOUDFLARE_ANALYTICS_TOKEN`.
- Optional Vercel env var: `SENDGRID_MARKETING_LIST_IDS` as a comma-separated list of SendGrid Marketing list IDs. Newsletter signups are upserted into SendGrid Marketing Contacts and attached to those lists when provided.
- GitHub Pages deployment has been removed from this repo. If the site is down, check Vercel project status and domain assignment first.

## GitHub Actions Monitoring Secrets
- The scheduled monitoring workflows read GitHub Actions secrets, not values from `.env.local`.
- Add these repository or environment secrets in GitHub before enabling the heartbeat and weekly report workflows: `MONITORING_BASE_URL`, `MONITORING_CRON_TOKEN`, `SENDGRID_API_KEY`, `MONITORING_FROM_EMAIL`, `MONITORING_TO_EMAIL`.
- If those secrets are missing, the workflows now skip with a warning in the run summary instead of failing immediately.

## Forms Delivery
- Primary mail delivery runs through SendGrid via the Vercel API route.
- Apps Script remains the backup mailer and persistence layer.
- Newsletter signups are also upserted into SendGrid Marketing Contacts.
- If SendGrid fails, the API route falls back to Apps Script mail delivery.

## Code Organization
```

## Sanity CMS Setup (client editing)
- Sanity Studio is hosted by Sanity.io (recommended) and used as the admin UI for clients.
- Schema files for this project are in `sanity/schemaTypes/`.
- Copy these schema files into your Sanity Studio project and register `schemaTypes` in Studio config.
- Create one `homePage` document in Studio and publish it to drive:
  - About section text + CTA
  - About images
  - Featured video + poster media
  - Newsletter heading + description
- Client account setup:
  1. Sanity project dashboard → **Members**.
  2. Invite client users with **Editor** role.
  3. Share Studio URL and editing flow guide in `sanity/README.md`.
- Configure a Sanity webhook to `https://<your-vercel-domain>/api/revalidate`:
  - HTTP method: `POST`
  - Header: `x-vercel-reval-key: <SANITY_REVALIDATE_SECRET>`
  - JSON body example: `{ "paths": ["/"] }`
src/
  components/  # UI building blocks
  pages/       # Route pages
  data/        # Static placeholder data
  styles/      # Global Tailwind layer
```

## Adding GSAP Scroll Animations (Outline)
1. Create `useReveal.ts` hook watching elements with `.fade-in-up`.
2. Or use GSAP + ScrollTrigger: register plugin, animate sections with data attributes.
3. Lazy-load GSAP to keep initial bundle lean.

## Commerce Strategy (Option)
- MVP: Snipcart embed (fast, no backend).
- Advanced: Stripe Checkout session creation via Next.js API route `/api/checkout`.

## Testing Roadmap
- Add Jest + React Testing Library.
- Snapshot hero, interaction tests for cart, form validation tests.

## License
Internal / proprietary (adjust as needed).

---
Reach next milestone: implement scroll spy & GSAP reveals, then wire real podcast feed.
