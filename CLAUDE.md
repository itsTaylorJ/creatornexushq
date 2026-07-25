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

**Docs discipline:** any change to architecture, the data model, limits, or
strategy updates THIS FILE in the SAME commit. A stale CLAUDE.md is worse than
none — it already caused one wrong call (Firestore was documented as "dead,
flagged for deletion" while it was being made the profile store).

## Stack

- **Frontend:** 16 static HTML pages (15 shipped + `design-preview.html`, an
  internal `noindex` mockup), vanilla CSS/JS, no build system.
  Dark theme (#080810 bg, purple #7c3aed / cyan #06b6d4 accents), DM Sans.
  Deployed via Firebase Hosting (`firebase deploy --only hosting`).
  `firebase.json` excludes `worker/`, `*.md` and package files from the public
  bundle and sends `Cache-Control: no-cache` on every `*.html`.
- **Auth:** Firebase Auth (email/password + Google), project `creatornexushq-eaf70`,
  SDK 12.14.0 loaded from gstatic CDN. Auth-gate module scripts set
  `window.__currentUser`; pages are browsable logged-out, generation requires auth.
  Signup collects first name, last name, username (`/^[a-zA-Z0-9_.]{2,24}$/`),
  email, password, a required 13+ checkbox and an optional marketing opt-in.
  Username is a **display handle — uniqueness is NOT enforced** (deliberate; add
  an availability check only if handles ever become public).
- **Backend:** single Cloudflare Worker `creatornexushq-api` at
  [worker/src/index.js](worker/src/index.js). Deploy: `cd worker && npx wrangler deploy`.
  Verifies Firebase ID tokens via `jose` + Google JWKS.
- **Data — two stores, clear split:**
  - **Cloudflare KV** `RATE_LIMIT` (id `1df69e401a134d08829ef71f645d5f88`) =
    *ephemeral counters/entitlements*. Keys: `usage:<uid>:<YYYY-MM-DD>`,
    `usage:global:<day>`, `trial:<uid>` (no TTL), `pro:<email>` (value = last
    active day), `yt:q:<query>` (6h cache), `contact:*`.
  - **Firestore `users/<uid>`** = *durable user profile* (as of the Studio work).
    Fields: `email, name, first, last, username, age, optin, plan,
    profileComplete, createdAt` + content profile `niche, game, platforms[],
    grow[], size, keyword, updatedAt`. Written at signup (auth page) and
    merged from the Studio. This was previously dead data — it now has a job.
    `localStorage.cnx_profile` is the instant/offline cache in front of it.
  - **Security:** [firestore.rules](firestore.rules) — a signed-in user may
    read/write ONLY their own `users/{uid}`; everything else denied. This closed
    the open test-mode database. Deploy with
    `firebase deploy --only firestore:rules` (hosting deploys do NOT ship rules).
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
- **Cost reality (measured, not estimated):** a titles generation billed ~2,400
  total tokens for ~390 visible output tokens — roughly a **5x hidden reasoning
  multiplier**. "Unlimited" at $12 loses money once inference is paid; AUDIT.md
  recommends Creator 40/day and Pro 150/day instead.

## Page map

- **`creatornexushq-studio.html` — THE app home** (new, clean design system).
  All landing entry points + every auth redirect route here. Contains:
  the tool rail, the shared **"Your Channel" context bar** (localStorage,
  synced to Firestore), the welcome/profile survey modal, the **Account page**
  (`switchTool('account')` — name/username/email/plan/prefs/sign out), and the
  migrated **Titles & Descriptions** tool. Tools not yet migrated show a card
  linking to their legacy page.
- `index.html` — landing (pricing, Tools dropdown, contact form, auth-aware nav).
  All 9 app entry points route to the Studio.
- `creatornexushq-app.html` — legacy tools (Titles & Hooks w/ keyword field +
  live ranking panel, CTAs, Content Ideas; upgrade modal)
- `creatornexushq-analyze.html` — legacy analyzer page: 6 sub-tools, including
  the merged **Tags & Hashtags** tool (rate-or-generate in one flow — the old
  separate Tag Suggester card is gone)
- `creatornexushq-thumbnail.html` — thumbnail analyzer (vision) + AI prompt gen
- `creatornexushq-streaming.html` — stream planner
- `creatornexushq-monetization/resources/platforms.html` — functional support pages
- `creatornexushq-competitor/collab/trends.html` — honestly gated "Coming Soon"
- `creatornexushq-auth.html` — signup/login (email + Google)
- `creatornexushq-terms/privacy.html` — legal
- `design-preview.html` — internal design-direction mockup, `noindex`, not linked

Every non-Studio page carries a **"Back to Studio"** link — no page dead-ends
during the migration.

## Architecture gotchas (learned the hard way)

- Several pages contain **duplicated/minified CSS copies** of the same rules.
  Bulk edits MUST use Node scripts with literal string replacement, then run
  `node --check` on every extracted `<script>` block. Override style blocks
  (`cnx-accent`, `cnx-deskfix`, `cnx-contrast`, `cnx-mobilenav`) injected
  before `</head>` are the established pattern for cross-page CSS changes.
- `* { position: relative; z-index: 1 }` exists on some pages — it has caused
  invisible-element bugs (file input unclickable, dropdown stacking).
- HTML is now served `no-cache` (header in `firebase.json`), but browsers and
  the CDN still hold stale copies — hard-refresh (Ctrl+Shift+R) after deploy.
- Wrangler KV CLI crashes on this Windows box (libuv assertion) — use the
  Cloudflare dashboard for KV operations.
- Links into `app.html` / `analyze.html` MUST carry `?tab=<id>` — bare links
  dump the user on the default tab (this was a real reported bug across 70
  sidebar links). Both pages have a param reader.
- `creatornexushq-auth.html` sets an `authInProgress` flag so the
  `onAuthStateChanged` auto-redirect can't race a fresh signup; new accounts go
  to `studio.html?welcome=1` (opens the survey), returning users straight in.
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

## Studio consolidation (current major effort)

~16 scattered/duplicated entry points are being consolidated into **7 tools**
inside the Studio, on one clean design system (the legacy pages carry the
tripled/minified CSS and are being retired tool-by-tool, never big-bang):

| Studio tool | Absorbs |
|---|---|
| **Titles & Descriptions** ✅ migrated | titles gen + title/desc analyzer + SEO score |
| Tags & Hashtags | merged tag analyzer/suggester + cross-platform pack |
| Thumbnails | analyzer + AI prompt gen |
| Ideas, Hooks & CTAs | content ideas + CTAs |
| Posting Schedule | schedule + calendar builder |
| Live Titles | stream planner (+ TikTok Live, Rumble) |
| Channel Audit | analytics advice + content patterns + **manual metric entry** |

Rules while migrating: old pages stay live until their replacement is verified;
every legacy page has a **"Back to Studio"** link; sidebar sub-links use
`?tab=<id>` deep links (both `app.html` and `analyze.html` have a param reader).

**Analytics strategy:** YouTube + Twitch can auto-connect via OAuth later;
every other platform gets **self-serve manual metric entry**. Both feed the
same audit engine (benchmark → diagnose bottleneck → route to the fixing tool).
Never imply we have live TikTok/IG trend data — we don't.

**Verification:** use **Playwright MCP** (the in-app preview pane hangs on
screenshots). Screenshot + `browser_evaluate` for DOM assertions.

## Current roadmap position (Phase 1 = beta blockers)

Phase 1 **complete**: landing auth-gate, 401 retry, platform title rules,
platform-aware hashtags + dual descriptions + keyword field, 14 tones,
purple-on-purple fix, trial metering 50/day, global cap 800, honest modal copy,
merged Tags & Hashtags tool, deterministic 0-100 SEO scorer, CLAUDE.md,
Google sign-in verified by the owner.

Now in **Phase 2 — the Studio consolidation** (see the section above).

Phase 2 shipped so far:
- Studio shell + shared "Your Channel" context + **Titles & Descriptions** tool
- Connected onboarding: signup collects first/last/username + 13+/marketing
  consent → welcome survey → Firestore profile → shared context
- `firestore.rules` (closed the open test-mode database)
- Studio is **home**: all landing links + auth redirects route there; it has a
  real **Account page**; 70 `?tab=` routing fixes; "Back to Studio" everywhere

**Next in line (agreed order, one at a time with a check-in each):**
Tags & Hashtags → Thumbnails → Ideas/Hooks/CTAs → Posting Schedule →
Live Titles → Channel Audit. Then "My Analytics" (YouTube read-only OAuth,
needs ~30 min of Google Cloud setup from the owner; Twitch as a fast follow).

Tags & Hashtags design (already confirmed): one tool, two modes — paste current
tags to get them **rated**, or leave blank to **generate** a set; plus the
cross-platform pack and a YouTube tag score grounded in our live ranking data.
Be honest about the 500-character myth — TubeBuddy's own guidance is that tags
are relevance confirmers, not ranking boosters (first tag weighs most, ~8–12
tags / 200–300 chars is the useful range). Do NOT copy vidIQ's "fill 500 chars
to score 100" vanity metric.

Later: Phase 3 monetization (**paid inference FIRST**, then Stripe — the Groq
free tier caps at roughly 50 active users and cannot carry paid plans), Phase 4
differentiation (YouTube read-only OAuth → real channel analytics).
Full audit + phased plan in AUDIT.md §9-10.

## Known debt / loose ends

- Orphan KV key `trial:XjGieou5cHMbFJivmPcAOYeZJ2t1` from audit testing — inert,
  delete via the Cloudflare dashboard (the CLI crashes here).
- `og-image.svg` is never rasterized to PNG — most social scrapers won't render it.
- Landing still carries some fluff stats ("100% Creator Focused", "$0 To Get
  Started") that say nothing; slated for removal.
- Titles tool still lacks the "adapt this for other platforms" section.
- No generation history, and no BYO-API-key escape hatch for power users.

## Owner's product principles (stated repeatedly — honour these)

- **Polish over speed.** "I'm not worried about the fastest path to beta, I'm
  worried about a functioning polished product." Solo-funded; aiming for a
  flagship worth real investment. Don't rush to ship half-built things.
- **Great at 1–2 things**: YouTube titles + tags must beat vidIQ/TubeBuddy;
  everything else must be good and coherent, not padding.
- **Gaming-first but genuinely all-creator** (TCG/Pokémon, vlogs, fitness,
  podcasts, IRL). Never let the copy or options drift back to gaming-only.
- **Honesty is the differentiator** — see the standard at the top of this file.
