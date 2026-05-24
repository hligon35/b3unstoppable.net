# B3U Website v3 (Next.js)

Modern rebuild of the B3U podcast & community platform.

## Tech Stack
- Next.js 15 (Pages Router)
- TypeScript
- Tailwind CSS (custom brand palette)
- Framer Motion (hero animations)
- GSAP (planned: scroll-driven reveals / parallax)
- Cloudflare Web Analytics
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
NEXT_PUBLIC_SITE_URL=https://b3unstoppable.net
NEXT_PUBLIC_FORMS_API=/api/forms
FORMS_BACKUP_URL=https://script.google.com/macros/s/your-script-id/exec
FORMS_SIGNING_SECRET=<same SECRET value configured in Apps Script>
NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=info@b3unstoppable.net
SENDGRID_FROM_NAME=B3U
SENDGRID_REPLY_TO=info@b3unstoppable.net
SENDGRID_TO_EMAIL=info@b3unstoppable.net
```

## Cloudflare Deployment
- Deploy this repo through Cloudflare using the existing `opennext:build` and `opennext:deploy` scripts.
- Keep `NEXT_PUBLIC_FORMS_API=/api/forms` so all forms go through the first-party backend.
- SendGrid is the primary delivery path for contact emails, newsletter confirmations, and story acknowledgements.
- Google Apps Script remains the backup mailer and persistence layer. Story submissions still depend on it for moderation links and approved-story feed storage.
- Enable Cloudflare Web Analytics with `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`.
- The admin dashboard now includes live Cloudflare traffic panels through `/api/cf-analytics` when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` are set.
- Optional SendGrid marketing sync uses `SENDGRID_MARKETING_LIST_IDS` as a comma-separated list of SendGrid Marketing list IDs.

## GitHub Actions Monitoring Secrets
- The scheduled monitoring workflows read GitHub Actions secrets, not values from `.env.local`.
- Add these repository or environment secrets in GitHub before enabling the heartbeat and weekly report workflows: `MONITORING_BASE_URL`, `MONITORING_CRON_TOKEN`, `SENDGRID_API_KEY`, `MONITORING_FROM_EMAIL`, `MONITORING_TO_EMAIL`.
- If those secrets are missing, the workflows now skip with a warning in the run summary instead of failing immediately.

## Forms Delivery
- Primary mail delivery runs through SendGrid via the first-party forms API.
- Apps Script remains the backup mailer and persistence layer.
- Newsletter signups are also upserted into SendGrid Marketing Contacts.
- If SendGrid fails, the API route falls back to Apps Script mail delivery.

## Code Organization
```

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
