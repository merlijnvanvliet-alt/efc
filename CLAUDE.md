# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for Electric Flying Connection (EFC), live at https://www.efc.aero. Plain hand-written HTML: no build step, no package manager, no tests, no shared CSS/JS files. Each page is a single self-contained `.html` file with its own inline `<style>` and `<script>`, so a style change on one page does not carry over to the others. Copy it across by hand where needed.

## Running and deploying

- Local preview: `python3 -m http.server 8765` from the repo root, then open `http://localhost:8765/`. Use a server rather than opening the file directly: `futureroutes/` uses root-absolute paths (`/images/...`) that break over `file://`.
- Deploy: hosted on **Vercel**, connected to `github.com/merlijnvanvliet-alt/efc`. Pushing to `main` deploys to production. `vercel.json` only holds redirects. `CNAME` is a leftover from the earlier GitHub Pages hosting.
- **`.gitignore` controls what goes live.** Anything ignored is never deployed. `video/` is ignored, so `index.html`'s reference to `video/electric-flying-logo.mp4` returns 404 in production. Source material in `futureroutes/` (`.docx`, `.mov`, `def videos/`, `prev events/`, placeholder mp4s) is deliberately kept out.

## Pages

- `index.html`: main homepage (long, ~3000 lines). `team.html`: team page.
- `beta/`: page about the Beta aircraft.
- `futureroutes/`: event page for "Future Routes" (29 Oct 2026). Notes:
  - Uses **absolute asset paths** and `?v=N` cache-busting query strings on media. Bump `?v=` when replacing a file under the same name (iOS/social caches are sticky).
  - `?debug` in the URL shows an overlay that finds elements causing horizontal overflow. Mobile/iOS overflow has been a recurring issue here.
  - `og:image` is a `share-card*.jpg` with a `?v=` param. Bump it when changing the share card.
  - **Registration cap:** `api/registrations.js` (Vercel serverless function) counts unique emails submitted to the HubSpot form and returns `{count, cap, remaining, full}`. The page fetches it on load: at the cap it swaps the form for a "Fully booked / join the waitlist" panel, with ≤10 seats left the badge shows the number. Configured by Vercel env vars `HUBSPOT_TOKEN` (private app, `forms` scope), `REGISTRATION_CAP` (default 70) and `REGISTRATION_FORCE` (`open`/`full` manual override). Any error or missing token fails open (form stays). `api/` only runs on Vercel, not under `python3 -m http.server`.
- `stats/`: event-team dashboard for Future Routes registrations (count vs cap, per day, member answers, organisations). The password is checked server side by `api/stats.js` against the `STATS_PASSWORD` env var — never put it in the repo, which is public. Returns aggregates and company names only, no names/emails. Shared HubSpot fetching lives in `api/_hubspot.js`.
- `presentation/`: New Members presentation (`EFC-New-Members.pdf` + viewer). `share/` and `presentation/share.html` are the internal, `noindex` "board tool" for sending personalised presentation links (WhatsApp/email templates).
- `pitchdeck/`: a standalone HTML pitch deck (NRG2fly). `keymessages/`: PDF only.

## Conventions

- Brand colours are CSS custom properties on `:root` in each page (`--green #00DA9D`, `--blue #00A5FF`, `--purple #B03DAA`, `--dark #30297F`, `--navy #0d0b2e`). Font: Inter via Google Fonts.
- Registration forms are HubSpot embeds (portal `26751098`, region `eu1`, script `js-eu1.hsforms.net`). Form fields and labels are edited in HubSpot, not here; the page CSS only styles the container.
- Social preview meta (`og:*`, `twitter:*`) should use absolute `https://www.efc.aero/...` URLs. `index.html` still points to the old `merlijnvanvliet-alt.github.io/efc/` URLs.
- Always check changes at phone width; most past fixes were mobile layout issues.
- Commit messages: short, lowercase, plain-English description of the change (e.g. "use a still from the MD clip as the Future Routes share card"), no type prefixes.
