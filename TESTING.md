# CreatorNexusHQ — Manual Testing Checklist

Run this end-to-end before inviting any real user. It covers everything built
so far. Tick as you go; anything that fails, note the step number.

**Test on:** https://creatornexushq-eaf70.web.app
**Before you start:** hard-refresh (Ctrl+Shift+R). HTML is served `no-cache`,
but browsers and the CDN still hold stale copies after a deploy.

**Two accounts make this easier:**
- your real account (already on a Pro trial)
- one throwaway signup to test the first-run experience — **delete it in the
  Firebase console afterwards**

---

## Expected quirks — not bugs

Read this first so you don't chase things we already know:

- **Thumbnail scoring takes 20–30 seconds.** Vision models are slow. The button
  shows a working state the whole time.
- **Thumbnail scoring occasionally says the analyser is busy.** Gemini's free
  tier returns 503 under load. It retries once automatically; if it still
  fails you get an honest message and **no credit is spent**. Try again in a
  minute. (The Groq fallback model was retired by Groq — see Known debt in
  CLAUDE.md.)
- **Tag and thumbnail scores differ in kind.** The tag score is deterministic —
  same tags, same number, every time. The thumbnail sub-scores are an AI
  judgement and will drift a few points between runs. That's labelled in the UI.
- **Live YouTube ranking data only appears for YouTube**, and only while the
  daily search budget lasts (90/day). Without it, tools say so rather than
  pretending.

---

## A. Landing page (logged out)

1. [ ] Open the site in a private window. Nav shows **Log In / Sign Up**.
2. [ ] The **Tools** dropdown opens and every item goes somewhere real.
3. [ ] Pricing shows Free $0 / Creator $12 / Pro $29 and says billing launches
       after beta. **No checkout button anywhere.**
4. [ ] Contact form: submit a real message → success state, no error.
5. [ ] Scroll the whole page on a phone. **Nothing scrolls sideways.**

## B. Signup and onboarding (throwaway account)

6. [ ] Sign up with email. The form asks for **first name, last name, username,
       email, password**, a required **13+** checkbox and an optional marketing
       opt-in.
7. [ ] Try a bad username (`ab!`, or one character). It's rejected before submit.
8. [ ] Try to submit without ticking 13+. It's blocked.
9. [ ] After signup you land in the **Studio with the welcome survey open**.
10. [ ] The survey lets you pick **multiple platforms you post on** and
        **multiple you want to start on**. Niche + channel size save too.
11. [ ] Save it. The **"Your Channel" bar** at the top now shows your niche,
        platforms and size.
12. [ ] Reload the page. The context bar still shows your answers (it persisted
        to Firestore, not just this tab).
13. [ ] Sign in with **Google** on a separate throwaway. It also lands in the
        Studio and prompts the survey.

## C. Studio shell and navigation

14. [ ] Every rail item opens its tool. **Titles, Tags and Thumbnails are live**;
        Ideas, Posting Schedule, Live Titles and Channel Audit show "soon".
15. [ ] Clicking the account block at the bottom opens the **Account page**.
16. [ ] Edit the channel context via the **Edit** button top-right — changes
        show immediately in the bar.
17. [ ] On a phone, the hamburger opens the rail and picking a tool closes it.

## D. Titles & Descriptions

18. [ ] Platform **YouTube**, describe a video you'd actually make, add a target
        keyword, hit generate.
19. [ ] You get **titles, hooks, a short description and a full description**,
        plus an **SEO score out of 100** with pass/fail factor chips.
20. [ ] A **"Ranking on YouTube right now"** panel appears with real video titles
        and view counts. Confirm those are real videos for your topic.
21. [ ] Every **Copy** button copies the right text.
22. [ ] Switch platform to **TikTok** and regenerate. Output becomes **captions
        with hashtags baked in**, not YouTube-style titles.
23. [ ] Run the *same* input twice. The **SEO score is identical** both times.

## E. Tags & Hashtags

24. [ ] Leave the tags box **empty**, enter a video topic, generate. Button reads
        **"Build my tag set"**. You get a full set built from scratch.
25. [ ] Now **paste 4–5 tags** into the box. The hint and the button change to
        **"Rate & upgrade my tags"** as you type.
26. [ ] Generate. You get **your tags rated**, plus what's working, what to cut,
        and **what you're missing**.
27. [ ] Each tag chip shows **how many ranking videos use it** (e.g. `7/10`).
        Green = 2 or more. Sanity-check one against YouTube.
28. [ ] The **optimized set** lands around 10–15 tags and 200–300 characters —
        **not** stuffed to 500.
29. [ ] The **cross-post block** gives ready hashtags for TikTok, Instagram
        Reels and X, each on its own copyable line.
30. [ ] Paste a deliberately bad set (`pokemon, cards, video, fun, stuff`).
        **The score drops.** Paste a good tight set — it rises.
31. [ ] Run the same tags twice. **Identical score.**

## F. Thumbnails

32. [ ] **Score my thumbnail** mode. Upload a real 1280×720 thumbnail. The
        preview appears and the line under it reads **"16:9 and full resolution"**.
33. [ ] Upload a **square or small** image instead. It warns that it isn't 16:9
        and/or is below 1280×720.
34. [ ] Try a file over **4MB** — refused with a clear message, no upload.
35. [ ] Try a **PDF or other non-image** — refused.
36. [ ] Score a real thumbnail (allow ~25s). You get an **overall score**, five
        **AI sub-scores as bars**, what's working, what to fix, three
        improvements, a mobile check and a niche comparison.
37. [ ] The **Measured** block shows your thumbnail at **168×94, 246×138 and
        360×202** — the real display sizes. On mobile that strip scrolls
        sideways **without the page scrolling sideways**.
38. [ ] Confirm the AI caveat is visible: the five bars are an AI judgement, not
        a measurement.
39. [ ] **Generate AI prompts** mode. Fill in subject and colours, generate.
40. [ ] You get **3 named prompts**, each with a **negative prompt**, plus a best
        pick, a tool tip and a Canva tip. Copy buttons work.
41. [ ] Paste one prompt into your actual image tool and confirm it's usable.

## G. Account page

42. [ ] Name, username and email are correct.
43. [ ] Plan shows **Pro trial** (or Free) and explains what that means.
44. [ ] The channel summary matches your survey answers.
45. [ ] Change your username, save, reload — **it stuck**.
46. [ ] Toggle the marketing opt-in, save, reload — **it stuck**.
47. [ ] **Sign out** works and returns you to a logged-out state.

## H. Limits and honesty

48. [ ] While signed out, click Generate on any tool → **sign-in prompt**, not an
        error and not a redirect that loses your work.
49. [ ] The usage counter in the rail **decreases by exactly one** per successful
        generation.
50. [ ] Force a failure (turn off wi-fi mid-generation). You get a clear error
        and **the counter does not drop**.
51. [ ] Nowhere in the app does anything imply you can **pay** yet.
52. [ ] No tool claims live TikTok/Instagram trend data.

## I. Legacy pages still work

53. [ ] From the landing Tools menu, open the older pages
        (`app`, `analyze`, `thumbnail`, `streaming`, `platforms`).
54. [ ] Each one has a **"Back to Studio"** link that works.
55. [ ] Deep links land on the right tab, e.g.
        `creatornexushq-analyze.html?tab=analytics` opens **Analytics Advice**,
        not the default tab.
56. [ ] Competitor Research, Collab Finder and Trend Tracker are honestly gated
        **Coming Soon** — no fake output.

## J. Mobile pass (do this on a real phone)

57. [ ] Repeat steps 18, 24 and 36 on your phone.
58. [ ] **No page scrolls sideways at any point.** This is the single most
        common regression in this codebase — check every results screen.
59. [ ] Buttons and inputs are comfortably tappable; nothing is clipped.

## K. Cleanup

60. [ ] **Delete every throwaway account** in the Firebase console
        (Authentication → Users). Non-negotiable.

---

## Reporting

For anything that fails, note: step number, what you did, what you expected,
what happened, and whether it was desktop or mobile. A screenshot helps most
for layout issues.
