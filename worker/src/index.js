import { jwtVerify, createRemoteJWKSet } from 'jose';

const FIREBASE_PROJECT_ID = 'creatornexushq-eaf70';
const ALLOWED_ORIGIN = 'https://creatornexushq-eaf70.web.app';
const DAILY_FREE_LIMIT = 5;
// Free tier today; ANTHROPIC_MODEL/ANTHROPIC_API_KEY are reserved for a future
// paid tier once Stripe/plan-tracking exists (see ROADMAP.md).
const GROQ_MODEL = 'openai/gpt-oss-120b';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

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
    return payload.sub || null; // Firebase uid
  } catch {
    return null;
  }
}

// Read-only check — does NOT spend a credit. Call incrementUsage() only
// after a generation actually succeeds, so failed/errored attempts don't
// burn the user's daily allowance.
async function checkUsage(env, uid) {
  const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const key = `usage:${uid}:${day}`;
  const current = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10);
  return { allowed: current < DAILY_FREE_LIMIT, current, key };
}

async function incrementUsage(env, key, current) {
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 60 * 60 * 48 });
  return DAILY_FREE_LIMIT - (current + 1);
}

// ============================================================
// PROMPT TABLE — ported verbatim from the client-side prompts
// in index.html, creatornexushq-streaming.html,
// creatornexushq-analyze.html, and creatornexushq-thumbnail.html
// ============================================================

const INDEX_SYSTEM = `You are CreatorNexusHQ, an expert AI coach for content creators, streamers, and YouTubers. You specialize in helping small to mid-size creators grow their audience with practical, specific, and high-impact advice. Your tone is direct, energetic, and encouraging — like a knowledgeable friend who's also a successful creator. Always give concrete, actionable outputs. Format your responses clearly with labels like TITLE 1:, HOOK 1:, IDEA 1: etc so they're easy to parse. Never be generic. Always tailor to the specific content described.`;

const TOOLS = {
  // ---- index.html ----
  titles: {
    system: INDEX_SYSTEM,
    build: (f) => `Generate 5 scroll-stopping titles and 5 hooks for a ${f.platform || 'YouTube'} creator.

Video details:
- Content type: ${f.contentType}
- Description: ${f.description}
- Tone: ${f.tone}
- Video length: ${f.length}

Format exactly like this:
TITLE 1: [title]
TITLE 2: [title]
TITLE 3: [title]
TITLE 4: [title]
TITLE 5: [title]

HOOK 1: [hook - first 1-3 seconds spoken or on screen]
HOOK 2: [hook]
HOOK 3: [hook]
HOOK 4: [hook]
HOOK 5: [hook]

BEST COMBO: Title [X] + Hook [Y] — [one sentence explaining why]

Make them punchy, platform-native, and emotionally compelling. No generic clickbait.`,
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
    build: (f) => `Analyze these ${f.platform || 'YouTube'} tags/hashtags for a ${f.contentType} creator in the ${f.niche} niche with ${f.channelSize}.

VIDEO TITLE: ${f.title}
CURRENT TAGS: ${f.currentTags}

Analyze in these exact sections:
OVERALL SCORE: [X/100] — [one sentence verdict on the tag strategy]
STRONG TAGS: [which tags are working and why]
WEAK TAGS: [which tags to remove and why — too broad, too competitive, irrelevant]
MISSING TAGS: [specific tags they should be using but aren't]
COMPETITION LEVEL: [are these tags too competitive for their channel size?]
TAG STRATEGY: [short vs long tail balance, branded vs generic, niche vs broad]
OPTIMIZED TAG SET: [a complete replacement set of 10-15 tags/hashtags ready to copy and paste]
HASHTAG ORDER: [for platforms like TikTok/Instagram, the ideal order to place hashtags]
ONE BIG INSIGHT: [the single most important thing wrong with their current tag strategy]`,
  },

  // ---- creatornexushq-analyze.html (Tag Suggester — reads real YouTube data if the client supplied it) ----
  'tag-suggester': {
    system: `You are a YouTube SEO expert at CreatorNexusHQ. Give specific, actionable tag recommendations. Always consider channel size when recommending tags — smaller channels need more niche tags they can actually rank for.`,
    build: (f) => {
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
    system: `You are CreatorNexusHQ's AI thumbnail prompt specialist. You write highly detailed, optimized AI image generation prompts specifically for YouTube thumbnails. You know how to write prompts for Midjourney, DALL-E, Adobe Firefly, and other tools. Your prompts always include: composition details, lighting, color palette, mood, style references, aspect ratio (16:9 for thumbnails), and negative prompts to avoid bad results. Always make prompts specific to gaming/creator content. Write prompts that will generate thumbnail backgrounds and scenes — not final thumbnails with text overlay (text is added in Canva after).`,
    build: (f) => `Generate AI image prompts for a YouTube thumbnail.

Video details:
- Title: ${f.title || 'Not specified'}
- Niche: ${f.niche || 'Gaming / content creation'}
- Thumbnail style: ${f.style}
- Main subject: ${f.subject}
- Color scheme: ${f.colors}
- AI tool: ${f.tool}
- Target emotion: ${f.emotion}
- Specific elements: ${f.elements || 'None specified'}

Generate 3 prompts optimized for ${f.tool}. Format EXACTLY like this:

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
PRO TIP: [one specific tip for getting the best results in ${f.tool}]
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

async function callModel(env, tool, fields) {
  const def = TOOLS[tool];
  if (!def) return { error: 'unknown_tool' };

  const promptText = def.build(fields);

  if (def.isVision) {
    // gpt-oss-120b (the current free-tier model) is text-only. Vision tools
    // aren't wired to any client yet (creatornexushq-thumbnail.html isn't
    // pointed at this Worker), so this is a clear stub, not a silent gap.
    if (!fields.imageBase64 || !fields.imageType) {
      return { error: 'missing_image' };
    }
    return { error: 'vision_not_supported', detail: 'Image analysis needs a vision-capable model — not available on the current free-tier setup yet.' };
  }

  const apiKey = (env.GROQ_API_KEY || '').trim();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: def.system },
        { role: 'user', content: promptText },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.log('groq error: status=' + res.status + ' body=' + errBody.slice(0, 500));
    return { error: 'model_error', status: res.status, detail: errBody };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/generate' || request.method !== 'POST') {
      return json({ error: 'not_found' }, 404, origin);
    }

    const uid = await verifyFirebaseToken(request);
    if (!uid) {
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

    const usage = await checkUsage(env, uid);
    if (!usage.allowed) {
      return json({ error: 'daily_limit', message: "You've used all your free generations today. Upgrade to Pro for unlimited access!" }, 429, origin);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'backend_not_configured', message: 'AI backend not yet configured — no Groq API key set.' }, 500, origin);
    }

    const result = await callModel(env, tool, fields);
    if (result.error) {
      return json(result, 502, origin);
    }

    // Only spend a credit once generation actually succeeded.
    const remaining = await incrementUsage(env, usage.key, usage.current);
    return json({ text: result.text, remaining }, 200, origin);
  },
};
