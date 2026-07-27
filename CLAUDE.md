# CreatorNexusHQ — Project Context

All-in-one AI growth platform for content creators and streamers (all niches:
gaming-first but explicitly also TCG/card openings, unboxings, vlogs, podcasts,
beauty, IRL, etc.). Currently in pre-launch beta hardening. The #1 goal is a
FREE testable beta with real users before any monetization.

## PRODUCT PHILOSOPHY — read this before writing any code

**What we are.** The only place that knows *why* a creator's content worked.
Analytics tools show what happened. We were there when the decision was made —
the title they picked and the four they didn't, the thumbnail score they
overrode, the week they skipped. Attach outcomes to decisions and you have
something no analytics product can reconstruct afterwards.

**What we build.** One connected workflow: idea → make → package → publish →
review → better idea. The tools are *stages of that loop*, never destinations.
An operating system emerges from doing one journey exceptionally well, not from
accumulating unrelated utilities.

**What we refuse to build.** Daily-login streaks. Notification badges.
Artificial urgency. Leaderboards against other creators. "AI-powered" as a
headline. Referral loops before retention is proven. Anything that raises
engagement while lowering trust — trust is the only asset that compounds as fast
as memory, and it is destroyed in one decision.

**Memory over generation.** Generation is approaching free and gets cheaper every
year. A creator's history gets more valuable every week. Build and charge for the
thing that compounds. Every AI capability we want — coaching, prediction, real
personalisation — is gated on stored history, not on model quality. That is why
persistence is urgent rather than merely important.

**Quality means.** It works on a phone. It tells the truth when the truth is
unflattering. It says "nothing to change this week" when that's the honest
answer. Scores are deterministic where measurement is possible and labelled as
judgement where it isn't. Failures cost the user nothing and explain themselves.

**How we decide.** Before building anything, ask: *does this plausibly increase
the chance this creator publishes next week?* If not, it's v2 at best. When
unsure, prefer the option that makes the product quieter.

**How we prioritise.** MLP → Post-Beta → v2 → Long-Term Vision. Anything not
needed before the first outside creator touches the product is not MLP, however
good it is.

**How we measure.** North Star: **Weekly Shipped Rate** — the share of active
creators who published something this week. Uncheatable by engagement tricks; it
only moves if creators actually ship. We win only when they do.

**How we think about creators.** They publish weekly, not daily — designing for
daily use manufactures guilt. They are not "users to engage"; they are people who
mostly quit before succeeding, and the enemy is inconsistency, burnout and
overwhelm. Be useful at the moment of decision and quiet the rest of the time.

**Read [STRATEGY.md](STRATEGY.md) before planning work** — the full creator
journey, information architecture, memory model and AI ladder, with every
recommendation labelled MLP / Post-Beta / v2 / LTV.

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

**Never describe a file you have not just read.** This has now caused two wrong
calls in the same week: the Firestore one above, and a strategy doc that told a
future session to delete `monetization` and `resources` as "static filler" when
one is a working tool with 42 interactive elements and the other is a curated
list of 27 free creator tools. Both were written from memory. **Summarising code
you remember is how confident, wrong documentation gets written** — and wrong
documentation outlives the conversation that produced it. Open the file first.

## How to work on this project (the owner's standing instructions)

1. **`git pull` before touching anything.** The owner works across two
   computers; skipping this creates merge conflicts.
2. **Ask clarifying questions before building, and show the plan before writing
   code.** This has been requested on essentially every task. Do not start
   implementing off an ambiguous brief.
3. **Never deploy or push without saying so first.** Deploys are
   `firebase deploy --only hosting`, `--only firestore:rules`, and
   `cd worker && npx wrangler deploy` — call out which ones a change needs.
4. **One tool at a time, with a check-in after each.** No big-bang migrations.
   The legacy page stays live and untouched until its Studio replacement is
   verified working.
5. **Definition of done:** `node --check` on every extracted `<script>` block →
   verified in the browser with Playwright MCP → committed with CLAUDE.md
   updated in the same commit. Throwaway test accounts are ALWAYS deleted.
6. **Report honestly.** If something is half-working, say so plainly. Don't
   claim verification that didn't happen. This is the same standard the product
   is held to.

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
    Fields: `email, name, first, last, username, age, optin, plan, planSeenAt,
    profileComplete, createdAt` + content profile `niche, game, platforms[],
    grow[], size, keyword, cadence, updatedAt`. Written at signup (auth page) and
    merged from the Studio. This was previously dead data — it now has a job.
    `localStorage.cnx_profile` is the instant/offline cache in front of it and
    carries a **`uid` stamp** (see the entitlement gotcha below).
    ⚠️ **`plan` here is a MIRROR, not the authority** — KV is. It is written by
    `__savePlanRemote()` whenever the Worker reports a plan, purely so a second
    device isn't stale on arrival.
  - **Firestore `users/<uid>/content/<id>`** = **the creator's record** (shipped
    2026-07-26). One document per piece of content, carrying every stage
    decision: `{type, status, platform, topic, contentType, url, publishedAt,
    stages:{title:{chosen, suggested[], hooks[], sections{}, score, keyword,
    shortDescription, fullDescription, at}, ...}, outcome, createdAt, updatedAt}`.
    Written by `window.__contentCreate/Update/List/Get/Delete` in the Studio's
    module script. **This is the moat** — see [PRODUCT.md](PRODUCT.md).
    `hooks[]` and `sections{}` (BEST COMBO / SUGGESTED TAGS / HASHTAGS / SHORT
    DESCRIPTION) were **added 2026-07-26** so reopening a video can rebuild the
    whole results pane; storing only the chosen title made the record look
    complete while the creator's hooks and hashtags were silently lost.
  - **Firestore `users/<uid>/weeks/<isoWeek>`** = the weekly review, **immutable
    once written** (enforced in rules, not trusted to the client — a rewritable
    history is worth less than none).
  - **Security:** [firestore.rules](firestore.rules) — a signed-in user may
    read/write ONLY their own `users/{uid}` **and its `content`/`weeks`
    subcollections**; `weeks` allows create but refuses update/delete;
    everything else denied. Deploy with `firebase deploy --only firestore:rules`
    (hosting deploys do NOT ship rules). **Verified by test:** creator B gets 403
    reading, listing or writing creator A's content, anonymous gets 403, and
    patching a closed week gets 403.
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
  multiplier**. "Unlimited" at $12 loses money once inference is paid — kill it,
  and see STRATEGY.md for the corrected tiers.

## Page map

- **`creatornexushq-studio.html` — THE app home** (new, clean design system).
  All landing entry points + every auth redirect route here. Contains:
  the tool rail, the shared **"Your Channel" context bar** (localStorage,
  synced to Firestore), the welcome/profile survey modal, the **Account page**
  (`switchTool('account')` — name/username/email/plan/prefs/sign out), and the
  migrated **Titles & Descriptions** tool. Tools not yet migrated show a card
  linking to their legacy page.
- `index.html` — landing (pricing, Tools dropdown, contact form, auth-aware nav).
  **As of 2026-07-27 every public tool link routes to a Studio tab**
  (`?tab=titles|tags|thumbs|ideas|schedule|live|audit|content`) — verified in the
  browser as 8 distinct deep links and **zero** links to `app`/`analyze`/
  `thumbnail`/`streaming`. This file previously claimed that and it was false:
  the grid still sent people to the legacy pages, and worse, listed **Competitor
  Research as a "Free" feature card** promising competitor title formulas and
  **Trend Tracker as "Pro"** promising live trend data. Neither exists; nobody
  has live TikTok/IG trend data. Those three cards and their nav links are gone,
  replaced by one plain sentence saying they aren't built. The legacy pages are
  untouched and still reachable directly — unlinked, not deleted.
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
- **Grid tracks must be `minmax(0,1fr)`, never bare `1fr`.** A `1fr` track has an
  automatic minimum of `min-content`, so long result text blows the column past
  the viewport. This shipped as a real mobile-overflow bug in the Studio's
  `.split` mobile override and will recur in every migrated tool. Same class of
  fix: flex children that ellipsis (`.yt-panel .rowd .v`) need `min-width:0`.
  Always measure `documentElement.scrollWidth` vs `clientWidth` at 375px.
- **`scrollWidth` vs `clientWidth` does NOT catch content hidden inside an
  `overflow:auto` child.** The Studio's `.ctx-chips` is a 149px window onto 445px
  of chips at 375px — 296px sits behind an unmarked horizontal scroll, and the
  page-level overflow check reports a clean 0. When a row is a scroll container,
  measure **that element's** `scrollWidth - clientWidth` too.
- **Entitlement authority is the Worker (KV), never Firestore.** Firestore's
  `plan` is written once at signup and never updated, so hydrating it over the
  Worker's verdict made an active trial read "Free plan" on every reload — the UI
  claiming 5/day while the server metered 50, which the honesty standard forbids.
  The Studio now prefers the cached verdict, but **only when the cache is stamped
  with the current `uid`** — an unstamped or foreign cache is discarded, or a
  previous user's `pro` would be read as this user's.
- **`localStorage.cnx_profile` is per-account and must be treated that way.** It
  holds name, username, **email**, niche, platforms and size. It is cleared on
  sign-out and dropped on a `uid` mismatch at sign-in. Before that, signing out
  left the previous creator's channel on screen for the next person.
- **The Studio is routed: `?tab=<id>` is the address of every destination.**
  `TOOL_IDS` is the allowlist, `switchTool(id, btn, opts)` pushes history,
  a `popstate` listener replays state with `{silent:true}`, and `initRoute()`
  normalises the URL on first paint. A specific video is `?tab=titles&c=<id>`;
  that id is only ever read through `__contentGet`, which is scoped to the
  signed-in uid, so it cannot reach another creator's record.
  ⚠️ **Read `?welcome=1` BEFORE normalising the URL.** `initRoute()` replaces
  the query string, so the auth module can't re-read `location.search` later —
  the flag is captured once into `window.__welcomeRequested`. Get this wrong and
  onboarding silently never opens for new signups.
  ⚠️ Re-clicking the active tool must not push a duplicate entry, or Back
  becomes "press it four times to leave the same screen".
- **`prompt()`/`confirm()` are banned in the Studio.** Publishing uses the
  `#publishScrim` dialog (`role="dialog"`, `aria-modal`, focus moved in on open
  and returned to the invoking button on close, Escape wired to `closePublish`).
  `safeUrl()` accepts only `http:`/`https:` — anything else is stored as typed
  but **never rendered as an anchor**, so a saved string can't become a
  clickable script. `removeContent()` still uses `confirm()` and is the next one
  to convert.
- **The Titles renderer is split: `renderTitles()` parses model text,
  `paintTitles()` draws.** Reopening a saved video calls `paintTitles()` with the
  stored record, so the creator sees their work instead of an empty form. The
  restored view **recomputes** the score from the stored title + description
  (deterministic, so it matches what was stored) and **never** re-renders the
  live YouTube ranking panel — that data was true at generation time and is not
  stored, so re-showing it would be a fabricated "right now".
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
- **Never interpolate a JSON string into an inline `onclick`.** Every Studio
  Copy button was silently broken for weeks by
  `onclick="copyText(this,'+JSON.stringify(JSON.stringify(v))+')"` — the
  payload's leading `"` closed the HTML attribute, so the click threw
  "Unexpected end of input" and copied nothing, while the parser turned the
  rest of the text into junk attributes. Values ride in `data-` attributes
  through `esc()` instead. Test copy buttons by **clicking** them and reading
  the clipboard; they look perfectly fine until you do.
- **Model output drift is handled server-side in `normalizeModelText()`** —
  bold labels, bold *values* (`IDEA 1: **Title**` rendered the asterisks), and
  bullet prefixes. Quote-wrapped values are stripped client-side by `strip()`.
  When a new tool renders oddly, check these two before touching the prompt.
- Prompts must use **ALL-CAPS labels only** — a prompt that asked the model to
  "GROUP them under Verbal CTAs / On-Screen CTAs" produced mixed-case headings
  the section parser couldn't read. Make every group an explicit label. Also
  tell it explicitly to emit **every** label and **not to qualify** them: the
  schedule tool silently lost sections to `### BEST TIMES TO POST (CT)`.
- **`parseSections()` is shared by every tool — treat it as load-bearing.** It
  tolerates markdown decoration (`###`, `**`, `-`), a parenthetical qualifier,
  a heading with no colon, and content on the lines beneath a bare label, while
  still refusing to read mixed-case `TikTok:` lines as labels. 13 unit tests
  pin both directions; run them after any change here.
- **Test harnesses must `eval` the real function out of the HTML**, never keep
  their own copy. A stale duplicated parser in a live-test script reported a
  failure that no longer existed and sent me chasing a phantom.
- Platform-adaptive titles: `PLATFORM_RULES` + `platformKey()` in the Worker.
  Feed platforms (TikTok/IG/X/Snap/FB) output `CAPTION n:` with baked hashtags;
  YouTube outputs clean `TITLE n:` + `SHORT DESCRIPTION` + multi-line
  `FULL DESCRIPTION` (client renders it as one copyable block).

## Testing patterns

- Throwaway auth accounts via Identity Toolkit REST
  (`accounts:signUp` / `accounts:signInWithPassword` / `accounts:delete`)
  with emails like `x-<ts>@creatornexushq-audit.invalid`. ALWAYS delete after,
  and **verify** deletion by re-signing in (expect `INVALID_LOGIN_CREDENTIALS`);
  ID tokens expire after an hour, so re-authenticate before cleaning up.
- ⚠️ **Delete the Firestore documents BEFORE the auth account.** The rules key on
  `request.auth.uid == uid`, so once the account is gone nothing can reach
  `users/<uid>` or its subcollections from any client — the data is orphaned and
  needs the Firebase console. This mistake has been made once; see Known debt.
- **Rules verification is a script, not a code read** — sign in as A, sign up B,
  and assert 403 for anonymous read/list, B reading/listing/writing/deleting A's
  content and weeks, and **the owner's own** PATCH/DELETE against a closed week.
  14 checks, all passing as of 2026-07-26.
- Local preview: tiny Node static server on :8765 (no Python on this box).
  Firestore and Auth work from `localhost`; the **Worker does not** (CORS is
  production-origin only by design), so generation can't be tested locally.
  To exercise a path that needs saved output, seed a content doc over the
  Firestore REST API instead of spending a generation.
- **Seed data must be internally consistent.** A hand-written stage with an
  invented `score` will disagree with the recomputed one and look like a bug in
  the product rather than in the fixture.

## Decisions already made — do not relitigate without new evidence

Each of these was investigated with real numbers and settled. Reopening them
costs days. If you have genuinely new information, say what changed.

- **No full-stack rewrite** (Next.js / TypeScript / Postgres / Redis / vector DB).
  The current stack is deployed, working and costs ~nothing. A rewrite delivers
  zero user-facing value, adds three paid services and three failure modes, and
  is a 2–3 month stall for a solo founder. Rewrite when scale forces it.
- **No multi-agent "creative swarms".** N sequential calls where we make 1 — 5×
  cost and 5× latency on top of an already-measured 5× reasoning multiplier, for
  marginal quality. A better single prompt beats a swarm of mediocre ones.
  Measured: ~$0.025/generation vs ~$0.005 today.
- **No predictive eye-tracking / thumbnail heatmaps.** Not deliverable at this
  scale; it would be a fabricated metric, which the honesty standard forbids.
- **No direct posting / upload publishing.** Different product entirely (upload
  queues, retry logic, token refresh) and gated behind YouTube + TikTok +
  Instagram app review — a multi-month bureaucratic path with real rejection
  risk. **Build the organizer, not the publisher.** The creator's problem isn't
  "clicking upload is hard", it's "what should I post, where, when".
- **No long-form → Shorts video pipeline.** ffmpeg, transcoding, object storage
  and per-GB costs are architecturally incompatible with a Workers/static stack.
  It's the one deferred idea with real market pull — revisit only after paying
  users exist.
- **YouTube read-only OAuth is the right OAuth** (read, never write). Light
  approval burden, and it's what turns "AI writes titles from your description"
  into "from what actually works on *your* channel". Sequenced *after* content
  memory exists, so it has decisions to attach outcomes to.
- **BYO API key is a good idea, still unbuilt.** Power users bring their own
  Gemini/Groq key → unlimited for them at $0 marginal cost to us. Roughly two
  days of work and it directly relieves the ~50-user ceiling.

## Pro grants & entitlements (operational runbook)

**Automatic trial:** every account gets a 7-day Pro trial starting at its *first
generation*, not signup. KV `trial:<uid>`, no TTL, so a lapsed trial can't
restart. Metered 50/day.

**Manual comps:** Worker checks KV `pro:<email>` (lowercased sign-in email);
value = last active day `YYYY-MM-DD` UTC. Manual grants beat trial state and
expire on their own — no cleanup needed.

```bash
wrangler kv key put --namespace-id=1df69e401a134d08829ef71f645d5f88 "pro:friend@example.com" "2026-07-31" --remote
wrangler kv key delete --namespace-id=1df69e401a134d08829ef71f645d5f88 "pro:friend@example.com" --remote
wrangler kv key list --namespace-id=1df69e401a134d08829ef71f645d5f88 --remote
```

⚠️ The Wrangler **KV CLI crashes on the Windows box** (libuv assertion). Use the
Cloudflare dashboard there, or run these from the other machine.

## The design sequence (standing method — each step gates the next)

```
1. Company / product identity   → PRODUCT.md    ✅ done
2. Creator journey (workflows)  → STRATEGY.md   ✅ SIGNED OFF 2026-07-26
3. Information architecture     → STRATEGY.md   ✅ SIGNED OFF 2026-07-26
4. Data model                   → STRATEGY.md   ✅ RATIFIED (derives from 2+3)
5. Technical roadmap            → CLAUDE.md     ✅ set — build the thin loop
6. Beta strategy                → STRATEGY.md   ⚠️ 3 creators first, then 10
```

**The order exists to stop us engineering beautifully around wrong assumptions.**
Steps 4–6 *derive* from 2–3. If the journey or IA ever changes, **throw the data
model away and re-derive it** — never bend the journey to fit a schema that
happened to get written first.

**Two owner corrections during sign-off, both adopted, both right:**
1. The tools must **not** be hidden behind a flyout — extra layers get in the way.
   They stay in the sidebar; the workflow lives inside each piece of content.
2. The loop follows **the creator's own cadence**, not a fixed week. The earlier
   "quiet Tuesday to Thursday" framing baked one rhythm into the product.

## Doc hierarchy (read in this order)

1. **CLAUDE.md** (this file) — authoritative current state, how to work here,
   product philosophy. If another doc disagrees on facts, this wins.
2. **[PRODUCT.md](PRODUCT.md)** — what company this is: mission, brand promise,
   manifesto, anti-principles, ideal first customer, creator memory strategy,
   flywheel, five-year vision. **The most durable doc here** — roadmaps expire,
   this shouldn't. Read before proposing any feature.
3. **[STRATEGY.md](STRATEGY.md)** — the design: creator journey, information
   architecture, memory model, AI ladder, beta plan. Everything labelled
   MLP / Post-Beta / v2 / LTV.
4. **[TESTING.md](TESTING.md)** — manual QA checklist; add a section per tool.

Plus one **external** document, deliberately kept separate because it has a
different audience: **[TESTER-GUIDE.md](TESTER-GUIDE.md)** — the page handed to a
beta tester. What's real, what's gated, the known quirks, and the eight questions
worth asking them. Short and honest; it's the first thing a stranger reads.
⚠️ **It goes stale in the most damaging direction.** It sat for a while telling
strangers that Live Titles and Channel Audit "still say soon" *after* both had
shipped — an external doc understating a finished product. When a tool ships or
a limitation changes, update this file in the same commit as the others.

`AGENTS.md` is an **untracked mirror of this file** (gitignored) so other agent
harnesses get the same context. It had drifted 71 lines behind; re-copy CLAUDE.md
over it whenever CLAUDE.md changes.

*Folded in and deleted 2026-07-26: `ROADMAP.md` (tool status → the consolidation
table above; Pro-grant runbook → its own section) and `AUDIT.md` (measured unit
economics → Limits & plans; durable verdicts → Decisions already made). Four
internal docs is the ceiling — if a fifth appears, something needs folding.*

## Studio consolidation (current major effort)

~16 scattered/duplicated entry points are being consolidated into **7 tools**
inside the Studio, on one clean design system (the legacy pages carry the
tripled/minified CSS and are being retired tool-by-tool, never big-bang):

| Studio tool | Absorbs |
|---|---|
| **Titles & Descriptions** ✅ migrated | titles gen + title/desc analyzer + SEO score |
| **Tags & Hashtags** ✅ migrated | merged tag analyzer/suggester + cross-post pack |
| **Thumbnails** ✅ migrated | vision analyzer + AI prompt gen (two modes) |
| **Ideas, Hooks & CTAs** ✅ migrated | content ideas (each with a hook) + CTAs |
| **Posting Schedule** ✅ migrated | weekly calendar builder + schedule rating |
| **Live Titles** ✅ migrated | stream planner + TikTok Live + Rumble |
| **Channel Audit** ✅ migrated | manual metric entry → ratios → bottleneck → routes to the fixing tool |

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

- **Tags & Hashtags** migrated: rate-or-generate in one flow, deterministic tag
  score, per-tag ranking counts, compact cross-post pack
- **Thumbnails** migrated: two modes (score an upload / generate AI prompts),
  measured size checks + true-to-size mobile previews, AI sub-scores labelled
  as judgement. Vision reliability fixed (see below).
- **Ideas, Hooks & CTAs** migrated: ideas mode returns IDEA/WHY/HOOK per idea
  (so the tool's name is honest — hooks used to live only in Titles); CTA mode
  returns verbal vs on-screen plus placement and an "avoid this cliche" line.
- **Posting Schedule** migrated: build-a-week mode (calendar grid, timezone
  auto-detected, platforms prefilled from the profile) + rate-my-schedule mode.
- **"Try an example →"** on every live tool. A blank form was the biggest
  barrier to a first run — one click fills a realistic scenario. `EXAMPLES` in
  the Studio; add an entry whenever a tool ships.
- **[TESTING.md](TESTING.md)** — internal QA checklist. **[TESTER-GUIDE.md](TESTER-GUIDE.md)**
  — the short, friendly, honest page to hand an actual beta tester. Two
  different audiences; don't merge them.

- **Live Titles** migrated: 6 platforms with a live per-platform hint explaining
  how discovery differs, plus a character budget per title (Twitch 100,
  TikTok Live 40, others 70) that flags anything that will truncate.
  **`platformKey()` had two real bugs**: `'TikTok Live'` fell through to the
  feed rules, and **`'Rumble'` silently resolved to `youtube`**. Both now have
  their own `PLATFORM_RULES` entry, and the specific cases are checked first.
  Measured proof the rules bite: same input returns avg 65 chars on Twitch,
  **38 on TikTok Live**, 52 on Rumble, each shaped for that platform.

- **Channel Audit** migrated — **the Studio consolidation is COMPLETE. All 7
  tools are live and no rail item says "soon".** Works from self-entered
  numbers on any platform. Three layers, deliberately separated: **arithmetic**
  (views per follower, % of following reached, new followers per 1,000 views —
  computed client-side from what they typed), **judgement** (the AI diagnosis
  and benchmark, hedged as rules of thumb), and **the routing payoff** — the
  prompt ends with a machine-readable `FIX FIRST:` naming one of TITLES / TAGS /
  THUMBNAILS / IDEAS / SCHEDULE / LIVE, which `FIX_TOOLS` turns into a button
  that jumps straight to that tool. That line is load-bearing: if the model
  returns anything else the button silently won't render, so any prompt edit
  there needs a live re-test.
- The audit says **plainly, in the form and again in the results**, that no
  analytics account is connected and the numbers are the user's own. Never
  soften that — it's the difference between honest and fraudulent here.

**Phase 2 is done — but the 2026-07-26 strategy review reordered what comes
next. Do NOT start YouTube OAuth yet.**

## Phase 3 — the MLP: wire the loop, make it remember

The seven tools are already the stages of making a video. They were built as
seven destinations; they need to become one connected loop. Full design in
[STRATEGY.md](STRATEGY.md).

**Target navigation — SIGNED OFF 2026-07-26.** Two destinations are *added
above* the tools. **Nothing is hidden.** An earlier draft buried the seven behind
a "quick tools" flyout; the owner rejected it because it adds a click and hides
what people came for. That rejection was right — don't reintroduce it.

```
THIS WEEK       what you're working on, and its next unfinished step
MY CONTENT      everything you've made — the memory, visible
PROGRESS        proof you're improving                      (Post-Beta)
──────────────
[ the seven tools, exactly where they are today ]
──────────────
Account
```

**The workflow lives inside a piece of content, not in the menu.** Opening a
video shows a completion strip:

```
"Booster Box Opening"                                4 of 6 done
Idea ✓  Hook ✓  Title ✓  Tags ✓  Thumbnail ○  Schedule ○
```

The count is the mechanic that pulls a creator start-to-finish instead of
stopping after titles. Each stage opens the existing tool **prefilled** from the
object — today Tags makes you retype the topic you just typed into Titles.
**Never a forced wizard:** skip steps, work out of order, ship at 3 of 6. The
count informs, it never blocks.

**Cadence — SIGNED OFF.** The loop runs **per piece of content, not per calendar
week**: daily Shorts → daily loop; weekly long-form → weekly loop. Only the
*review* is fixed weekly, because reflection is weekly-sized at any cadence.

We do **not** push daily posting as a default. Daily is healthy for short-form
and unrealistic for long-form; nudging a creator with a job toward daily
long-form manufactures the exact burnout the mission opposes. **Hold creators to
their own stated goal, not to maximum volume.** Cadence is one question at
signup, changeable anywhere, reconciled honestly around week 4 — and **lowering a
goal must feel like winning**, because a creator who drops to twice a week and
actually hits it is far likelier to still be here in a year.

**The core object** — `users/{uid}/content/{id}`:

```js
{ type, status, platform, topic, createdAt, publishedAt, url,
  stages: { idea, hook, title, tags, thumb },   // each: chosen + suggested + score
  outcome: { views, ctr, avgViewDuration, source: 'manual'|'youtube-api' } }
```

Plus **one new profile field**, `cadence` — `{ goal, setAt, reconciledAt,
history[] }`. Asked once at signup, changeable anywhere. `history` exists so a
creator lowering their goal is recorded as a decision, never a failure.

Plus `users/{uid}/weeks/{isoWeek}` — the Weekly Review, **immutable once closed**.
`content`, `weeks` and `outcome` are never deleted; they are the moat.

**MLP order (nothing ships to a creator before all of it):**
1. ~~Content data model + Firestore rules~~ ✅ **done 2026-07-26**
2. ~~Titles writes to Content objects~~ ✅ **done** — the other six wait until
   the thin loop is validated with real creators
3. ~~My Content (Library)~~ ✅ **done**
4. ~~This Week + the Weekly Review~~ ✅ **done 2026-07-26**
4b. ~~**Memory is readable, not just writable**~~ ✅ **done 2026-07-26** —
   reopening a video repaints the stored titles, hooks, sections and both
   descriptions. Found by verification: the record was complete in Firestore
   (5 suggestions, an 816-char description) while `openContent()` restored four
   input fields and left the results pane blank, so the only way to see work you
   already owned was to spend a credit regenerating it into different text.
   **Storage was never the moat — recall is.**
5. Manual outcome entry (typed-in views/CTR — no API needed)
6. Weekly Review + shipped streak
7. Paid inference, or an honest hard cap (Groq free tier ≈ 50 active users)
8. Corrected pricing — kill "unlimited", Creator ≈ $19, gate on **memory** not
   volume; measured ~5x reasoning multiplier makes unlimited lossy
9. Delete the dead pages; retire legacy; run [TESTING.md](TESTING.md)
10. Invite **10 creators, one niche (TCG/collectibles)**, weekly 15-min calls

**Explicitly waiting:** YouTube OAuth (worth far more *after* history exists —
only then can it say "the titles you wrote here outperformed your others by X%"),
community, mobile app, shareable review image, referrals, most polish.

**Unlink, don't delete.** Only `competitor`, `collab` and `trends` come out of
the nav — three menu items leading to "Coming Soon" make a small product look
padded. **Leave the files.** Unlinking is reversible in a minute; deleting throws
away working code.

**Do NOT delete `monetization` or `resources`.** An earlier draft of STRATEGY.md
called them "static filler"; that was written from memory without opening them
and it was wrong. `monetization` is a real tool (42 interactive elements, YouTube
Partner Program thresholds, accurate maths) aimed exactly at our ideal user, and
it's *progress toward a goal* — the emotional shape the whole product is built
on. `resources` is a curated list of 27 genuinely useful free creator tools;
"here's what you need and none of it costs money" is a trust signal that fits the
brand. `platforms` is merely redundant with Channel Audit — fold it later, once
the Audit has been used in anger.

**Education is on-mission, and there are two kinds.** The manifesto commits to
creators getting *better, not more dependent*. The defensible kind is the **"why"
line**: one contextual sentence attached to every score we already show, tied to
their own input ("thin text disappears at 168px; a 4px stroke survives"). It's
cheap, it's impossible to copy without our context, and it expires in the best
way — after ten videos they don't need it. A blog/guide library is the other
kind: every competitor has one, it dates fast, it doesn't compound, and it
competes with YouTube itself. Skip it unless creators ask.

**Mobile is a different product, not a smaller one.** Desktop is the workbench
(packaging, planning, review, library). Mobile is capture / glance / ship /
read-the-review. Thumbnail analysis and tag optimisation do **not** belong on a
phone.

## The "why" layer — the education that ships

**Shipped 2026-07-26.** Every score already on screen carries one sentence
explaining the *mechanism*, keyed by the exact factor labels the scorers emit
(`WHY` map + `whyBlock()` / `whyFromBars()` in the Studio).

Rules that keep it teaching rather than nagging:
- **Only the two weakest factors**, ranked fail → warn. Teaching everything
  teaches nothing.
- **Silent when everything passes.** A perfect score gets no lecture.
- **Explains why, never restates the instruction.** "Thin text disappears at
  168px" — not "add a stroke". A unit test asserts no line begins with
  *add/use/include/make sure/try to*.
- **One or two sentences, ≤210 chars.** Also unit-tested; these lines are the
  differentiator, so they get held to a bar.
- Unknown labels render nothing rather than an empty box.

**Why this and not a blog:** it teaches at the moment of decision, it needs the
creator's own context so competitors can't copy it well, and it expires in the
best way — after ten videos they don't need it. That is the manifesto's *"better,
not more dependent"* working. **Do not build a guide/article library** unless
creators actually ask: it dates fast, doesn't compound, and competes with
YouTube itself.

**Adding a new scored factor?** Add its `WHY` line in the same commit, or the
score arrives with no explanation and the layer quietly rots.

## The Weekly Review — how it's built, and why that way

**Every number in it is computed from the creator's own record. The model only
interprets.** `summariseWeek()` derives shipped count, streak, average title
score vs their prior average, and average views vs prior — all client-side
arithmetic, unit-tested (17 cases incl. ISO year boundaries). The Worker's
`weekly-review` prompt receives those facts already computed and is told never
to invent a number.

**The AI can never block the review.** If the model call fails or 429s, the week
still closes with its real numbers and says plainly that the written part
couldn't be generated. A ritual that an API outage can cancel is not a ritual.

**The prompt is explicitly allowed to say nothing needs changing** — the exact
string *"Nothing — this week worked. Keep going."* Verified live in production.
No engagement-optimised product will ever say that, and it is the single
clearest signal that this one is worth believing when it says something IS wrong.

**Weeks are immutable.** `__weekClose()` refuses to overwrite an existing week
and the rules refuse `update`/`delete` regardless. Verified: a second close
attempt with tampered data returns false and the stored record is unchanged.

⚠️ **The Worker's CORS allowlist is production-origin only.** Generate calls
therefore **cannot be tested from `localhost`** — they fail preflight. Test
Worker-dependent flows against the deployed site, or via Node (no CORS). Do NOT
widen the allowlist for test convenience.

## The AI ladder — each rung is gated on data, not model quality

Generator *(shipped)* → **Assistant** *(MLP — knows this video's context, no
retyping)* → **Coach** *(Post-Beta — "thumbnails are your weak link, here's
why", needs ~4 weeks)* → **Creative partner** *(v2 — "this resembles your Feb
one that flopped", needs ~20 items + outcomes)* → **Business advisor** *(LTV)*.

Rungs 1–2 are copyable in a weekend. Rungs 3–5 need a history competitors can't
buy. Every stored week climbs a ladder they must start at the bottom of.
Then "My Analytics" (YouTube read-only OAuth, needs ~30 min of Google Cloud
setup from the owner; Twitch as a fast follow).

**Scoring principle (applies to every tool that shows a number):** score
deterministically in the client, never with the model's own number — the same
input must produce the same score, or users stop trusting it on the second run.
The model's written verdict still renders as prose alongside it.
`tagScore()` weights: 8–12 tags, 200–300 chars, first tag matches the topic,
long-tail mix, no duplicates, and **30 points for overlap with tags that
ranking videos actually use** (dropped, with disclosure, when live data is
unavailable). Character count is deliberately capped as a factor — do NOT copy
vidIQ's "fill 500 chars to score 100" vanity metric. TubeBuddy's own guidance is
that tags are relevance confirmers, not ranking boosters.

**TubeBuddy's one genuinely better idea is per-tag *rank*** — where your video
places for each tag. That needs a published video ID + the creator's channel,
so it belongs to Phase 4 (My Analytics), NOT this tool. What we ship instead is
honest and adjacent: how many of the ranking videos use each tag.

Later: Phase 3 monetization (**paid inference FIRST**, then Stripe — the Groq
free tier caps at roughly 50 active users and cannot carry paid plans), Phase 4
differentiation (YouTube read-only OAuth → real channel analytics).
Full design and sequencing in [STRATEGY.md](STRATEGY.md).

**Scoring is not one thing — be careful which kind a tool needs.** Tags can be
scored *deterministically* because there is ground truth in the browser (the tag
pool from ranking videos). Thumbnails cannot — there's no CTR to measure — so
that tool splits the two honestly: **measured** facts (dimensions, 16:9,
true-to-size previews at 168/246/360px) versus **AI judgement** (the five bars),
each labelled as such. Never present a model's opinion as a measurement.

## Vision path (thumbnail-analyze) — fragile, know how it behaves

- **Gemini `gemini-flash-latest` carries vision.** It intermittently returns
  **503 "experiencing high demand"** on the free tier. `callWithRetry()` retries
  transient statuses (429/5xx) once; that took observed success from 3/4 to 4/4.
- **The Groq fallback is effectively dead.** `meta-llama/llama-4-scout-17b-16e-instruct`
  returns **404 model_not_found** (Groq retired it). `GROQ_VISION_MODELS` is now
  an ordered candidate list so one retirement can't take the tool down — **paste
  the current id from console.groq.com/docs/models at the front of that list**.
- A single hard-coded fallback previously **masked the real error**: the client
  saw a Groq 404 while the actual cause was a Gemini 503. When every provider
  fails the Worker now returns a friendly `message` plus a technical `detail`
  naming each provider and status.
- Vision calls take **20–30s**. That's normal; don't "fix" it with a timeout.
- Failures cost the user nothing — `incrementUsage()` runs only after success.

## Accessibility baseline (shipped 2026-07-26 — keep it)

Verified in the deployed Studio: **58 of 58 form controls carry a programmatic
name, and all 10 pill rows are labelled groups.** Before this, 55 of 58 were
orphaned — the markup was `<label>Content type</label><select id="t-type">`,
which *looks* labelled and gives a screen reader nothing. All 24 `<select>`s
announced as a bare "combobox". There were **zero** `label[for]` in the file.

- Every `<label>` now carries `for="<control id>"`.
- The pill rows aren't form controls, so they get `role="group"` +
  `aria-labelledby` pointing at their label's `id` — they now announce as
  `group "Platform"` with the buttons inside.
- A global `:focus-visible { outline: 2px solid var(--violet) }` already existed
  and is the reason keyboard focus is visible; don't remove it.
- Every interactive element in the app is a native control **except** the account
  block (see Open findings).

**Adding a field?** Give the control an `id` and the label a matching `for` in
the same commit. Verify by asserting zero unnamed controls in the browser, not
by eye — this class of bug is invisible on screen, which is exactly how 55 of
them accumulated.

**Colour tokens for text (added 2026-07-27).** `--faint` (#5e5b76) measures
**2.95:1** and is for genuinely decorative marks only — placeholders and the
"soon" tag. Functional text a creator has to *read* uses **`--label`**
(#9a97b0, measured **6.78:1**): goal targets, empty-state instructions, counts,
stage strips, channel-status labels, and every honesty disclosure such as the
"this is AI judgement" note. It was introduced as a sibling token rather than by
lightening `--faint`, because a blanket swap flattens the hierarchy on every
page. 19 rules were promoted; zero AA failures remain in the rail, context bar
and This Week.

**Every interactive element is a native control.** The account block was the
last `div[onclick]`; it's now `<button class="acct-main">` with **sign-out as a
sibling, not a child** — a button inside a button is invalid and the inner one
gets dropped. `.nm`/`.pl` are spans now and need explicit `display:block`.
Empty context chips are `<button class="chip empty">` that open the profile —
that's the non-punitive route for anyone whose profile predates the platform
requirement or who used Skip.

## Known debt / loose ends

- Orphan KV key `trial:XjGieou5cHMbFJivmPcAOYeZJ2t1` from audit testing — inert,
  delete via the Cloudflare dashboard (the CLI crashes here).
- **Orphaned Firestore docs from the 2026-07-26 verification pass:**
  `users/T77Zkcs6pCd4mFrcxxl1qWsGk0z2` plus 2 `content` docs and week `2026-W30`.
  The auth account was deleted before the documents, so no client can reach them
  — remove via the Firebase console. (The account itself is confirmed deleted.)
- `og-image.svg` is never rasterized to PNG — most social scrapers won't render it.
- Landing still carries some fluff stats ("100% Creator Focused", "$0 To Get
  Started") that say nothing; slated for removal.
- Titles tool still lacks the "adapt this for other platforms" section.
- No generation history, and no BYO-API-key escape hatch for power users.

### Open findings from the 2026-07-26 verification pass (not yet fixed)

Each was observed in the deployed product, and each is a deliberate *not yet*
rather than an oversight:

All but one were **fixed on 2026-07-27** — see the Trust & Flow section below.
The survivor:

- **Only Titles writes a content object.** The other six tools are deliberately
  waiting until the thin loop is validated with real creators.

## Trust & Flow release (2026-07-27) — what it closed

Six of the seven open findings above, plus one honesty problem on the public
page that mattered more than any of them:

| Was | Now |
|---|---|
| No URL state; Back exited the app | `?tab=<id>` routing, Back/Forward, deep links, `&c=<id>` for one video |
| Landing sold "all-in-one AI platform" and 3 tools that don't exist | Leads with the loop; unbuilt tools stated plainly, not carded |
| Publish used a native `prompt()` | Accessible dialog, focus managed, `safeUrl()` validation |
| Published URL stored, never shown | Outbound link on the card (`rel="noopener noreferrer"`) |
| Onboarding saved with zero platforms | Required, with an inline `role="alert"` and focus moved to the row |
| Functional text at 2.95:1 | `--label` token at 6.78:1, applied per-use |
| Mobile hid 296px of channel context | Context bar wraps under 560px; all chips visible |
| Account reachable only by mouse | Native `<button>`; zero mouse-only controls app-wide |

**Also fixed in passing:** the landing page could be dragged 115px sideways at
375px. `body{overflow-x:hidden}` didn't contain it because the scroller is the
**viewport (html)**, not body — the closed off-canvas menu extended the page.
`html{overflow-x:hidden}` fixes it. Pre-existing, unrelated to this work, and a
good reminder that a body-level clip proves nothing.

## Owner's product principles (stated repeatedly — honour these)

- **Polish over speed.** "I'm not worried about the fastest path to beta, I'm
  worried about a functioning polished product." Solo-funded; aiming for a
  flagship worth real investment. Don't rush to ship half-built things.
- **Great at 1–2 things**: YouTube titles + tags must beat vidIQ/TubeBuddy;
  everything else must be good and coherent, not padding.
- **Gaming-first but genuinely all-creator** (TCG/Pokémon, vlogs, fitness,
  podcasts, IRL). Never let the copy or options drift back to gaming-only.
- **Honesty is the differentiator** — see the standard at the top of this file.
