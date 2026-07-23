# CreatorNexusHQ — Project Context

All-in-one AI growth platform for content creators and streamers (all niches:
gaming-first but explicitly also TCG/card openings, unboxings, vlogs, podcasts,
beauty, IRL, etc.). Currently in pre-launch beta hardening. The #1 goal is a
FREE testable beta with real users before any monetization.

**Live site:** https://creatornexushq-eaf70.web.app
**API:** https://creatornexushq-api.tjlangston15.workers.dev
**Repo:** https://github.com/itsTaylorJ/creatornexushq (branch `main`; owner works across two computers — always `git pull` first)

## Non-negotiable product standard: HONESTY

No fake features, no fake data, no false promises. Unbuilt tools are gated
"Coming Soon". There is NO payment processing yet — never imply checkout
exists. Trials/limits shown to users must match what the server enforces.

## Stack

- **Frontend:** 14 static HTML pages, vanilla CSS/JS, no build system.
  Dark theme (#080810 bg, purple #7c3aed / cyan #06b6d4 accents), DM Sans.
  Deployed via Firebase Hosting (`firebase deploy --only hosting`).
- **Auth:** Firebase Auth (email/password + Google), project `creatornexushq-eaf70`,
  SDK 12.14.0 loaded from gstatic CDN. Auth-gate module scripts set
  `window.__currentUser`; pages are browsable logged-out, generation requires auth.
- **Backend:** single Cloudflare Worker `creatornexushq-api` at
  [worker/src/index.js](worker/src/index.js). Deploy: `cd worker && npx wrangler deploy`.
  Verifies Firebase ID tokens via `jose` + Google JWKS.
- **Data:** Cloudflare KV namespace `RATE_LIMIT` (id `1df69e401a134d08829ef71f645d5f88`).
  Keys: `usage:<uid>:<YYYY-MM-DD>`, `usage:global:<day>`, `trial:<uid>` (no TTL),
  `pro:<email>` (value = last active day), `yt:q:<query>` (6h cache),
  `contact:*`. Firestore exists but is effectively unused (a stale user doc is
  written at signup — flagged for deletion; KV is the system of record).
- **AI:** hybrid free-tier. Text: Groq `openai/gpt-oss-120b` primary,
  Gemini `gemini-flash-latest` fallback. Vision: Gemini primary, Groq
  `meta-llama/llama-4-scout-17b-16e-instruct` fallback. `max_tokens: 3000`
  (reasoning tokens count against it; lower values truncated output).
  `normalizeModelText()` strips markdown-bold label drift server-side.
- **Live data:** YouTube Data API (`YOUTUBE_API_KEY` secret) feeds real ranking
  titles/views/tags into `titles`, `analyze-tags`, `tag-suggester` when
  platform=YouTube. Budget `YT_DAILY_SEARCH_BUDGET=90` searches/day, 6h KV cache
  (search.list costs 100 quota units of the 10k/day default).

## Worker secrets (set via `npx wrangler secret put`)

`GROQ_API_KEY`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`. (An old Anthropic key
exists as `ANTHROPIC_API_KEY` reserved for a future paid tier; unused.)

## Limits & plans (server-enforced in the Worker)

- Free: 5 generations/day. Trial: auto 7-day Pro trial starting at FIRST
  generation, metered 50/day. Pro (KV grant by email): unmetered.
- `GLOBAL_DAILY_LIMIT = 800`/day site-wide (protects Groq free tier ~1k/day).
- Credits increment only AFTER successful generation.
- Pricing (landing page, honest "billing launches after beta"): Free $0 /
  Creator $12/mo ($120/yr) / Pro $29/mo ($290/yr). NO Stripe yet — payment is
  deliberately LAST, after beta validates value.

## Page map

- `index.html` — landing (pricing, Tools dropdown, contact form, auth-aware nav)
- `creatornexushq-app.html` — main tools (Titles & Hooks w/ keyword field +
  live ranking panel, CTAs, Content Ideas; upgrade modal)
- `creatornexushq-analyze.html` — 6 analyzer sub-tools + tag suggester
  (merge into one Tags & Hashtags tool is planned — see roadmap)
- `creatornexushq-thumbnail.html` — thumbnail analyzer (vision) + AI prompt gen
- `creatornexushq-streaming.html` — stream planner
- `creatornexushq-monetization/resources/platforms.html` — functional support pages
- `creatornexushq-competitor/collab/trends.html` — honestly gated "Coming Soon"
- `creatornexushq-auth.html` — signup/login (email + Google)
- `creatornexushq-terms/privacy.html` — legal

## Architecture gotchas (learned the hard way)

- Several pages contain **duplicated/minified CSS copies** of the same rules.
  Bulk edits MUST use Node scripts with literal string replacement, then run
  `node --check` on every extracted `<script>` block. Override style blocks
  (`cnx-accent`, `cnx-deskfix`, `cnx-contrast`, `cnx-mobilenav`) injected
  before `</head>` are the established pattern for cross-page CSS changes.
- `* { position: relative; z-index: 1 }` exists on some pages — it has caused
  invisible-element bugs (file input unclickable, dropdown stacking).
- Firebase Hosting caches aggressively — hard-refresh (Ctrl+Shift+R) after deploy.
- Wrangler KV CLI crashes on this Windows box (libuv assertion) — use the
  Cloudflare dashboard for KV operations.
- The Worker's tool prompt table `TOOLS` keys on `tool`; `thumbnail-prompt`
  reads `f.aiTool` because `tool` is the routing key.
- All 6 client generate calls go through `cnxFetch()` (401 → force-refresh
  token → retry once). Don't add raw fetches with bare `getIdToken()`.
- Platform-adaptive titles: `PLATFORM_RULES` + `platformKey()` in the Worker.
  Feed platforms (TikTok/IG/X/Snap/FB) output `CAPTION n:` with baked hashtags;
  YouTube outputs clean `TITLE n:` + `SHORT DESCRIPTION` + multi-line
  `FULL DESCRIPTION` (client renders it as one copyable block).

## Testing patterns

- Throwaway auth accounts via Identity Toolkit REST
  (`accounts:signUp` / `accounts:signInWithPassword` / `accounts:delete`)
  with emails like `x-<ts>@creatornexushq-audit.invalid`. ALWAYS delete after.
- Local preview: tiny Node static server on :8765 (no Python on this box).
- `AUDIT.md` (2026-07-20) holds the full audit + phased launch plan.
- `ROADMAP.md` holds tool status + Pro-grant commands.

## Current roadmap position (Phase 1 = beta blockers)

Done: landing auth-gate, 401 retry, platform title rules, platform-aware
hashtags + dual descriptions + keyword field, 14 tones, purple-on-purple fix,
trial metering 50/day, global cap 800, honest modal copy.
Remaining P1: tool onboarding (how-it-works + try-example on all 10 tools),
merge Tag Analyzer+Suggester into one Tags & Hashtags tool, deterministic
0-100 SEO scorer (title/description/tags), manual Google sign-in verification.
Then Phase 2 polish (organizer, history, BYO key), Phase 3 monetization
(paid inference FIRST, then Stripe), Phase 4 differentiation (YouTube
read-only OAuth). Details in AUDIT.md §9-10.
