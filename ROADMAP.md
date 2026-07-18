# CreatorNexusHQ — Roadmap

Working notes for getting this from a static prototype to a small, honest beta before advertising or turning on billing. Full findings write-up with severity ranking: https://claude.ai/code/artifact/8ae39583-cac0-425d-97b7-6699d14adac5

## Where things stand

Live at https://creatornexushq-eaf70.web.app (Firebase Hosting for the static site). Backend: a Cloudflare Worker at `worker/`, deployed and live at `creatornexushq-api.tjlangston15.workers.dev`, generating real output via Groq's free tier (`openai/gpt-oss-120b`) — confirmed working end to end.

**File structure note:** `index.html` and the tools app swapped roles this session. The root URL now serves the actual marketing/landing page (previously `creatornexushq-landing.html`, now deleted as a separate file) so a new visitor sees an explanation of the product instead of a login wall. The tools app itself lives at `creatornexushq-app.html`. Every internal link across all 14 pages was updated to match — verified via full-codebase grep, no stray references to the old names remain.

| Page | Core action | Status |
|---|---|---|
| index.html | Marketing/home page | **Real** — the actual front door now; testimonials removed (were fabricated placeholder quotes) |
| creatornexushq-auth.html | Sign up / log in | **Real** — live Firebase Auth + Firestore |
| creatornexushq-monetization.html | Track progress to monetization | **Real** — pure client-side math, accurate thresholds |
| creatornexushq-resources.html | Browse tool directory | **Real** — static, honest, no fake data |
| creatornexushq-app.html | Titles, hooks, CTAs, ideas, analytics advice | **Real** — browsable while logged out; signing in is only required when you actually click Generate (soft gate via a modal, not a page redirect); real per-account daily limits |
| creatornexushq-analyze.html | Six analyzers + Tag Suggester | **Real** — wired to the Worker; Tag Suggester still uses the user's own YouTube key client-side for live competitor data |
| creatornexushq-thumbnail.html | Thumbnail scoring & prompts | **Real** — prompt generator + vision analysis (Groq Llama 4 Scout, Preview model — watch quality) |
| creatornexushq-streaming.html | Stream title generator | **Real** — wired to the Worker |
| creatornexushq-competitor.html | Competitor research | **Coming Soon** gate — was asking the AI to invent real channel names, deliberately not shipped as-is |
| creatornexushq-collab.html | Find collab partners | **Coming Soon** gate — was asking the AI to invent real people, deliberately not shipped as-is |
| creatornexushq-trends.html | Live trend tracking | **Coming Soon** gate — LLMs have no real-time data, deliberately not shipped as-is |
| creatornexushq-platforms.html | Connect YouTube/Twitch/etc. | OAuth connect now shows an honest "coming soon"; manual stat entry (Kick/Rumble style) still works and is honest |

## Path to a testable beta (no billing yet)

**Phase 0 — Stop overpromising — ✅ done**
- Fixed the `#planBadge` crash on `creatornexushq-platforms.html` (and the same bug on `creatornexushq-app.html`).
- Competitor Research, Collab Finder, and Trend Tracker now show an honest "Coming Soon" state instead of a broken generate flow, with a "Soon" badge in every sidebar/mobile nav.
- The still-live tools (Titles/Hooks/CTAs/Ideas/Analytics, Thumbnail Analyzer, Stream Planner, Tag Suggester) show a clear "backend not connected yet" message on failure instead of a generic error.

**Phase 1 — Build the one real backend — ✅ done, confirmed working**
- Went with **Cloudflare Workers** instead of Firebase Cloud Functions — same result, but the free tier needs no credit card at all (Firebase Functions require the Blaze pay-as-you-go plan). See `worker/`.
- `worker/src/index.js`: verifies the caller's Firebase ID token (via `jose`, against Google's public JWKS — no Firebase Admin SDK needed), enforces 5 free generations/day per account via Cloudflare KV (usage only counts on a *successful* generation — failed/errored attempts don't cost a credit), and calls **Groq's free tier** (`openai/gpt-oss-120b`, OpenAI-compatible API, no credit card) rather than Anthropic — Anthropic has $0 usable credit and real API access has no free tier, so Groq is the free-testing provider for now. `ANTHROPIC_API_KEY`/model handling is left in place but dormant, reserved for a future paid tier.
- `creatornexushq-app.html` is wired to call it: requires login (redirects to `creatornexushq-auth.html` if signed out), sends the Firebase ID token, shows the upgrade modal on a real 429 from the server instead of a client-side guess, and reads the real remaining-generations count back from the Worker.
- Also fixed this round: the Generate button could get stuck on "Generating..." after an error/rate-limit response (button reset now runs in a `finally` block, so it always fires); added account management to the sidebar and mobile nav (signed-in email + working Sign Out).
- **Fast-follow** (same Worker, no new backend work): wire `creatornexushq-streaming.html`, `creatornexushq-analyze.html`, and `creatornexushq-thumbnail.html` to the same `/generate` endpoint, using `creatornexushq-app.html` as the template. Note: the vision path (Thumbnail Analyzer) needs a vision-capable free model — `gpt-oss-120b` is text-only — so that one needs a follow-up model decision, not just wiring.

**Phase 2 — Wire real usage limits into the UI — mostly done for creatornexushq-app.html**
- `creatornexushq-app.html` now reads the remaining-generations count back from the Worker's response rather than guessing client-side.
- Still to do: apply the same pattern to the fast-follow pages once wired.

**Phase 3 — Cut the honest scope for beta — mostly done**
- Competitor Research / Collab Finder / Trend Tracker are gated (see Phase 0).
- Real home page now live (see file structure note above) with a soft sign-in gate on the tools app — browse freely, prompted to sign in only when you try to generate.
- Full 14-page mobile audit done this round (375×812 screenshots of every page): fixed two header-overflow bugs (landing page CTA button, auth page "Log in" link both clipping/wrapping), removed dead legacy CSS on `creatornexushq-analyze.html`/`creatornexushq-platforms.html` that was pinning a nav bar to the bottom and overlapping content, fixed a translucent-nav text-bleed issue on the three Coming Soon pages, and tightened the landing page's scroll-reveal animation so fast mobile scrolling doesn't show blank gaps.
- Still to do: replace the fake OAuth "Connect" buttons on `creatornexushq-platforms.html` with the honest manual-entry pattern the Monetization Tracker already uses.

**Phase 4 — Minimal safety net before inviting anyone — ✅ done**
- "Send Feedback" mailto link in every app-shell sidebar (10 pages).
- Global daily generation cap in the Worker (150/day site-wide, all users incl. Pro) so beta testing can't drain the free Groq token quota; distinct 429 message when hit.
- Per-account 5/day limit unchanged for free users; both counters reset at midnight UTC.

## Granting Pro (comps / free trials — no billing needed)
The Worker checks Cloudflare KV for `pro:<email>` (the email the person signs in with, lowercased). Value = last day the grant is active (YYYY-MM-DD, UTC). Pro = unlimited generations (global cap still applies).

Grant a week (run in your own terminal, from anywhere):
```
wrangler kv key put --namespace-id=1df69e401a134d08829ef71f645d5f88 "pro:friend@example.com" "2026-07-25" --remote
```
Revoke early:
```
wrangler kv key delete --namespace-id=1df69e401a134d08829ef71f645d5f88 "pro:friend@example.com" --remote
```
List active grants:
```
wrangler kv key list --namespace-id=1df69e401a134d08829ef71f645d5f88 --remote
```
The user sees "★ PRO PLAN" in the sidebar and an ∞ usage counter after their first generation. Grants expire automatically — no cleanup needed.

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
The plan was to make **one** tool fully real end to end before touching the rest — that's done and confirmed: `creatornexushq-app.html`'s tools (Titles & Hooks, CTAs, Ideas, Analytics) generate real output with real per-account limits, on a $0 free-tier backend. Next: repeat the exact same wiring pattern for Stream Planner and Analyze (the Worker already supports both); Thumbnail needs a vision-capable model decision first.
