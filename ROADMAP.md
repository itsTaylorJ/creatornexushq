# CreatorNexusHQ — Roadmap

Working notes for getting this from a static prototype to a small, honest beta before advertising or turning on billing. Full findings write-up with severity ranking: https://claude.ai/code/artifact/8ae39583-cac0-425d-97b7-6699d14adac5

## Where things stand

Live at https://creatornexushq-eaf70.web.app (Firebase Hosting, static files only — no backend yet).

| Page | Core action | Status |
|---|---|---|
| creatornexushq-auth.html | Sign up / log in | **Real** — live Firebase Auth + Firestore |
| creatornexushq-monetization.html | Track progress to monetization | **Real** — pure client-side math, accurate thresholds |
| creatornexushq-resources.html | Browse tool directory | **Real** — static, honest, no fake data |
| creatornexushq-analyze.html | Tag Suggester (YouTube API) | **Partial** — real if user supplies their own YouTube key; write-up step still broken |
| index.html | Titles, hooks, CTAs, ideas, analytics advice | **Broken** — dead Anthropic call, always errors |
| creatornexushq-thumbnail.html | Thumbnail scoring & prompts | **Broken** — upload/preview works, scoring never returns |
| creatornexushq-competitor.html | Competitor research | **Broken** — dead call; prompt asks AI to name real channels |
| creatornexushq-streaming.html | Stream title generator | **Broken** — dead call |
| creatornexushq-collab.html | Find collab partners | **Broken** — dead call; prompt asks AI to name real people |
| creatornexushq-trends.html | Live trend tracking | **Broken** — dead call; LLMs have no real-time data |
| creatornexushq-platforms.html | Connect YouTube/Twitch/etc. | **Broken** — fake OAuth, hardcoded mock stats, plus a crash in `activatePro()` (`#planBadge` doesn't exist on this page) |

Root cause of every "Broken" row: all AI tools call `https://api.anthropic.com/v1/messages` directly from the browser with no API key. This cannot work — there's no credential, and Anthropic doesn't accept direct browser-origin calls anyway. It needs a server-side proxy.

## Path to a testable beta (no billing yet)

**Phase 0 — Stop overpromising (this week)**
- Fix the `#planBadge` crash on `creatornexushq-platforms.html`.
- Hide/relabel "Coming soon" for tools that can't be made real quickly: Competitor Research, Collab Finder, Trend Tracker — their prompts ask the AI to invent real channels/people/live trends, which is a trust problem even once the backend works.
- Leave Monetization Tracker and Resources exactly as-is — already real, no changes needed.

**Phase 1 — Build the one real backend (2–4 days)**
- Upgrade the Firebase project (`creatornexushq-eaf70`) to the Blaze plan — required for Cloud Functions that call an external API. This is a billing step only the account owner can do.
- Add a single Cloud Function (`generateContent`) that: requires a verified Firebase Auth ID token, checks `users/{uid}.generationsToday` against the free-tier cap, holds the Anthropic key server-side as a Functions secret, calls the real API, increments usage, returns the result.
- Point every existing client-side `fetch('https://api.anthropic.com/...')` call (in `index.html`, `creatornexushq-streaming.html`, `creatornexushq-analyze.html`, `creatornexushq-thumbnail.html`) at this function instead.
- Write `firestore.rules` so only the Cloud Function (via Admin SDK) can write `plan` / `generationsToday` — makes the usage cap actually unbypassable, unlike today's JS variable that resets on refresh.

**Phase 2 — Wire real usage limits into the UI (1 day)**
- Read `plan` / `generationsToday` from Firestore instead of the hardcoded `usageLeft = 5`.
- Require login before using any AI tool (limits are per-account now).
- Keep the "Upgrade to Pro" modal but disable actual checkout until Stripe is wired — don't let anyone pay before billing is real.

**Phase 3 — Cut the honest scope for beta (½ day)**
- Nav/sidebar: remove or clearly label "Coming soon" — Collab Finder, Trend Tracker, Competitor Research, and the fake OAuth "Connect" buttons (replace with the manual-entry pattern the Monetization Tracker already uses).
- Live beta tool set: Title & Hook Generator, CTA Builder, Content Ideas, Analytics Advice, Stream Planner, Thumbnail Analyzer, Monetization Tracker, Resources.

**Phase 4 — Minimal safety net before inviting anyone (1 day)**
- Firebase App Check (reCAPTCHA v3) on the Cloud Function to block scripted abuse of the Anthropic bill.
- A low-friction feedback link (Google Form or mailto) in the sidebar.
- A Cloud Functions / Anthropic usage budget alert so a bug can't produce a surprise bill mid-beta.

**Phase 5 — Invite the first users**
- Manual end-to-end pass (signup → generate → copy result) on desktop and mobile before sending the link out.
- 3–10 real creators, real accounts, feedback via the Phase 4 link.
- No ads, no payments yet — that's the phase after this one, once the beta confirms the tools are actually useful.

## Deliberately deferred past the beta
- Stripe / real billing
- Real OAuth platform connections
- Grounding Competitor Research / Collab Finder / Trend Tracker in a real data source
- De-duplicating the tripled sidebar CSS across pages, swapping emoji icons for a real icon set — cosmetic, doesn't block testing

## One thing to keep in mind
Ten tools are each mostly mocked right now. Stronger move than fixing all ten at once: make **one** — the Title & Hook Generator, since it's the first thing a new user sees — fully real end to end (backend, limits, later billing), prove the loop, then repeat the pattern for the rest.
