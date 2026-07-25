# CreatorNexusHQ — Roadmap

**Status as of 2026-07-24.** Read [CLAUDE.md](CLAUDE.md) first — it is the
authoritative context (stack, data model, limits, gotchas). This file is the
**tool-by-tool status board** and the **Pro-grant runbook**.
[AUDIT.md](AUDIT.md) is a dated snapshot (2026-07-20) of the full product +
engineering audit; its findings are partly addressed since — trust CLAUDE.md
over AUDIT.md wherever they disagree.

Phase numbering lives in CLAUDE.md (Phase 1 beta blockers ✅ → **Phase 2 Studio
consolidation, current** → Phase 3 monetization → Phase 4 differentiation).
This file deliberately does not define a competing set of phases.

## Where things stand

Live at https://creatornexushq-eaf70.web.app (Firebase Hosting, 16 static
pages). Backend: one Cloudflare Worker at `worker/`, live at
`creatornexushq-api.tjlangston15.workers.dev`, generating real output on free
tiers (Groq primary, Gemini fallback; Gemini vision for thumbnails).

**`creatornexushq-studio.html` is the app home.** Every landing entry point and
every auth redirect goes there. The legacy tool pages are still live and still
work — they are being retired one tool at a time, never big-bang, and each one
carries a "Back to Studio" link so nothing dead-ends.

## Tool status

| Tool | Where it lives now | Status |
|---|---|---|
| Titles & Descriptions | **Studio** ✅ migrated | Real — platform-adaptive, live YouTube ranking data, dual descriptions, 0–100 SEO score |
| Tags & Hashtags | **Studio** ✅ migrated | Real — rate-or-generate, deterministic tag score, per-tag ranking counts, cross-post pack |
| Thumbnails | **Studio** ✅ migrated | Real — vision scoring + measured size checks + true-to-size previews + AI prompt generator |
| Ideas, Hooks & CTAs | **Studio** ✅ migrated | Real — ideas each carry a ready-to-say hook; CTAs split verbal vs on-screen with placement advice |
| Posting Schedule | `analyze.html` (schedule + calendar) | Real — merge the two into one Studio tool |
| Live Titles | `streaming.html` | Real — add TikTok Live + Rumble on migration |
| Channel Audit | `analyze.html` (analytics advice, patterns) | Real advice; **manual metric entry not built yet** |
| Monetization tracker | `monetization.html` | Real — client-side math, accurate thresholds |
| Resources / Platforms | `resources.html`, `platforms.html` | Real — manual stat entry is honest; OAuth connect shows an honest "coming soon" |
| Competitor Research | `competitor.html` | **Coming Soon** gate — was inventing real channel names |
| Collab Finder | `collab.html` | **Coming Soon** gate — was inventing real people |
| Trend Tracker | `trends.html` | **Coming Soon** gate — LLMs have no real-time data |

## Migration queue (one at a time, check in after each)

1. ~~Tags & Hashtags~~ ✅ done
2. ~~Thumbnails~~ ✅ done
3. ~~Ideas, Hooks & CTAs~~ ✅ done
4. **Posting Schedule** ← next — schedule + calendar builder merged
5. Live Titles — + TikTok Live, Rumble
6. Channel Audit — + manual metric entry, benchmark → diagnose → route to the
   fixing tool

The legacy `analyze.html` tag tool stays live and untouched until the Studio
version is confirmed working against the deployed Worker.

Then **My Analytics**: YouTube read-only OAuth (needs ~30 min of Google Cloud
setup from the owner), Twitch as a fast follow. Every other platform stays
self-serve manual entry — never imply we have live TikTok/IG data.

## Limits actually enforced (server-side)

Free **5/day** · Trial **50/day** for 7 days, auto-started at first generation ·
Pro unmetered · site-wide cap **800/day**. Credits increment only after a
successful generation. These numbers must match what the UI claims — see the
honesty standard in CLAUDE.md.

## Granting Pro (comps / free trials — no billing exists)

**Automatic trial:** every account gets a 7-day Pro trial starting at its
*first generation* (not signup). KV key `trial:<uid>`, no TTL, so a lapsed
trial can't restart. Metered at 50/day.

**Manual comps:** the Worker checks KV for `pro:<email>` (lowercased sign-in
email). Value = last active day, `YYYY-MM-DD` UTC. Manual grants beat trial
state. Grants expire on their own — no cleanup needed.

Grant a week:
```bash
wrangler kv key put --namespace-id=1df69e401a134d08829ef71f645d5f88 "pro:friend@example.com" "2026-07-31" --remote
```
Revoke early:
```bash
wrangler kv key delete --namespace-id=1df69e401a134d08829ef71f645d5f88 "pro:friend@example.com" --remote
```
List grants:
```bash
wrangler kv key list --namespace-id=1df69e401a134d08829ef71f645d5f88 --remote
```
⚠️ The Wrangler **KV CLI crashes on the Windows box** (libuv assertion). Use the
Cloudflare dashboard there, or run these from the other machine.

## Before inviting the first users

- Manual end-to-end pass (signup → survey → generate → copy) on desktop and mobile
- 3–10 real creators, real accounts, feedback via the sidebar link
- No ads, no payments — billing is deliberately last, after beta proves value

## Deliberately deferred past beta

- Stripe / real billing (**paid inference must come first** — the Groq free tier
  caps at roughly 50 active users)
- Real OAuth platform connections beyond YouTube/Twitch read-only
- Grounding Competitor / Collab / Trends in a real data source
- De-duplicating the tripled legacy CSS — the Studio migration retires those
  pages anyway
- Generation history; BYO API key for power users
