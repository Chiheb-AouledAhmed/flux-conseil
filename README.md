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
  `submissions.json` (created automatically) and logs it to the console.
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

## Before going live
- **Email on submission**: right now contact messages are only saved to a
  file. Add [Nodemailer](https://nodemailer.com/) (or a service like
  Resend/SendGrid) inside the `/api/contact` handler to actually email you
  when someone submits the form.
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
