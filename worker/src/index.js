import { jwtVerify, createRemoteJWKSet } from 'jose';

const FIREBASE_PROJECT_ID = 'creatornexushq-eaf70';
const ALLOWED_ORIGIN = 'https://creatornexushq-eaf70.web.app';
const DAILY_FREE_LIMIT = 5;
// Site-wide cap across all users (Pro included) — protects the free Groq
// request quota (~1,000/day) while leaving headroom for its token limits.
// 150 was too tight once several testers are active at once.
const GLOBAL_DAILY_LIMIT = 800;
// Free tier today; ANTHROPIC_MODEL/ANTHROPIC_API_KEY are reserved for a future
// paid tier once Stripe/plan-tracking exists (see ROADMAP.md).
const GROQ_MODEL = 'openai/gpt-oss-120b';
// Vision-capable model for the Thumbnail Analyzer (Groq free tier;
// marked "Preview" by Groq as of 2026-07 — acceptable for beta).
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
// ~4MB image → ~5.3M base64 chars. Reject above this before hitting Groq.
const MAX_IMAGE_BASE64_CHARS = 5_600_000;
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
// Hybrid AI: Groq stays primary for text (speed + no-training privacy);
// Gemini Flash handles vision (stronger than Groq's Preview model) and is
// the text fallback if Groq errors. Activates once GEMINI_API_KEY is set.
// "-latest" alias tracks Google's current stable Flash release.
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// ---- YouTube Data API (real search/competition data) ----
// Free quota is 10,000 units/day; search.list costs 100 units. Budget 90
// searches/day, cache results in KV so repeat topics are free.
const YT_DAILY_SEARCH_BUDGET = 90;
const YT_CACHE_TTL = 60 * 60 * 6; // 6h — ranking data stays fresh enough

// Which tools get real YouTube data attached (when platform is YouTube).
const YT_TOOLS = { 'titles': 'description', 'analyze-tags': 'title', 'tag-suggester': 'topic' };

// Fetches what's ACTUALLY ranking on YouTube for a topic: top videos'
// titles, view counts, channels, and tags. Returns null (never throws)
// when the key is missing, quota is spent, or the API errors — callers
// fall back to the LLM-only prompt path.
async function fetchYouTubeData(env, query) {
  const apiKey = (env.YOUTUBE_API_KEY || '').trim();
  if (!apiKey || !query) return null;

  const q = String(query).toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 120);
  if (q.length < 3) return null;

  const cacheKey = 'yt:q:' + q;
  try {
    const cached = await env.RATE_LIMIT.get(cacheKey, { type: 'json' });
    if (cached) return cached;
  } catch { /* cache miss */ }

  // Daily quota guard (only uncached searches spend units).
  const day = new Date().toISOString().slice(0, 10);
  const quotaKey = 'yt:quota:' + day;
  const used = parseInt((await env.RATE_LIMIT.get(quotaKey)) || '0', 10);
  if (used >= YT_DAILY_SEARCH_BUDGET) return null;

  try {
    const searchRes = await fetch(
      'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&order=relevance'
      + '&q=' + encodeURIComponent(q) + '&key=' + apiKey
    );
    if (!searchRes.ok) {
      console.log('yt search error: ' + searchRes.status + ' ' + (await searchRes.text()).slice(0, 300));
      return null;
    }
    const search = await searchRes.json();
    const ids = (search.items || []).map((i) => i.id?.videoId).filter(Boolean);
    if (!ids.length) return null;

    const videosRes = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' + ids.join(',') + '&key=' + apiKey
    );
    if (!videosRes.ok) return null;
    const videos = await videosRes.json();

    const items = (videos.items || []).map((v) => ({
      title: v.snippet?.title || '',
      channel: v.snippet?.channelTitle || '',
      views: parseInt(v.statistics?.viewCount || '0', 10),
      tags: (v.snippet?.tags || []).slice(0, 25),
    })).filter((v) => v.title);
    if (!items.length) return null;

    const data = {
      query: q,
      videos: items.map(({ title, channel, views }) => ({ title, channel, views })),
      // De-duped tag pool across all ranking videos, most-frequent first.
      tagPool: [...items.reduce((m, v) => { v.tags.forEach((t) => m.set(t.toLowerCase(), (m.get(t.toLowerCase()) || 0) + 1)); return m; }, new Map())]
        .sort((a, b) => b[1] - a[1]).slice(0, 40).map(([tag, count]) => ({ tag, count })),
      fetchedAt: new Date().toISOString(),
    };

    await env.RATE_LIMIT.put(quotaKey, String(used + 1), { expirationTtl: 60 * 60 * 48 });
    await env.RATE_LIMIT.put(cacheKey, JSON.stringify(data), { expirationTtl: YT_CACHE_TTL });
    return data;
  } catch (e) {
    console.log('yt fetch error: ' + e);
    return null;
  }
}

function formatViews(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function verifyFirebaseToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    if (!payload.sub) return null;
    return { uid: payload.sub, email: String(payload.email || '').toLowerCase() };
  } catch {
    return null;
  }
}

// Pro entitlements are granted by the site owner directly in KV — no
// billing required. Key "pro:<email>" holds the last day (YYYY-MM-DD,
// UTC) the grant is active. Grant/revoke via wrangler; see ROADMAP.md.
async function checkProGrant(env, email) {
  if (!email) return false;
  const until = await env.RATE_LIMIT.get('pro:' + email);
  if (!until) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today <= until.trim();
}

const TRIAL_DAYS = 7;
// Trial users are metered (generous, but real) so one tester can't
// single-handedly drain GLOBAL_DAILY_LIMIT for everyone else.
const TRIAL_DAILY_LIMIT = 50;

// Every account gets an automatic Pro trial starting from its FIRST
// generation (not signup — nobody burns trial days before trying the
// product). The trial record is permanent (no TTL) so a lapsed trial
// can't restart by the key expiring out of KV.
async function checkTrial(env, uid) {
  const key = 'trial:' + uid;
  let until = await env.RATE_LIMIT.get(key);
  if (!until) {
    until = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString().slice(0, 10);
    await env.RATE_LIMIT.put(key, until);
  }
  const today = new Date().toISOString().slice(0, 10);
  return today <= until.trim();
}

// Read-only check — does NOT spend a credit. Call incrementUsage() only
// after a generation actually succeeds, so failed/errored attempts don't
// burn the user's daily allowance. dailyLimit === null means unmetered (Pro).
async function checkUsage(env, uid, dailyLimit) {
  const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const userKey = `usage:${uid}:${day}`;
  const globalKey = `usage:global:${day}`;
  const userCount = parseInt((await env.RATE_LIMIT.get(userKey)) || '0', 10);
  const globalCount = parseInt((await env.RATE_LIMIT.get(globalKey)) || '0', 10);
  if (globalCount >= GLOBAL_DAILY_LIMIT) {
    return { allowed: false, reason: 'global' };
  }
  if (dailyLimit !== null && userCount >= dailyLimit) {
    return { allowed: false, reason: 'user' };
  }
  return { allowed: true, userKey, userCount, globalKey, globalCount };
}

async function incrementUsage(env, usage, dailyLimit) {
  await env.RATE_LIMIT.put(usage.globalKey, String(usage.globalCount + 1), { expirationTtl: 60 * 60 * 48 });
  if (dailyLimit === null) return null; // Pro has no per-user meter
  await env.RATE_LIMIT.put(usage.userKey, String(usage.userCount + 1), { expirationTtl: 60 * 60 * 48 });
  return dailyLimit - (usage.userCount + 1);
}

// ============================================================
// PROMPT TABLE — ported verbatim from the client-side prompts
// in index.html, creatornexushq-streaming.html,
// creatornexushq-analyze.html, and creatornexushq-thumbnail.html
// ============================================================

const INDEX_SYSTEM = `You are CreatorNexusHQ, an expert AI coach for content creators, streamers, and YouTubers. You specialize in helping small to mid-size creators grow their audience with practical, specific, and high-impact advice. Your tone is direct, energetic, and encouraging — like a knowledgeable friend who's also a successful creator. Always give concrete, actionable outputs. Format your responses clearly with labels like TITLE 1:, HOOK 1:, IDEA 1: etc so they're easy to parse. Never be generic. Always tailor to the specific content described.`;

// ============================================================
// PLATFORM RULES — each platform is a different product with its
// own discovery model. These get injected into title/caption
// prompts so YouTube output is search-optimized while TikTok/IG
// output is feed-optimized, instead of one title reused everywhere.
// ============================================================
const PLATFORM_RULES = {
  youtube: `PLATFORM RULES — YouTube (search-driven):
- Discovery = search + suggested. FRONT-LOAD the primary keyword in every title.
- Titles: 60 characters max (longer truncates in search results).
- NEVER put hashtags inside a YouTube title. Hashtags (2-3 max) belong in the description — YouTube shows the first 3 above the title.
- Never wrap titles in quotation marks.`,
  tiktok: `PLATFORM RULES — TikTok (feed-driven):
- The caption IS the title. Discovery = algorithmic feed + hashtag topics.
- The first 40 characters carry the hook — put the payoff there.
- Bake 3-5 hashtags into the END of each caption. Hashtags are TikTok's primary topic classification.
- Keep each full caption under 150 characters. Casual, native tone — not ad copy.`,
  instagram: `PLATFORM RULES — Instagram Reels (feed-driven):
- There is no title — only the caption. The first line is the hook (about 125 characters show before "...more").
- Bake 3-5 hashtags into the END of each caption.
- Conversational tone; write like a person, not a brand.`,
  x: `PLATFORM RULES — X (timeline-driven):
- The post text is the title. 280 character limit; strongest line first.
- 1-2 inline hashtags maximum — more reads as spam on X.
- Human voice; zero ad-speak.`,
  snapchat: `PLATFORM RULES — Snapchat:
- Short and punchy: under 80 characters.
- 1-3 topical hashtags baked at the end.
- Extremely casual, native tone.`,
  facebook: `PLATFORM RULES — Facebook (feed + shares):
- About 80 characters show before truncation; lead with the emotional core.
- 1-2 hashtags at the end are fine; more hurts reach.
- Plain-spoken, shareable phrasing.`,
  twitch: `PLATFORM RULES — Twitch (category-driven):
- Discovery = category directory; the title differentiates you inside it.
- Under 100 characters. Lead with the moment/stakes, not the game name (the category already says it).
- No hashtags. Never wrap titles in quotation marks.`,
  kick: `PLATFORM RULES — Kick (category-driven):
- Like Twitch: category does discovery, the title sells the moment.
- Authenticity over polish — Kick culture rewards real over produced.
- No hashtags. Never wrap titles in quotation marks.`,
};

// Feed platforms: output is captions with hashtags baked in.
// Search/category platforms: clean titles, hashtags live elsewhere.
const FEED_PLATFORMS = ['tiktok', 'instagram', 'x', 'snapchat', 'facebook'];

function platformKey(p) {
  const s = String(p || 'youtube').toLowerCase();
  if (s.includes('tiktok')) return 'tiktok';
  if (s.includes('instagram') || s.includes('reel')) return 'instagram';
  if (s === 'x' || s.includes('twitter')) return 'x';
  if (s.includes('snap')) return 'snapchat';
  if (s.includes('facebook')) return 'facebook';
  if (s.includes('twitch')) return 'twitch';
  if (s.includes('kick')) return 'kick';
  return 'youtube';
}

const TOOLS = {
  // ---- index.html ----
  titles: {
    system: INDEX_SYSTEM,
    build: (f) => {
      const yt = f.__yt;
      const pk = platformKey(f.platform);
      const isFeed = FEED_PLATFORMS.includes(pk);
      const isYouTube = pk === 'youtube';
      const label = isFeed ? 'CAPTION' : 'TITLE';
      const kw = (f.keyword || '').trim();

      const rankingBlock = yt
        ? `\nLIVE DATA — these videos are ranking on YouTube for this topic RIGHT NOW:
${yt.videos.map((v, i) => `${i + 1}. "${v.title}" — ${formatViews(v.views)} views (${v.channel})`).join('\n')}

Study the patterns in what's actually winning (structure, emotional angle, specificity, length) and write titles that can compete with these — similar enough to rank for the same searches, different enough to stand out in the results.\n`
        : '';

      const tail = isYouTube
        ? `SUGGESTED HASHTAGS: [2-3 hashtags for the DESCRIPTION (YouTube shows the first 3 above the title), space-separated${yt ? ' — grounded in the live ranking data above' : ''}]
SUGGESTED TAGS: [10-14 video tags as one comma-separated list ready to paste into the tag box${yt ? ', drawn from tags ranking videos actually use' : ''}]
SHORT DESCRIPTION: [one punchy sentence for Shorts/community reuse — one line]
FULL DESCRIPTION: [a complete upload-ready SEO description. Requirements: the primary keyword appears in the FIRST sentence (phrased naturally); MINIMUM 170 words of actual prose (aim for 180-230) across 2-3 short paragraphs; naturally repeat the keyword and 2-3 related search terms in the body; include a [LINKS] placeholder line and, if the video suits chapters, a [CHAPTERS] placeholder line; END with the 2-3 hashtags. Real line breaks between paragraphs.]`
        : isFeed
          ? `EXTRA HASHTAGS: [5-8 alternate hashtags to rotate across posts so reach doesn't stagnate, space-separated]`
          : `SHORT DESCRIPTION: [one-line clip/VOD caption for socials]`;

      return `Generate 5 scroll-stopping ${isFeed ? 'captions' : 'titles'} and 5 hooks for a ${f.platform || 'YouTube'} creator.

${PLATFORM_RULES[pk]}

Video details:
- Content type: ${f.contentType}
- Description: ${f.description}${kw ? `\n- PRIMARY TARGET KEYWORD: "${kw}" — weave this phrase (or a close natural variant) into the FIRST HALF of each ${label.toLowerCase()}, but NATURALLY: titles must read like a human wrote them. Never use the keyword as a robotic "keyword:" prefix; at most ONE ${label.toLowerCase()} may begin with the keyword itself.` : ''}
- Tone: ${f.tone}
- Video length: ${f.length}
${rankingBlock}
Format exactly like this — PLAIN TEXT ONLY: no markdown, no asterisks, no bold; every label starts at the beginning of its line exactly as shown. Never wrap ${label.toLowerCase()}s in quotation marks:
${label} 1: [${label.toLowerCase()}]
${label} 2: [${label.toLowerCase()}]
${label} 3: [${label.toLowerCase()}]
${label} 4: [${label.toLowerCase()}]
${label} 5: [${label.toLowerCase()}]

HOOK 1: [hook - first 1-3 seconds spoken or on screen]
HOOK 2: [hook]
HOOK 3: [hook]
HOOK 4: [hook]
HOOK 5: [hook]

BEST COMBO: ${label === 'CAPTION' ? 'Caption' : 'Title'} [X] + Hook [Y] — [one sentence explaining why]
${yt ? 'DATA INSIGHT: [one sentence on the strongest pattern you saw in the ranking titles and how your titles exploit it]\n' : ''}${tail}

Make them punchy, platform-native, and emotionally compelling. No generic clickbait.`;
    },
  },

  ctas: {
    system: INDEX_SYSTEM,
    build: (f) => `Generate 8 CTAs for a ${f.platform || 'YouTube'} creator.

Details:
- Goal: ${f.goal}
- Niche: ${f.niche}
- Tone: ${f.tone}
- Format: ${f.format}

Format exactly like this:
CTA 1: [cta line]
CTA 2: [cta line]
...

GROUP them by type: "Verbal CTAs" (say out loud) and "On-Screen CTAs" (text overlay).
Include a TIP at the end about WHERE and WHEN to place the CTA in the video.`,
  },

  ideas: {
    system: INDEX_SYSTEM,
    build: (f) => `Generate ${f.count} specific video ideas for a ${f.platform || 'YouTube'} creator.

Details:
- Niche: ${f.niche}
- What's working: ${f.working}
- Subscriber count: ${f.subs}

Format exactly like this:
IDEA 1: [title idea] — [one sentence on why this will perform and what makes it unique]
IDEA 2: ...

Make them specific, not generic. Each idea should feel like something they could film TODAY.`,
  },

  analytics: {
    system: INDEX_SYSTEM,
    build: (f) => `Analyze these YouTube channel stats and give specific growth advice.

Stats (last 28 days):
- Views: ${f.views}
- Subscribers gained: ${f.subs}
- Watch time: ${f.watchtime} hours
- Avg view percentage: ${f.avp}
- Top content: ${f.top}
- Biggest challenge: ${f.challenge}

Give your response in these sections:
DIAGNOSIS: [2-3 sentences on what the data is telling you]
STRENGTHS: [what's working — be specific]
GAPS: [what's holding them back]
TOP 3 ACTIONS: [three specific things to do THIS WEEK]
METRIC TO WATCH: [one number to focus on and why]`,
  },

  // ---- creatornexushq-streaming.html ----
  'stream-titles': {
    system: `You are CreatorNexusHQ's stream title specialist. You write stream titles that are optimized for each platform's specific algorithm, audience, and culture. You know that Twitch titles need to stand out in directories, YouTube Live titles need SEO, Kick titles need authenticity, Facebook Gaming needs community language, and TikTok Live needs punchy hooks. Always write platform-native titles. Be specific and creative — never generic.`,
    build: (f) => `Generate 8 stream titles for ${f.platform}.

${PLATFORM_RULES[platformKey(f.platform)]}

Details:
- Game / Content: ${f.game}
- Stream vibe: ${f.vibe}
- Channel size: ${f.size}
- Specific details: ${f.specific || 'Nothing specific'}
- Personality: ${f.personality}

Format exactly like this:
TITLE 1: [title]
TYPE 1: [one word describing the style — e.g. Hype, Chill, Challenge, Milestone]

TITLE 2: [title]
TYPE 2: [style]

(continue for all 8)

BEST PICK: Title [number] — [one sentence on why this one will perform best for this platform and channel size]

PLATFORM NOTE: [one specific tip about what makes titles work on ${f.platform} right now]`,
  },

  // ---- creatornexushq-analyze.html (main analyzer, 6 sub-tools) ----
  'analyze-title': {
    system: `You are CreatorNexusHQ's content analysis engine. You give specific, data-informed, actionable feedback to content creators. Be direct, concrete, and helpful. Never be generic. Always give specific examples and rewrites where relevant. Format your responses with clear labeled sections using ALL CAPS labels followed by a colon.`,
    build: (f) => `Analyze this ${f.platform || 'YouTube'} video title and description for a ${f.contentType} creator targeting ${f.audience}.

TITLE: ${f.title}
DESCRIPTION: ${f.desc}

Give your analysis in these exact sections:
SCORE: [X/100] — [one sentence verdict]
TITLE STRENGTHS: [what's working]
TITLE WEAKNESSES: [what's holding it back]
IMPROVED TITLE 1: [rewrite]
IMPROVED TITLE 2: [rewrite]
IMPROVED TITLE 3: [rewrite]
DESCRIPTION FEEDBACK: [specific feedback on the description]
IMPROVED DESCRIPTION: [a better version]
KEYWORDS MISSING: [specific keywords they should add]
ONE BIG TIP: [the single most important thing to change]`,
  },

  'analyze-script': {
    system: `You are CreatorNexusHQ's content analysis engine. You give specific, data-informed, actionable feedback to content creators. Be direct, concrete, and helpful. Never be generic. Always give specific examples and rewrites where relevant. Format your responses with clear labeled sections using ALL CAPS labels followed by a colon.`,
    build: (f) => `Analyze this ${f.platform || 'YouTube'} ${f.format} script for a content creator.

SCRIPT:
${f.script}

Analyze in these exact sections:
HOOK SCORE: [X/10] — [verdict on the opening]
HOOK FEEDBACK: [specific feedback]
IMPROVED HOOK: [rewrite the hook]
PACING: [feedback on pacing and structure]
CTA PLACEMENT: [where the CTA is and where it should be]
IMPROVED CTA: [a better CTA line]
RETENTION RISKS: [moments where viewers might drop off and why]
OVERALL SCORE: [X/100]
TOP 3 FIXES: [the three most important changes to make]`,
  },

  'analyze-pattern': {
    system: `You are CreatorNexusHQ's content analysis engine. You give specific, data-informed, actionable feedback to content creators. Be direct, concrete, and helpful. Never be generic. Always give specific examples and rewrites where relevant. Format your responses with clear labeled sections using ALL CAPS labels followed by a colon.`,
    build: (f) => `Analyze the content patterns for this ${f.platform || 'YouTube'} creator in the ${f.niche} niche.

CHANNEL STATS:
- Subscribers: ${f.subs}
- Avg views per video: ${f.avgViews}
- Posting frequency: ${f.frequency}

TOP PERFORMING VIDEOS:
${f.videos}

Analyze in these exact sections:
WHAT'S WORKING: [specific patterns in the top performers — titles, topics, formats]
WHAT'S NOT WORKING: [what to avoid based on the data]
TITLE PATTERN: [the formula that works for this channel]
CONTENT PILLARS: [3 content types they should focus on]
SUBSCRIBER TO VIEW RATIO: [analysis of their conversion]
GROWTH BOTTLENECK: [the single biggest thing holding them back]
NEXT 5 VIDEO IDEAS: [specific ideas based on the patterns]
30 DAY PLAN: [what to do over the next 30 days]`,
  },

  'analyze-schedule': {
    system: `You are CreatorNexusHQ's content analysis engine. You give specific, data-informed, actionable feedback to content creators. Be direct, concrete, and helpful. Never be generic. Always give specific examples and rewrites where relevant. Format your responses with clear labeled sections using ALL CAPS labels followed by a colon.`,
    build: (f) => `Analyze this creator's posting schedule and give specific optimization advice.

PLATFORMS: ${f.platforms || 'Not specified'}
CURRENT SCHEDULE: ${f.current}
TIMEZONE: ${f.timezone}
AUDIENCE LOCATION: ${f.audience}
GOAL: ${f.goal}

Analyze in these exact sections:
SCHEDULE SCORE: [X/10] — [verdict]
WHAT'S GOOD: [what they're doing right]
WHAT TO CHANGE: [specific problems with current schedule]
BEST DAYS TO POST: [ranked list with reasoning]
BEST TIMES TO POST: [specific times in their timezone]
POSTING FREQUENCY: [is it too much, too little, or just right]
PLATFORM SPECIFIC TIPS: [timing advice for each platform they're on]
OPTIMIZED SCHEDULE: [a specific new weekly schedule]`,
  },

  'analyze-calendar': {
    system: `You are CreatorNexusHQ's content analysis engine. You give specific, data-informed, actionable feedback to content creators. Be direct, concrete, and helpful. Never be generic. Always give specific examples and rewrites where relevant. Format your responses with clear labeled sections using ALL CAPS labels followed by a colon.`,
    build: (f) => `Build a detailed weekly content calendar for a creator in the ${f.niche} niche.

PLATFORMS: ${f.platforms || 'YouTube'}
POSTS PER WEEK: ${f.frequency}
CONTENT MIX: ${f.mix}
TIMEZONE: ${f.timezone}
AVAILABILITY: ${f.availability}

Create a full 7-day weekly posting calendar. For each post slot include:
- Day and time
- Platform
- Content type
- Specific video/post idea title
- One line on why this works for that day/time

Format each day as:
DAY [name]:
POST 1: [time] | [platform] | [content type] | [specific idea] | [why]
POST 2: (if applicable)

End with:
WEEKLY STRATEGY: [2-3 sentences on the overall strategy behind this calendar]
KEY PRINCIPLE: [the one rule to follow with this schedule]`,
  },

  'analyze-tags': {
    system: `You are CreatorNexusHQ's content analysis engine. You give specific, data-informed, actionable feedback to content creators. Be direct, concrete, and helpful. Never be generic. Always give specific examples and rewrites where relevant. Format your responses with clear labeled sections using ALL CAPS labels followed by a colon.`,
    build: (f) => {
      const yt = f.__yt;
      const dataBlock = yt
        ? `\nLIVE DATA — tags used by the videos actually ranking on YouTube for this topic right now (tag, and how many of the top ${yt.videos.length} videos use it):
${yt.tagPool.map((t) => `- "${t.tag}" (${t.count})`).join('\n')}

Score the creator's tags AGAINST this real data: a tag is STRONG if ranking videos use it, MISSING if it's common in the data but absent from their set, and DEAD WEIGHT if nothing ranking uses it.\n`
        : '';
      const pk = platformKey(f.platform);
      const isYouTube = pk === 'youtube';
      const hasTags = !!(f.currentTags && String(f.currentTags).trim());

      const auditSections = hasTags
        ? `OVERALL SCORE: [X/100] — [one sentence verdict on the tag strategy${yt ? ', grounded in the live ranking data' : ''}]
STRONG TAGS: [which of their tags are working and why${yt ? ' — cite how many ranking videos use each' : ''}]
WEAK TAGS: [which tags to remove and why — too broad, too competitive, irrelevant${yt ? ', or absent from every ranking video' : ''}]
MISSING TAGS: [specific tags they should be using but aren't${yt ? ' — prioritize tags multiple ranking videos share' : ''}]
`
        : '';

      const hashtagLine = isYouTube
        ? `HASHTAGS FOR DESCRIPTION: [2-3 hashtags to put in the video DESCRIPTION — YouTube shows the first 3 above the title. Never suggest hashtags inside a YouTube title.]`
        : (pk === 'twitch' || pk === 'kick')
          ? `HASHTAG NOTE: [hashtags don't drive discovery on ${f.platform} — say so plainly and tell them what matters instead (category, title)]`
          : `HASHTAGS FOR CAPTION: [3-5 hashtags to bake into the END of the caption, in the ideal order — these are ${f.platform}'s primary topic classification]`;

      return `${hasTags ? 'Analyze and upgrade' : 'Create from scratch'} the ${f.platform || 'YouTube'} tag & hashtag set for a ${f.contentType} creator in the ${f.niche} niche with ${f.channelSize}.

${PLATFORM_RULES[pk]}

VIDEO TOPIC/TITLE: ${f.title}
${hasTags ? `CURRENT TAGS: ${f.currentTags}` : 'CURRENT TAGS: none provided — build the full recommended set from scratch.'}
${dataBlock}
Respond in these exact sections (plain text, no markdown):
${auditSections}TAG STRATEGY: [short vs long tail balance, branded vs generic, and what fits this channel size]
OPTIMIZED TAG SET: [the complete ${hasTags ? 'replacement' : 'recommended'} set of 10-15 tags as ONE comma-separated line ready to copy and paste${yt ? ' — drawn from tags ranking videos actually use where relevant' : ''}]
${hashtagLine}
ONE BIG INSIGHT: [the single most important ${hasTags ? 'thing wrong with their current tag strategy' : 'principle for tagging this video well'}]`;
    },
  },

  // ---- creatornexushq-analyze.html (Tag Suggester — reads real YouTube data if the client supplied it) ----
  'tag-suggester': {
    system: `You are a YouTube SEO expert at CreatorNexusHQ. Give specific, actionable tag recommendations. Always consider channel size when recommending tags — smaller channels need more niche tags they can actually rank for.`,
    build: (f) => {
      // Server-fetched ranking data (preferred) or client-supplied API data.
      if (f.__yt) {
        const titles = f.__yt.videos.slice(0, 6).map((v, i) => `${i + 1}. "${v.title}" — ${formatViews(v.views)} views`).join('\n');
        const tags = f.__yt.tagPool.map((t) => `${t.tag} (used by ${t.count})`).join(', ');
        return `A YouTube creator with ${f.channelSize} is making a video about: "${f.topic}"

LIVE DATA — videos ranking on YouTube for this topic right now:
${titles}

Tags those ranking videos actually use (with how many of them use each):
${tags}

Analyze the real competitor tags and suggest the best ones for a channel with ${f.channelSize}. Format your response as:

COMPETITOR TITLES SCANNED: [number]
TOP COMPETITOR TAGS: [the most common/relevant tags appearing across ranking videos — cite usage counts]
TOO COMPETITIVE: [tags that are too broad to rank for at this channel size]
BEST TAGS TO USE: [10-15 tags perfectly sized for their channel — mix of niche and broad]
LONG TAIL GEMS: [3-5 specific long-tail tags competitors missed that could rank easily]
READY TO COPY: [the final optimized tag set as a single comma-separated list]
STRATEGY NOTE: [one insight about the competitive tag landscape for this topic]`;
      }
      const hasRealData = Array.isArray(f.competitorTags) && f.competitorTags.length > 0;
      if (hasRealData) {
        const titles = (f.competitorTitles || []).slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n');
        const tags = [...new Set(f.competitorTags)].join(', ');
        return `A YouTube creator with ${f.channelSize} is making a video about: "${f.topic}"

I scraped these competitor video titles:
${titles}

And these are all the tags those top videos are using:
${tags}

Analyze the competitor tags and suggest the best ones for a channel with ${f.channelSize}. Format your response as:

COMPETITOR TITLES SCANNED: [number]
TOP COMPETITOR TAGS: [the most common/relevant tags appearing across competitor videos]
TOO COMPETITIVE: [tags that are too broad to rank for at this channel size]
BEST TAGS TO USE: [10-15 tags perfectly sized for their channel — mix of niche and broad]
LONG TAIL GEMS: [3-5 specific long-tail tags competitors missed that could rank easily]
READY TO COPY: [the final optimized tag set as a single comma-separated list]
STRATEGY NOTE: [one insight about the competitive tag landscape for this topic]`;
      }
      return `A YouTube creator with ${f.channelSize} is making a video about: "${f.topic}"

No live YouTube API data available, so suggest tags based on your knowledge of YouTube SEO and this niche.

Format your response as:

NOTE: [one sentence explaining these are AI-suggested, not scraped from live data]
BROAD TAGS: [5 well-known tags in this niche — high competition but good for discoverability]
MEDIUM TAGS: [5 mid-competition tags — good balance of reach and rankability]
LONG TAIL GEMS: [5 specific niche tags — lower competition, easier to rank for at this channel size]
TRENDING TAGS: [3-4 tags that are currently popular in this space]
READY TO COPY: [the final optimized tag set as a single comma-separated list of 12-15 tags]
STRATEGY NOTE: [one key insight about tag strategy for this channel size and niche]
API TIP: Add your YouTube API key above to scan real competitor tags instead of AI suggestions.`;
    },
  },

  // ---- creatornexushq-thumbnail.html ----
  'thumbnail-prompt': {
    system: `You are CreatorNexusHQ's AI thumbnail prompt specialist. You write highly detailed, optimized AI image generation prompts specifically for YouTube thumbnails. You know how to write prompts for Midjourney, DALL-E, Adobe Firefly, and other tools. Your prompts always include: composition details, lighting, color palette, mood, style references, aspect ratio (16:9 for thumbnails), and negative prompts to avoid bad results. Tailor every prompt to the creator's actual niche — whether that's gaming, Pokémon/TCG card openings, blind-box or mystery unboxings, vlogs, podcast clips, beauty, fitness, cooking, tech reviews, IRL, commentary, or anything else they describe. Write prompts that will generate thumbnail backgrounds and scenes — not final thumbnails with text overlay (text is added in Canva after).`,
    build: (f) => `Generate AI image prompts for a YouTube thumbnail.

Video details:
- Title: ${f.title || 'Not specified'}
- Niche: ${f.niche || 'Gaming / content creation'}
- Thumbnail style: ${f.style}
- Main subject: ${f.subject}
- Color scheme: ${f.colors}
- AI tool: ${f.aiTool}
- Target emotion: ${f.emotion}
- Specific elements: ${f.elements || 'None specified'}

Generate 3 prompts optimized for ${f.aiTool}. Format EXACTLY like this:

PROMPT 1 NAME: [short descriptive name e.g. "Dramatic Action Shot"]
PROMPT 1:
[The full detailed prompt ready to paste — be very specific about composition, lighting, colors, style, mood, aspect ratio 16:9]

NEGATIVE PROMPT 1: [things to exclude — blurry, text, watermark, etc]

---

PROMPT 2 NAME: [name]
PROMPT 2:
[Full prompt — different angle or style approach]

NEGATIVE PROMPT 2: [exclusions]

---

PROMPT 3 NAME: [Background only version]
PROMPT 3:
[A background-only version they can use behind their face cutout — no people, just environment/scene]

NEGATIVE PROMPT 3: [exclusions]

---

BEST PICK: Prompt [number] — [one sentence on why]
PRO TIP: [one specific tip for getting the best results in ${f.aiTool}]
CANVA TIP: [one tip on how to finish the thumbnail in Canva after generating the image]`,
  },

  'thumbnail-analyze': {
    system: `You are CreatorNexusHQ's thumbnail analysis expert. You analyze YouTube and social media thumbnails for click-through rate potential. Be specific, direct, and actionable. Always reference specific elements you can see in the image. Give scores as numbers out of 10 or 100. Format responses with clear ALL CAPS labels.`,
    // Vision tool: build() returns the TEXT block only; the image block is
    // attached separately in handleGenerate() since it needs f.imageBase64 / f.imageType.
    build: (f) => `Analyze this ${f.platform || 'YouTube'} thumbnail for a ${f.contentType} video.

Video title: "${f.title || 'Not provided'}"
Channel size: ${f.channelSize}
Intended emotion: ${f.emotion}

Give a detailed analysis in these exact sections:

OVERALL SCORE: [X/100] — [one sentence verdict]
CLICK THROUGH POTENTIAL: [X/10] — [why]
TEXT READABILITY: [X/10] — [feedback on any text in the thumbnail]
VISUAL CLARITY: [X/10] — [how clear and focused the image is]
EMOTIONAL IMPACT: [X/10] — [does it trigger the right emotion]
COLOR & CONTRAST: [X/10] — [color usage and contrast feedback]
WHAT'S WORKING: [specific things done well]
WHAT TO FIX: [specific problems to address]
IMPROVEMENT 1: [specific actionable change]
IMPROVEMENT 2: [specific actionable change]
IMPROVEMENT 3: [specific actionable change]
MOBILE CHECK: [how it would look at small/mobile size]
COMPETITOR EDGE: [how it compares to what typically performs well in this niche]`,
    isVision: true,
  },
};

// Calls one OpenAI-compatible chat endpoint. Returns { text } or
// { error, status, detail } — never throws.
async function callChatAPI(url, apiKey, model, system, userContent, label) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: model,
        // 3000 (was 2000): both providers spend internal reasoning tokens
        // from this budget, and the platform-aware titles output (5 titles
        // + hooks + tags + short & full descriptions) truncated at 2000.
        max_tokens: 3000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
      }),
    });
  } catch (e) {
    console.log(label + ' network error: ' + e);
    return { error: 'model_error', status: 0, detail: String(e) };
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.log(label + ' error: status=' + res.status + ' body=' + errBody.slice(0, 500));
    return { error: 'model_error', status: res.status, detail: errBody };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) return { error: 'model_error', status: 200, detail: label + ' returned empty content' };
  return { text };
}

async function callModel(env, tool, fields) {
  const def = TOOLS[tool];
  if (!def) return { error: 'unknown_tool' };

  const promptText = def.build(fields);
  const groqKey = (env.GROQ_API_KEY || '').trim();
  const geminiKey = (env.GEMINI_API_KEY || '').trim();

  let userContent = promptText;
  if (def.isVision) {
    if (!fields.imageBase64 || !fields.imageType) {
      return { error: 'missing_image', detail: 'Upload a thumbnail image first.' };
    }
    if (fields.imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      return { error: 'image_too_large', detail: 'Image is too large — please use an image under 4MB.' };
    }
    userContent = [
      { type: 'text', text: promptText },
      { type: 'image_url', image_url: { url: 'data:' + fields.imageType + ';base64,' + fields.imageBase64 } },
    ];
  }

  if (def.isVision) {
    // Vision: prefer Gemini Flash (stronger than Groq's Preview model);
    // Groq vision remains the fallback so the tool works with either key.
    if (geminiKey) {
      const g = await callChatAPI(GEMINI_OPENAI_URL, geminiKey, GEMINI_MODEL, def.system, userContent, 'gemini-vision');
      if (!g.error) return g;
    }
    if (groqKey) {
      return callChatAPI('https://api.groq.com/openai/v1/chat/completions', groqKey, GROQ_VISION_MODEL, def.system, userContent, 'groq-vision');
    }
    return { error: 'backend_not_configured', detail: 'No vision-capable API key configured.' };
  }

  // Text: Groq primary (fast, no-training privacy), Gemini fallback.
  if (groqKey) {
    const r = await callChatAPI('https://api.groq.com/openai/v1/chat/completions', groqKey, GROQ_MODEL, def.system, userContent, 'groq');
    if (!r.error) return r;
    if (geminiKey) {
      const g = await callChatAPI(GEMINI_OPENAI_URL, geminiKey, GEMINI_MODEL, def.system, userContent, 'gemini-fallback');
      if (!g.error) return g;
    }
    return r; // surface the primary provider's error
  }
  if (geminiKey) {
    return callChatAPI(GEMINI_OPENAI_URL, geminiKey, GEMINI_MODEL, def.system, userContent, 'gemini');
  }
  return { error: 'backend_not_configured', detail: 'No AI API key configured.' };
}

// Models drift into markdown despite plain-text instructions. Every client
// parses "LABEL: value" at line starts, so strip decoration that would break
// that: **LABEL:** / **LABEL**: / *LABEL:* and leading bullet markers.
function normalizeModelText(text) {
  return String(text || '')
    .replace(/^([ \t]*)\*{1,2}([A-Z][A-Z\s\d]*?):\*{1,2}[ \t]*/gm, '$2: ')
    .replace(/^([ \t]*)\*{1,2}([A-Z][A-Z\s\d]*?)\*{1,2}:[ \t]*/gm, '$2: ')
    .replace(/^[-•][ \t]+(?=[A-Z][A-Z\s\d]*:)/gm, '');
}

const CONTACT_DAILY_LIMIT = 60; // anti-spam ceiling on contact submissions/day

async function handleContact(request, env, origin) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400, origin); }

  // Honeypot — bots fill hidden fields; real users leave it blank.
  if (body.website) return json({ ok: true }, 200, origin); // silently accept + drop

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 200);
  const subject = String(body.subject || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 5000);

  if (!name || !email || !subject || !message) {
    return json({ error: 'missing_fields', message: 'Please fill in every field.' }, 400, origin);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'bad_email', message: 'Please enter a valid email address.' }, 400, origin);
  }

  const day = new Date().toISOString().slice(0, 10);
  const countKey = 'contact:count:' + day;
  const count = parseInt((await env.RATE_LIMIT.get(countKey)) || '0', 10);
  if (count >= CONTACT_DAILY_LIMIT) {
    return json({ error: 'rate_limited', message: 'We\'re getting a lot of messages right now — please email us directly at tjlangston15@gmail.com.' }, 429, origin);
  }

  const record = { name, email, subject, message, at: new Date().toISOString() };
  const id = 'contact:' + record.at + ':' + Math.random().toString(36).slice(2, 8);
  // Keep submissions 90 days; read them with `wrangler kv key list`.
  await env.RATE_LIMIT.put(id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
  await env.RATE_LIMIT.put(countKey, String(count + 1), { expirationTtl: 60 * 60 * 48 });

  // Email delivery is optional — activates once RESEND_API_KEY is set as a
  // Worker secret (see ROADMAP.md). Until then, submissions are stored in KV.
  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY.trim() },
        body: JSON.stringify({
          from: 'CreatorNexusHQ <onboarding@resend.dev>',
          to: ['tjlangston15@gmail.com'],
          reply_to: email,
          subject: '[Contact] ' + subject,
          text: `From: ${name} <${email}>\n\n${message}`,
        }),
      });
    } catch (e) { console.log('resend error: ' + e); }
  }

  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // Contact form — no auth (visitors aren't signed in).
    if (url.pathname === '/contact' && request.method === 'POST') {
      return handleContact(request, env, origin);
    }

    if (url.pathname !== '/generate' || request.method !== 'POST') {
      return json({ error: 'not_found' }, 404, origin);
    }

    const authUser = await verifyFirebaseToken(request);
    if (!authUser) {
      return json({ error: 'unauthorized', message: 'Please sign in to use this tool.' }, 401, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400, origin);
    }

    const { tool, ...fields } = body || {};
    if (!TOOLS[tool]) {
      return json({ error: 'unknown_tool' }, 400, origin);
    }

    const isPro = await checkProGrant(env, authUser.email);
    let plan = isPro ? 'pro' : 'free';
    if (!isPro) {
      const onTrial = await checkTrial(env, authUser.uid);
      if (onTrial) plan = 'trial';
    }
    // Per-plan daily caps. Trial is generous but METERED — an unmetered
    // trial let one enthusiastic tester drain the site-wide budget and
    // lock everyone else out. Pro stays unmetered.
    const dailyLimit = plan === 'pro' ? null : plan === 'trial' ? TRIAL_DAILY_LIMIT : DAILY_FREE_LIMIT;
    const usage = await checkUsage(env, authUser.uid, dailyLimit);
    if (!usage.allowed) {
      if (usage.reason === 'global') {
        return json({ error: 'global_limit', message: "The beta has hit today's site-wide generation limit — it resets at midnight UTC. Thanks for stress-testing us!" }, 429, origin);
      }
      const msg = plan === 'trial'
        ? "You've hit today's trial limit of " + TRIAL_DAILY_LIMIT + " generations — it resets at midnight UTC."
        : "You've used all your free generations today. Upgrade to Pro for unlimited access!";
      return json({ error: 'daily_limit', message: msg }, 429, origin);
    }

    if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
      return json({ error: 'backend_not_configured', message: 'AI backend not yet configured — no AI API key set.' }, 500, origin);
    }

    // Real YouTube ranking data for the flagship tools. 'tag-suggester' is
    // YouTube-only by design; the others only fetch when platform=YouTube.
    if (YT_TOOLS[tool]) {
      const isYouTube = tool === 'tag-suggester' || /youtube/i.test(String(fields.platform || ''));
      if (isYouTube) {
        // An explicit target keyword is the best possible search query;
        // fall back to the tool's mapped field, then niche.
        const query = String(fields.keyword || fields[YT_TOOLS[tool]] || fields.niche || '').trim();
        const yt = await fetchYouTubeData(env, query);
        if (yt) fields.__yt = yt;
      }
    }

    const result = await callModel(env, tool, fields);
    if (result.error) {
      return json(result, 502, origin);
    }

    // Only spend a credit once generation actually succeeded.
    const remaining = await incrementUsage(env, usage, dailyLimit);
    const payload = { text: normalizeModelText(result.text), remaining, plan };
    // Ship the ranking data so the client can render "what's ranking now".
    if (fields.__yt) payload.ytData = fields.__yt;
    return json(payload, 200, origin);
  },
};
