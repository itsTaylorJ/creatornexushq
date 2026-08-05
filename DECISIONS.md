# CreatorNexusHQ — Decision Log

**Status:** authoritative for decisions explicitly approved by the owner.  
**Last updated:** 2026-08-05

When this file conflicts with an older strategy, testing, or handoff note, this file wins.

## Product model

- CreatorNexusHQ remains the product name for now.
- One product, two contexts: a public marketing site and a signed-in creator workspace. “Studio” is a legacy implementation name, not the primary product framing.
- Do not remove features merely because they are not central to the first rollout. Consolidate or hide duplicate/legacy routes only after replacement parity is verified.
- The workspace should feel like a coherent place to make, organize, publish, and learn from content — not a collection of unrelated generators.

## Workspace navigation

Approved C+ direction:

1. Home
2. My Content
3. Create
4. Calendar
5. Insights
6. Resources
7. Account

The shell may expose focused tools inside Create and Insights. Navigation should not force a long nested menu or hide needed functionality behind confusing labels.

## Standard video workflow

For normal uploaded content — long-form videos, clips, Shorts, Reels, and similar:

1. Titles, Hooks & Descriptions
2. Tags
3. Thumbnail
4. Schedule
5. Publish
6. Review

The first tool creates or evaluates visible, platform-facing copy together: title, hashtags, hook, and description. YouTube/Rumble metadata tags are a distinct next step. Hashtags belong with title/description; metadata tags do not.

## Titles, Hooks & Descriptions

This is the approved customer-facing name. Do not rename it “Packaging,” “Metadata,” or “Video Details.”

It contains two clearly separated modes:

### Generate my details

- Ask approachable, example-led questions about the content, niche, content type, audience, goal/angle, selected platforms, and optional keyword/context.
- Every field must explain what good input looks like; most fields should be optional unless truly necessary.
- Use “Select all that apply” for platform selection.
- Generate title, platform-ready hashtags, hook, and description as a connected set.
- Do not show an SEO or quality score for newly generated material.

### Analyze my details

- Let creators paste any combination of their own title with hashtags, hook, and description. Partial input is valid; do not force them to invent missing fields.
- Ask for the needed context: niche, content type, and target platforms.
- Analyze each supplied element against that context and selected platforms; give a consistent score, explanation, and improvement suggestions.
- Use deterministic calculations for measurable components and clearly label judgment-based feedback. The same input in the same context must not receive contradictory scores.
- If CreatorNexus generated a detail and it is later analyzed using the same context, results must be internally consistent and explainable.
- Offer platform adaptations only when they are actually needed; do not make creators produce seven separate versions by default.

## Live Titles

- Live Titles remains a separate tool. It is not a mode or content type inside standard Titles, Hooks & Descriptions.
- It should use livestream-specific prompts and platform-aware title logic, such as the live activity, current moment/stakes, audience, and tone.

## Tool and feature retention

- Keep existing tools and core capabilities: Ideas, Hooks & CTAs; Tags; Thumbnails; Posting Schedule; Live Titles; Channel Audit; Monetization; Resources; platform support; saved content; and review/analytics functions.
- Competitor Research, Trend Tracker, and Collab Finder stay in the product plan but must not be promoted as complete until they provide real value.
  - Competitor Research: analyze comparable channels in the creator’s niche and translate observable strengths into usable lessons.
  - Trend Tracker: research what is currently trending in the creator’s niche and suggest ideas.
  - Collab Finder: explore meaningful creator discovery and connection, especially for smaller creators; design later.

## Content record and lifecycle

Creator-controlled states are approved:

`Draft → Scheduled → Published → Ready for Review → Reviewed`

- Archived is a separate state/location for content removed from the active workflow.
- The app must never infer that content was published or scheduled unless a reliable integration verifies it. Manual status changes are the default.
- Standalone tool work can be copied without saving. Make that explicit before leaving or discarding unsaved work so users are not surprised they cannot find it later.
- Delete behavior: archive by default; permit permanent deletion behind a clear, strong confirmation explaining the loss of saved content, decisions, and outcomes.

## UX and education

- Build for new, experienced, and improving creators.
- Use concise help, examples, and real-world guidance wherever a user could reasonably ask “What is this?” or “What should I say?”
- More complex tools may use richer examples or visual guidance, but avoid long, intimidating input lists.
- Preferred tone is not a persistent creator profile field. Tone may change per piece of content.

## Pricing and beta posture

- Private beta access is personally granted by the owner.
- The beta should feel close to a finished product; do not remove useful capability merely because testers are few.
- No live payment processing until launch readiness, but keep a clean entitlement/billing framework so payments can be introduced later.
- Current intended usage direction for future tiers: daily per-tool allowances and one free regeneration. The middle tier target is five generations per tool per day. Final entitlement design, pricing, and model-cost benchmarks remain pending.

## Brand direction

Approved visual direction: **Deep Ember + Creator Blue**.

- Background: `#0F0D16`
- Surface: `#1A1726`
- Violet: `#7C4DFF`
- Creator Blue: `#3B82F6`
- Data Blue: `#5B8DEF`
- Primary text: `#F7F4EE`
- Body text: `#D9D4DF`
- Secondary text: `#AAA4B3`
- Subtle text: `#858090`

The desired emotional balance is exciting, friendly, inviting, professional, and distinct from direct competitors. Progress should be visible and motivating without becoming manipulative or guilt-driven.

## Still pending — do not guess

- Final beta entitlement model and user-facing usage copy.
- Pinned AI model choices after task-based benchmark tests.
- Structured response schema and exact scoring rules.
- Legacy-page redirect/archive sequence.
- Dependency/tool-folder cleanup approach.
- Privacy/terms rewrite scope.
- Rollout sequence and tester cohort stages.
