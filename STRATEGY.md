# CreatorNexusHQ — Product Design & Strategy

**Date:** 2026-07-26 · **Supersedes:** the audit-only version of this file
> ## Direction update — 2026-08-05
>
> This document contains valuable product principles and historical reasoning,
> but its earlier navigation and tool-flow proposals are no longer authoritative.
> Use [DECISIONS.md](DECISIONS.md) and [UX-ARCHITECTURE.md](UX-ARCHITECTURE.md)
> for the approved information architecture, standard workflow, Titles/Hooks/
> Descriptions behavior, Live Titles separation, lifecycle, and brand system.

**Status:** design document. Read before planning work. [CLAUDE.md](CLAUDE.md)
remains authoritative on *what is currently true*; this file is *where we're going*.

Every recommendation is labelled:

| Label | Meaning |
|---|---|
| **MLP** | Minimum Lovable Product. Must exist before one outside creator touches it. |
| **Post-Beta** | After ~10 creators have used the MLP for a month and we've learned. |
| **v2** | The year-one product. Real scale, real money. |
| **LTV** | Long-Term Vision. Directionally committed, deliberately not now. |

---

# Part I — What the audit found

Compressed; the detail is in git history. Three findings drive the redesign.

**1. Nothing persists.** One localStorage key (`cnx_profile`). No title, tag set,
thumbnail score, calendar or audit is ever saved. A product with no memory cannot
compound, cannot show progress, and has no mechanical reason to be opened twice.

**2. The seven tools are already a workflow — nobody wired them together.**
Ideas → Titles → Tags → Thumbnails → Schedule → Publish → Audit *is* the process
of making a video. They were built as seven destinations. They should have been
seven stages.

**3. Pricing is arithmetically unsound and the infrastructure cannot serve a
paying customer.** ~5x measured reasoning multiplier makes "unlimited" at $12
lossy; the Groq free tier caps around 50 active users.

**The correction to my own earlier advice:** I argued for choosing between "great
at one thing" and "creator OS". That was a false binary. The OS emerges from one
connected workflow done exceptionally well. The tools stay. They stop being
destinations.

---

# Part II — The creator's loop

**SIGNED OFF 2026-07-26, with one correction.** An earlier draft assumed a weekly
long-form cadence and prescribed "quiet Tuesday to Thursday". That baked one
rhythm into the product. **The loop runs per piece of content, not per calendar
week** — a creator posting daily Shorts runs it daily; a creator posting one video
a week runs it weekly. Only the *review* is fixed weekly, because reflection is a
weekly-sized activity at any cadence.

### On cadence — a deliberate position

**We do not push daily posting as a default.** For short-form it's normal and
healthy; volume plus iteration is genuinely how Shorts and TikTok work. For
long-form it's unrealistic for anyone with a job, and nudging them toward it
manufactures exactly the burnout the mission names as the enemy.

**We hold creators to their own stated goal, not to maximum volume.** Cadence is
captured at signup as one question, changeable anywhere, and **reconciled
honestly at ~week 4** against what they actually shipped:

> *You aimed for every day and you've been shipping about twice a week. Twice a
> week is a real cadence — want to make that the goal, or keep pushing for daily?*

**Lowering a goal must feel like winning.** A creator who drops from daily to
twice a week and then hits it for two months is far more likely to still be here
in a year than one who keeps missing daily. Every competitor treats a reduced
goal as failure; treating it as good judgement is both truer and completely
differentiating.

The walkthrough below uses a weekly long-form creator because that's our ideal
first customer. Read the day names as *stages*, not calendar days.

### Monday — "I need an idea"

*Thinking:* "I should post this week. I don't know what about. Last week's thing
did okay but I don't know why."

*Needs:* not fifty ideas. **Three ideas that fit them specifically**, with a
reason attached, ranked by what has actually worked on their own channel.

*AI's job:* not generation — **selection and reasoning**. "You've published four
box openings; the two that named a specific card did 3x the two that didn't.
Here are three that name a card."

*Saved:* the chosen idea becomes a **Content** object in `idea` status. The
rejected ones are saved too — what a creator declines is a signal about taste.

*Remembered forever:* every idea ever accepted or rejected.
*Gets smarter:* after ~10 published items, idea suggestions are ranked by that
creator's own outcome history rather than by generic niche patterns.

**MLP:** ideas save as Content objects; three suggestions not eight.
**Post-Beta:** rank by the creator's own history.
**v2:** rejected-idea learning.

### While making it — "I'm filming and editing"

*Thinking:* "I don't want a browser tab open. I want the hook I wrote down so I
don't forget it."

*Needs:* almost nothing **during the act of making**. Note the scope: quiet while
their hands are busy, not quiet for three fixed days. A daily Shorts creator
passes through this stage in an hour and is back in the loop the same afternoon.

*AI's job:* stay out of the way. Have the hook and working title one tap away on
a phone.

**MLP:** the Content object is viewable on mobile with its idea, hook and notes.

### Thursday — "It's made. Now the packaging."

*Thinking:* "What do I call it? What thumbnail? Am I about to waste a good video
on a bad title?"

*Needs:* this is where the existing tools are genuinely excellent and should be
used — but **in sequence, attached to the video**, not as seven separate visits.

*Flow:* open the Content object → Title (with live ranking data) → Tags (scored
against what ranks) → Thumbnail (measured + judged) → everything saved onto the
same object.

*AI's job:* generation *and* a go/no-go judgement — "your title scores 78, your
thumbnail 54. The thumbnail is the weak link, and on this channel thumbnails have
mattered more than titles."

*Remembered forever:* every title considered, the one chosen, the scores.
*Gets smarter:* "you consistently pick the second title. Your second picks
outperform your first by 12%" — a real, personal, uncopyable insight.

**MLP:** tools write to the Content object; stages shown in order with completion
state.
**Post-Beta:** chosen-vs-suggested tracking.
**v2:** the packaging go/no-go verdict.

### Friday — "I published"

*Thinking:* "Done. That's the dopamine."

*Needs:* **acknowledgement.** One good moment. The streak increments. Something
in the product notices.

*Saved:* status → `published`, timestamp, URL.

*This is the most under-served moment in every creator tool that exists.* They
all help you publish and then say nothing.

**MLP:** mark as published, streak increments, one honest celebration.

### Sunday — "What worked? What next?"

*Thinking:* "Was that any good? Am I improving or just busy?"

*Needs:* **the Weekly Review.** What you shipped, how it did, one thing that
worked, one thing to change, and the answer to *"am I getting better?"*

*AI's job:* coaching. Honest, specific, and willing to say "nothing to change
this week, you're on track" — which no engagement-optimised product will ever say.

*Saved:* the week is **closed and immutable**. It becomes a permanent record.

*Gets smarter:* week 1 is generic. Week 12 compares you to yourself. Week 52 knows
your seasonality.

**MLP:** manual outcome entry (views/CTR typed in) + a Weekly Review page.
**Post-Beta:** shareable review image.
**v2:** YouTube OAuth fills outcomes automatically.
**LTV:** the review predicts — "based on your last 9 weeks, skip next Tuesday;
you always underperform after a travel week."

---

# Part III — Information architecture and navigation

**SIGNED OFF 2026-07-26.** An earlier draft hid the seven tools behind a
"quick tools" flyout. **Rejected by the owner, correctly** — it adds a click and
hides the thing people came for. Nothing gets buried. Two destinations get added
*above* the tools, and the connective tissue lives inside each piece of content.

### The navigation

```
┌─────────────────────────────────────────────────┐
│  THIS WEEK              what you're working on  │
│  MY CONTENT             everything you've made  │
│  PROGRESS               proof you're improving  │   (Post-Beta)
│  ───────────────────────────────────────────    │
│  Titles & Descriptions                          │
│  Tags & Hashtags                                │
│  Thumbnails                     all seven stay  │
│  Ideas, Hooks & CTAs            exactly where   │
│  Posting Schedule               they are now    │
│  Live Titles                                    │
│  Channel Audit                                  │
│  ───────────────────────────────────────────    │
│  Account                                        │
└─────────────────────────────────────────────────┘
```

**THIS WEEK** — the home that doesn't exist today. What's in flight and what its
next unfinished step is; what's ready to ship; the review when it's due.

**MY CONTENT** — every Content object, filterable, reusable. The memory made
visible, and the screen that makes leaving expensive.

**PROGRESS** — scores over time, streak, weeks shipped. The emotional payoff.

**The seven tools stay exactly where they are.** A creator who just wants a title
right now clicks Titles, same as today. Nothing is hidden behind a menu. Using a
tool standalone offers *"attach this to a video?"* — an invitation, never a gate.

**MLP:** This Week + My Content + the tools unchanged.
**Post-Beta:** Progress.

### Content object detail — where the workflow actually lives

This is the piece that makes it a workflow rather than a menu. Opening a video:

```
"Booster Box Opening"                                   4 of 6 done
Idea ✓   Hook ✓   Title ✓   Tags ✓   Thumbnail ○   Schedule ○
```

**The completion count is the mechanic.** It shows what's unfinished and pulls the
creator through the whole process instead of stopping after titles — which is
what "optimise the video from start to finish" actually requires. The workflow
does the encouraging; the navigation doesn't have to.

Each stage opens the existing tool, **prefilled** from everything already on the
object. **The tools don't change — their context does.** Today the Tags tool makes
you retype the topic you typed into Titles ten minutes ago. Here it already knows.

Deliberately **not** a forced wizard. Skip steps, do them out of order, ship at
3 of 6. The count informs; it never blocks.

### Content object detail — the real workspace

Opening a Content object shows a stage strip:

```
IDEA ✓ ──  HOOK ✓ ──  TITLE ✓ ──  TAGS ○ ──  THUMB ○ ──  SCHEDULE ○ ──  PUBLISHED
                                     ▲ you are here
```

Each stage opens the existing tool, prefilled from everything already on the
object. **The tools don't change. Their context does.** Today the Tags tool asks
you to retype the topic you typed into the Titles tool ten minutes ago; here it
already knows.

**MLP:** the stage strip with prefill from the object.

---

# Part IV — The memory model

The core architectural recommendation. Shown as schema because that is the
clearest way to communicate it.

**RATIFIED 2026-07-26** — the journey and IA it derives from are signed off, so
this is now a decision rather than a sketch.

```js
users/{uid}
  // profile — exists today; ONE field added
  { email, first, last, username, niche, platforms[], size, ...,

    cadence: {                     // NEW — asked once at signup
      goal: 'weekly',              // monthly | weekly | few-weekly | most-days | daily
      setAt,
      reconciledAt,                // week-4 honest check against reality
      history: [{ goal, from, to }]  // lowering a goal is a success, not a failure
    }
  }

  content/{contentId}              // THE core object — new
  {
    type:      'video' | 'short' | 'stream' | 'post',
    status:    'idea' | 'making' | 'packaging' | 'ready' | 'published' | 'reviewed',
    platform:  'YouTube',
    topic:     'sealed booster box, charizard hunt',
    createdAt, updatedAt, publishedAt, url,

    stages: {
      idea:  { chosen: '...', rejected: ['...'], why: '...', at },
      hook:  { text: '...', at },
      title: { chosen: '...', suggested: ['...'], score: 78, at },
      tags:  { chosen: [...], score: 84, rankingOverlap: 0.62, at },
      thumb: { score: 61, measured: { w,h,ratio }, verdict: '...', at }
    },

    outcome: {                     // manual first, API later
      views, ctr, avgViewDuration, newFollowers,
      source: 'manual' | 'youtube-api',
      enteredAt
    }
  }

  weeks/{2026-W31}                 // immutable once closed
  {
    shipped: [contentId], streakWeeks: 9,
    review: { worked, change, focus, generatedAt },
    closedAt
  }

  signals/{signalId}               // derived learning — v2
  { pattern: 'title-leads-with-number', n: 7, lift: 2.1, confidence: 'low' }
```

**Never deleted:** `content`, `weeks`, `outcome`. These are the moat. Deleting an
account should be possible; deleting history casually should not.

**A record the creator can't see isn't memory — it's storage.** Learned the hard
way on 2026-07-26: `title` was being written faithfully (five suggestions, both
descriptions, the score) while reopening a video restored four *input* fields and
left the results pane blank. Every number above was correct and the product still
felt like it had forgotten, because the only way to see work you already owned
was to spend a credit regenerating it into different text.

The shipped stage is therefore wider than the sketch above — it stores everything
the results pane renders, so the pane can be rebuilt from the record alone:

```js
title: { chosen, suggested[], hooks[], sections{}, score, keyword,
         shortDescription, fullDescription, at }
```

Two rules follow, and they apply to every stage still to be wired:

1. **Store what you render.** If the UI shows it, the record holds it. Storing
   only the chosen value makes the record look complete while quietly losing the
   alternatives — and the alternatives *are* the moat: knowing the four titles
   they didn't pick is the part no analytics tool can reconstruct.
2. **Never re-show live data from a record.** The YouTube ranking panel was true
   at generation time and isn't stored, so the restored view omits it. Replaying
   it as "ranking right now" would be a fabricated measurement.

**Answering the specific questions asked:**

- *How should AI use previous content?* Every prompt gets a compact "what we know
  about this creator" block built from their last ~20 published items and their
  outcomes. That block is the product.
- *How should creators measure improvement?* Score trend per stage, plus outcome
  trend. "Your title scores averaged 52 in month one and 74 in month three."
- *How do we visualise long-term progress?* A single line going up, one number
  per week, with published items marked. Boring on purpose. Real.
- *How does memory become the advantage?* A competitor can clone every tool in a
  weekend and still cannot clone six months of *this* creator's decisions and
  results. That asset only accrues to whoever starts storing it first — which is
  why this is urgent rather than important.
- *How does it make us harder to replace?* Switching costs stop being about
  features and start being about losing your record.

**MLP:** `content` + `weeks`, manual outcomes.
**Post-Beta:** outcome-informed prompts.
**v2:** `signals`, OAuth-filled outcomes.

---

# Part V — AI strategy: the five rungs

The ladder asked for, with the honest precondition each rung requires. **Every
rung is gated on data, not on model quality** — which is exactly why memory is
the strategy.

| Rung | What it does | Needs | Passes the "remove the word AI" test? | When |
|---|---|---|---|---|
| **1. Generator** | Writes titles, tags, ideas | Nothing | Marginal — useful, commodity | *shipped* |
| **2. Assistant** | Knows this video's context; no retyping | Content object | Yes — it removes real friction | **MLP** |
| **3. Coach** | "Your thumbnails are the weak link; here's why" | ~4 weeks history | Yes — it's judgement on your data | **Post-Beta** |
| **4. Creative partner** | "This idea is close to your Feb one that flopped. Try this angle." | ~20 items + outcomes | Yes — nobody else can say it | **v2** |
| **5. Business advisor** | "Two uploads a week is costing you more than it earns. Here's the sustainable shape." | ~6 months + revenue | Yes — genuinely consequential | **LTV** |

**The strategic point:** rungs 1 and 2 are copyable. Rungs 3–5 require a history
competitors don't have and can't buy. Every week of stored history moves us up a
ladder they must start climbing from the bottom.

**Remove "AI-powered" from all marketing.** Lead with the outcome. AI is how,
never what.

---

# Part VI — North Star

**Recommended: Weekly Shipped Rate — the percentage of active creators who
published at least one piece of content this week.**

Why this and not the alternatives:

- *Weekly videos completed* — rewards volume, and volume is not success.
- *Creator confidence* — the right thing to care about, unmeasurable weekly.
  Survey it quarterly as a secondary.
- *Creator improvement score* — we'd be grading our own homework.
- *Publishing consistency* — very close; Weekly Shipped Rate is its measurable form.

Weekly Shipped Rate is **uncheatable by engagement tricks** — no notification, no
badge, no streak gimmick moves it. It only goes up if creators actually publish.
It is true to the mission (the enemy is quitting) and it aligns the company with
the creator perfectly: we win only when they ship.

**How every feature supports it:** if a proposed feature doesn't plausibly
increase the chance a creator publishes next week, it's a v2 at best.

Supporting metrics: week-4 / week-12 retention · % with a 4-week unbroken streak ·
% of generated outputs actually used · Weekly Reviews shared.

---

# Part VII — The habit loop

- **Why open it today?** To capture an idea before it evaporates, or to move the
  one thing in flight to its next stage. *(10 seconds, usually mobile.)*
- **Why come back tomorrow?** You don't necessarily, and that's fine. **The
  product's rhythm is weekly, not daily** — designing for daily use would create
  guilt in people who publish weekly.
- **Why stay six months?** Because Progress now shows a real line going up, and
  the Library holds every decision you've made.
- **Why miss it if it vanished?** Because you'd lose the only record of how you
  got better — and the only thing that noticed when you shipped.

**Explicitly refused:** daily login streaks, notification badges, artificial
urgency, competitive leaderboards. They'd raise engagement and cost us trust,
which is the only asset we have that compounds as fast as memory.

**The one nudge we allow:** if a creator with an active streak hasn't shipped by
Saturday, one message — *"you've shipped 8 weeks running. Anything I can help get
over the line?"* Offer, not guilt. And a **planned break never breaks a streak.**

---

# Part VIII — Desktop and mobile are different products

Agreeing with the asymmetric split, with a sharper line.

**Desktop = the workbench.** Packaging (title/tags/thumbnail), planning the week,
the Weekly Review, the Library, deep analytics. Everything requiring a keyboard,
comparison, or judgement.

**Mobile = the companion.** Four things only:
1. **Capture** — an idea in 10 seconds, from anywhere. The single most-used
   surface in the product.
2. **Glance** — what's in flight, what's next.
3. **Ship** — mark published, feel the streak move. Often done from the phone
   right after upload.
4. **Review** — read the weekly review, share the image.

**Deliberately NOT on mobile:** thumbnail analysis, tag optimisation, calendar
building. Cramming the workbench onto a phone is how good products become bad
ones.

**MLP:** mobile-responsive capture + glance + ship (the current responsive build
mostly covers this).
**v2:** a real mobile app, when idea capture justifies it.

---

# Part IX — Beta strategy

**What must exist first (MLP):**
1. Content objects — every tool writes to one
2. This Week + Library
3. Manual outcome entry
4. The Weekly Review
5. Shipped streak
6. Paid inference or an honest hard cap
7. Corrected pricing (no "unlimited")

**What intentionally waits:** YouTube OAuth, community, mobile app, signals,
shareable review images, referrals, most visual polish.

**Who:** **10 creators, one niche — TCG/collectibles.** Small enough to talk to
every week, and the infrastructure can't serve more anyway. One niche makes
"what works" legible; ten niches makes it noise.

**Feedback:** a weekly 15-minute call, not a form. Ten calls a week is the single
highest-information activity available and it stops working at ~30 users, which is
exactly why it's worth doing now.

**Beta succeeds if:** ≥6 of 10 publish in week 4 · ≥4 have an unbroken 4-week
streak · ≥5 say they'd be disappointed to lose it · at least one shares a Weekly
Review unprompted.

**Beta says delay if:** creators use tools but never complete a loop · the Weekly
Review gets read once and ignored · nobody enters outcome data (the whole thesis
depends on it) · week-4 retention under 40%.

---

# Part X — Features: remove, merge, add

> ⚠️ **Corrected 2026-07-26.** An earlier draft of this section told a future
> session to delete `monetization`, `resources` and `platforms` as "static
> filler, no recurring value". **That was wrong, and it was written from memory
> without opening the files.** Two of the three are working, useful tools. The
> corrected version is below. Lesson recorded in CLAUDE.md: never describe a
> file you haven't just read.

**Unlink from nav — but keep the files (MLP)**

Unlinking is a nav edit you can undo in a minute; deleting throws away working
code. The problem was never that these pages exist — it's that advertising them
in the navigation makes a small product look padded.

- `competitor`, `collab`, `trends` — three menu items leading to "Coming Soon"
  is the only real offender. Take them out of the nav; leave the files.

**Keep — these were mislabelled**
- **`monetization`** — a real tool. 42 interactive elements tracking YouTube
  Partner Program thresholds with accurate maths, aimed exactly at our ideal
  user, who cares intensely about those numbers. It's also *progress toward a
  goal*, which is the emotional shape the whole product is built around.
  **Candidate to become a Studio tool**, not a deletion.
- **`resources`** — a curated list of 27 genuinely useful free/cheap creator
  tools (OBS, DaVinci Resolve, Kdenlive, CapCut, Canva, Photopea, remove.bg).
  Costs nothing to maintain, and "here's what you actually need and none of it
  costs money" is a trust signal that fits the brand precisely. **Keep it linked.**

**Fold when their replacements are proven, not before**
- `platforms` — its manual per-platform stat entry is now duplicated by Channel
  Audit. Redundant rather than useless; fold once the Audit has been used in anger.
- The 10 legacy tool pages, once the loop ships.

**Remove (copy, not pages)**
- "AI-powered" from all marketing copy.

**Merge (MLP)**
- All seven tools → stages of a Content object (still individually reachable)
- Live Titles → a Content **type** (`stream`), not a separate tool
- Channel Audit → the monthly depth view of the Weekly Review, one family

**Add**
- **MLP:** Content object · This Week · Library · manual outcomes · Weekly Review ·
  shipped streak · idea capture · **the "why" line on every score** (below)
- **Post-Beta:** Progress page · shareable review image · outcome-informed prompts ·
  packaging go/no-go
- **v2:** YouTube OAuth · signals engine · cohorts · mobile app · multi-platform
  content mapping
- **LTV:** predictive weekly planning · business advisor rung · creator-to-creator
  benchmarks (opt-in, aggregate, never leaderboards)

---

# Part X.b — The education layer

The manifesto already commits to this: *"the creator should get better, not more
dependent. If they can eventually do it without us, we succeeded."* A product
that only generates creates dependence. A product that teaches creates a better
creator — which is the stated mission, and it's also a genuine competitive gap:
vidIQ and TubeBuddy sell you a score and rarely explain it, because explaining
makes them less necessary. They're optimising for necessity. We shouldn't.

Two very different things get called "education". Only one is defensible.

**1. The "why" line — ✅ SHIPPED 2026-07-26. The differentiated one.**
Every score we already show gets one sentence of contextual explanation, tied to
*their* input. Not a help article — a sentence.

- Tag score 42 → *"Your tags describe the hobby, not this video. Ranking videos
  name the product AND the moment."*
- Text readability 5/10 → *"Thin text disappears at 168px. A 4px dark stroke
  survives; a thinner one won't."*
- Views per follower low → *"Reach is fine, conversion isn't. That's a CTA
  problem, not a titles problem."*

Impossible to copy well, because it needs the creator's context. And it expires
in the best way: after ten videos they don't need the explanation any more.
**Cheap to build** — the models already produce this reasoning; we just have to
show it as teaching rather than bury it in prose.

**2. A content library — blog posts and how-to guides. Post-Beta at the earliest,
and only if creators ask.**
Every competitor has one. It's substantial work to write, it dates quickly, it
doesn't compound, and it competes with the entire internet including YouTube
itself — where creators already learn for free. Skip it until asked.

**Keep the curated free-tools list** (`resources`). That's a third category:
not a guide, not a score, just "here's what you actually need and none of it
costs money". Honest, cheap, and exactly on brand.

# Part XI — Implementation order

**CRITICAL — the MLP, in this order**
1. ~~Content data model + Firestore rules~~ ✅ 2026-07-26
2. ~~Titles writes to Content objects~~ ✅ (other six wait for validation)
3. ~~My Content (Library)~~ ✅
4. ~~This Week~~ ✅
5. ~~Manual outcome entry + the once-per-video ask~~ ✅
6. ~~Weekly Review + shipped streak + cadence~~ ✅
7. ~~The "why" layer~~ ✅
8. Paid inference; corrected pricing *(neither blocks a 3-creator test)*
9. Unlink the three Coming Soon pages from nav
10. Run [TESTING.md](TESTING.md); **3 creators first**, then 10

**The build is done. What remains is commercial and hygiene.** The next real
step is not code — it's putting the loop in front of three creators and finding
out whether they'll type in their numbers.

**HIGH — Post-Beta:** Progress · shareable review · outcome-informed prompts ·
accessibility pass · split the Studio file

**MEDIUM — v2:** OAuth · signals · cohorts · mobile app · rename before spend

**LOW — LTV:** predictive planning · business advisor · extension · teams

---

# Part XII — If I founded this today

**The company is: the only place that knows *why* your content worked.**

Every creator flies blind. They publish, numbers arrive, and nobody ever connects
the numbers back to the decisions that produced them. Analytics tools show *what*
happened. Nothing shows *why*, because nothing was there when the choice was made.

We are there when the choice is made. That's the whole thing. We see the title
they picked and the four they didn't, the thumbnail score they overrode, the week
they skipped. Attach outcomes to those decisions and you have something no
analytics product can reconstruct after the fact and no competitor can backfill.

**The five-year product:** a creator's second brain that has watched them work for
three years and can say *"you're about to make the same mistake you made in
March,"* and be right.

**Assumptions worth abandoning now:**
- *That generation is the value.* It's approaching free.
- *That we compete with vidIQ.* We compete with Notion, a Google Doc, and quitting.
- *That more tools mean more product.* Seven disconnected tools are worth less
  than three connected ones.
- *That analytics is the endgame.* Analytics is a commodity feed. **Judgement
  informed by personal history is not.**

**What creators would wonder how they lived without:** not the title generator.
The thing that remembered, noticed they were improving, and told them the truth
on a Sunday.
