# Sanity CMS Client Guide

This project uses Sanity Studio (hosted on Sanity.io) as the client editing UI.

## 1) Client login
1. Open your Sanity Studio URL (for example: `https://<studio-name>.sanity.studio`).
2. Sign in with the invited email account.
3. Open the **Home Page** document.

## 2) What clients can edit
Inside the **Home Page** document:
- **About heading**, **About paragraphs**, **Tagline**, and **CTA**
- **About images** (up to 4)
- **Featured video** (media upload)
- **Featured video poster image**
- **Newsletter heading** and **Newsletter description**

## 3) Publish flow
1. Edit fields in Studio.
2. Click **Publish**.
3. Sanity webhook calls the Vercel endpoint `/api/revalidate`.
4. The homepage revalidates and updates on the live site.

## 4) Preview draft flow
Use this URL format to preview draft content before publish:

`https://<your-site-domain>/api/preview?secret=<SANITY_PREVIEW_SECRET>&slug=/`

To leave preview mode:

`https://<your-site-domain>/api/exit-preview`

## 5) Schema files
- `sanity/schemaTypes/homePage.js`
- `sanity/schemaTypes/index.js`

Copy these into your Sanity Studio repository and register `schemaTypes`.
