# CreatorNexusHQ — Redesign Implementation Plan

> **For Claude Code:** treat this as a staged, reviewable plan. Do not make product decisions that are marked pending. Stop and ask the owner when code or data behavior is unclear.

**Goal:** turn the current collection of static pages and legacy Studio into one coherent CreatorNexusHQ workspace while preserving working features and creator records.

**Architecture:** keep the existing Firebase/Cloudflare foundation initially. Build the unified shell and content model in small, verified steps. Migrate functionality one surface at a time; redirect/retire a legacy route only after the replacement reaches functional parity.

**Tech stack:** static HTML, vanilla CSS/JavaScript, Firebase Auth/Firestore, Cloudflare Worker, Cloudflare KV, Firebase Hosting.

## Global constraints

- Read `DECISIONS.md`, `UX-ARCHITECTURE.md`, `AI-ROUTING.md`, `PRODUCT.md`, and the relevant current source file before changing code.
- Preserve every feature unless the owner explicitly approves removal.
- Do not deploy, push, alter secrets, or run destructive cleanup without owner approval.
- Preserve existing user data and provide migration/backward compatibility for existing content records.
- Ask the owner before resolving any item listed as pending in `DECISIONS.md`.
- Do not advertise unbuilt tools or real payments.
- Use the Deep Ember + Creator Blue system consistently.

## Stage 0 — Safe baseline

1. Inspect the current git status and preserve the owner’s uncommitted landing-page change.
2. Read the current Firestore rules, Studio data helpers, Worker routes, and Firebase configuration before proposing schema changes.
3. Create a local backup/export plan for test data only; do not delete content or accounts.
4. Add a concise current-status section to `CLAUDE.md` that points to the authoritative decision docs.
5. Verify current local behavior before redesigning: auth, saved content recall, titles, tags, thumbnails, live titles, scheduling, channel audit, publishing, and review.

## Stage 1 — AI hardening before expanded testing

1. Remove retired Groq vision fallback models from the production fallback chain.
2. Pin candidate model versions; do not use moving `latest` aliases in production routing.
3. Build the golden test set and benchmark primary/fallback models per `AI-ROUTING.md`.
4. Define validated structured response schemas for the redesigned Titles, Hooks & Descriptions modes.
5. Keep deterministic scores and AI explanations separate.
6. Test provider failure, malformed output, and quota behavior. Failed requests must not reduce allowance.
7. Record selected models and results in `AI-ROUTING.md` for owner review before deployment.

## Stage 2 — Unified design foundation

1. Extract or centralize shared design tokens from the existing pages without changing user-visible behavior first.
2. Apply the approved color and text hierarchy to a single reusable workspace shell.
3. Implement accessible keyboard focus, labeled controls, visible errors, styled dialogs, and responsive layouts as a baseline.
4. Introduce the top-level architecture: Home, My Content, Create, Calendar, Insights, Resources, Account.
5. Keep direct links to existing working tools during migration.

## Stage 3 — Content model and lifecycle

1. Extend content records compatibly to support `draft`, `scheduled`, `published`, `ready_for_review`, `reviewed`, and archived state/location.
2. Preserve current stored title-stage results and render them on reopen.
3. Add manual status actions; do not auto-infer publishing.
4. Implement Archive as the normal removal action.
5. Implement permanent delete only with a custom accessible confirmation that names the data being permanently lost.
6. Add an unsaved-work warning and an explicit “Save to My Content” path for standalone tool use.

## Stage 4 — Titles, Hooks & Descriptions

1. Replace the current conflated Titles experience with the approved tool name and two modes.
2. In Generate mode, use compact context questions with clear examples and multi-select platforms.
3. Generate title with hashtags, hook, and description together; no generator score.
4. In Analyze mode, accept partial creator-provided details; evaluate supplied fields without requiring missing fields.
5. Show stable component-level results, reasons, and improvements for the specific niche/content type/platform context.
6. Allow edit, copy, and save of each result into the current content record.
7. Carry finalized details into Tags using a clear next action.

## Stage 5 — Remaining workflow tools

1. Keep Tags separate from hashtags. Support YouTube and Rumble metadata guidance honestly, including platform/API limitations.
2. Attach Tags, Thumbnail, and Schedule outputs to the active content record where appropriate.
3. Keep Live Titles separate and give it livestream-specific inputs and output logic.
4. Maintain Ideas, Hooks & CTAs, Channel Audit, Resources, Monetization, and platform support; improve their in-context guidance before moving them.
5. Build Home, Calendar, and Insights around saved content and honest available data.

## Stage 6 — Legacy route migration and quality gate

1. Verify a replacement route has feature and data parity with its legacy page.
2. Add a targeted redirect only after parity is verified.
3. Move retired legacy pages out of the deployment path only after owner review; keep an archive/rollback path.
4. Update privacy/terms for the actual beta data and AI behavior before expanding testers.
5. Run the tester guide on desktop and mobile, including keyboard and screen-reader checks.
6. Invite testers in stages: owner → one friend → remaining invited testers. Capture feedback before broadening.

## Explicitly deferred decisions

Do not implement final pricing, paid checkout, final entitlement allowances, final AI model selection, or permanent legacy-file deletion until the owner makes the remaining choices in `DECISIONS.md`.
