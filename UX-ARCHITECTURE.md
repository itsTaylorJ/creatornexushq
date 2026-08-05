# CreatorNexusHQ — UX Architecture

**Status:** approved direction through 2026-08-05. Read with [DECISIONS.md](DECISIONS.md).

## The experience

CreatorNexusHQ has a public marketing site and one signed-in creator workspace. Marketing may be spacious and emotional; the workspace may be denser and practical. Both must share the same brand tokens, typography, terminology, accessibility standard, and visual confidence.

The workspace is not an optional “Studio.” It is where creators plan, create, organize, publish, and learn.

## Primary navigation

| Area | Job | Typical contents |
|---|---|---|
| Home | Immediate orientation and next best action | Current work, progress, upcoming schedule, review cue |
| My Content | The creator’s library and record | Drafts, scheduled, published, reviewed, archived content |
| Create | Make or improve a piece of content | Ideas, Titles/Hooks/Descriptions, Tags, Thumbnail, Live Titles |
| Calendar | Plan and schedule work | Posting Schedule, planned dates, scheduled content |
| Insights | Learn from content and channel history | Review, Channel Audit, performance/analytics as available |
| Resources | Helpful non-creation support | Resources and Monetization |
| Account | Profile, channel context, preferences, access | Account details and beta/entitlement information |

Avoid multi-level navigation unless a lower-level destination cannot be understood from the page itself. The user should be able to reach the important tools directly from the relevant area.

## Standard content journey

Use a shared content record, but do not require a record before a creator can try a tool.

```text
Start standalone or from a content record
       ↓
Titles, Hooks & Descriptions
       ↓
Tags
       ↓
Thumbnail
       ↓
Schedule
       ↓
Publish
       ↓
Review
```

At every stage, show the next useful action without forcing a wizard. If a creator uses a tool standalone, allow copy/use immediately and offer “Save to My Content.” Clearly warn before an unsaved result is discarded.

## Titles, Hooks & Descriptions screen

### Layout

1. Page title and a short, plain-language explanation.
2. Two unmistakable tabs or segmented controls: **Generate my details** and **Analyze my details**.
3. Context card: niche, content type, selected platforms, audience/angle, optional keyword. Keep it compact and example-led.
4. Input card for the active mode.
5. Results: title with hashtags, hook, description. Each element is editable, copyable, and saveable.
6. A clear next action: “Continue to Tags.”

### Generate my details

- Ask only questions that improve output.
- Give short examples directly beneath inputs, such as “Gaming, podcasting, TCG openings, fitness tutorials” for niche.
- Use “Select all that apply” for platforms.
- Generate all four parts together. The creator chooses and edits; do not make the generator grade its own suggestions.
- Use platform adaptations sparingly. Start with an adaptable core; surface an adaptation only when a selected platform needs one.

### Analyze my details

- Let creators provide all or only some of title/hashtags, hook, and description.
- Never turn missing fields into an error. Analyze what exists, explain what is missing for a stronger upload, and offer optional help to fill gaps.
- Score at the component level where a score is useful; pair each with a plain explanation and a specific improvement.
- Keep calculations repeatable. AI can explain and suggest, but it must not make the same material appear excellent in one context and poor in another without a visible reason.

## Live Titles

Live Titles is separate because live content has different intent, urgency, discovery behavior, and prompts. Its primary inputs should capture the stream activity, moment/stakes, audience, and chosen platform(s). Do not put it under normal upload title generation.

## Content lifecycle

```text
Draft → Scheduled → Published → Ready for Review → Reviewed
                                  ↘
                                Archived
```

- Status changes are creator-controlled until a future integration can verify an event.
- Archiving is the default removal action. Permanent delete remains available through a clear confirmation.
- “Ready for Review” can be prompted after a sensible waiting period, but never imply that analytics are connected when they are not.

## Visual system

Use the approved Deep Ember + Creator Blue tokens in [DECISIONS.md](DECISIONS.md). The visual language should be dark, calm, and premium, with blue reserved for action/data emphasis and violet used deliberately for brand expression. Maintain strong text hierarchy: warm off-white primary text, readable body text, restrained secondary labels.

Progress should reward real creator movement: saved work, content stages, their stated goals, and honest channel milestones. Do not add leaderboards, artificial streak pressure, or daily engagement mechanics.
