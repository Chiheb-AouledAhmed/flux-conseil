# Flux Conseil — site + backend

## Structure

```
flux-conseil-site/
  public/index.html   → the site (frontend)
  server.js            → Express backend (contact form + dashboard data)
  package.json
```

## Run it locally

```
npm install
npm start
```

Then open http://localhost:3000 — the backend serves the site itself, so
there's nothing else to configure.

## What the backend does

- `POST /api/contact` — receives the contact form, saves each submission to
  `submissions.json` (created automatically) and sends it by email.
- `GET /api/contact` — lists saved submissions. **Add authentication before
  going live** — right now anyone who finds the URL can read them.
- `GET /api/stats` — feeds the "Vos projets, visibles en un coup d'œil"
  dashboard on the homepage. It currently returns fixed sample numbers;
  swap the `lots` array in `server.js` for a real data source (a database,
  an export from your project tracker, etc.) once you're tracking actual
  project lots.

The homepage still works even if the backend isn't running (e.g. hosted as
a static site on Netlify/Vercel) — the dashboard falls back to demo numbers,
and the contact form shows a message pointing people to your email instead.

## Email configuration

Set these environment variables before starting the server:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
MAIL_FROM=website@example.com
MAIL_TO=your-real-email@example.com
```

`MAIL_TO` is the real inbox that receives contact messages. Keep these values
in `.env` or your hosting provider's secret settings; never commit them.

## Before going live

- **Protect `/api/contact` (GET)**: add a simple auth check, or remove the
  route and read `submissions.json` directly on the server instead.
- **Real photos**: the current photos are free-license placeholders
  (Lorem Picsum). Replace the `<img src="...picsum.photos...">` URLs in
  `public/index.html` with real project photos when you have them.

## Hosting

- **Static-only** (no contact form, no live dashboard): drop `public/`
  onto Cloudflare Pages / Netlify / Vercel — free and instant.
- **With the backend**: needs a Node host — Render, Railway, or a small
  VPS all work; `npm start` is the run command, and most of these platforms
  auto-detect it from `package.json`.
