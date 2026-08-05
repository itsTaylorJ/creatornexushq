// The golden set per AI-ROUTING.md: realistic niche/context, bad/partial
// input, selected platforms, and deterministic "unacceptable output" checks.
// One case = one realistic creator scenario fed to a REAL production prompt
// (built by the Worker's own TOOLS table — never a copy).
//
// checks are DETERMINISTIC. Output usefulness is deliberately left to human
// review of the saved transcripts — the harness never asks a model to grade a
// model. Each check returns { pass, note }.

const label = (name) => (text) => ({
  pass: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':', 'm').test(text),
  note: name,
});

// Every listed label must open a line, exactly ALL-CAPS, colon after.
function requiredLabels(names) {
  return names.map((n) => ({ id: 'label:' + n, run: label(n) }));
}

// Markdown drift at line starts is what breaks every client parser.
const noMarkdownLabels = {
  id: 'no-markdown-labels',
  run: (text) => ({
    pass: !/^[ \t]*\*{1,2}[A-Z][A-Z\s\d]*?:?\*{0,2}:/m.test(text),
    note: 'labels must not be wrapped in ** or *',
  }),
};

const numbered = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

function extract(text, name) {
  const m = text.match(new RegExp('^' + name + ':\\s*(.*)$', 'm'));
  return m ? m[1].trim() : '';
}
function extractAll(text, prefix, n) {
  return numbered(prefix, n).map((l) => extract(text, l)).filter(Boolean);
}

export const GOLDEN = [
  // ---------------- Creative generation (titles) ----------------
  {
    task: 'titles',
    name: 'yt-tcg-booster-box',
    kind: 'text',
    fields: {
      platform: 'YouTube',
      contentType: 'Pack opening',
      description: 'Opening a full Pokemon 151 booster box on camera, chasing the Charizard ex special illustration rare. I rate every pack pull honestly and total up the box value against what I paid at the end.',
      keyword: 'pokemon 151 booster box',
      tone: 'Excited but honest',
      length: '12-15 minutes',
    },
    checks: [
      ...requiredLabels([...numbered('TITLE', 5), ...numbered('HOOK', 5),
        'BEST COMBO', 'SUGGESTED HASHTAGS', 'SUGGESTED TAGS', 'SHORT DESCRIPTION', 'FULL DESCRIPTION']),
      noMarkdownLabels,
      {
        id: 'titles-max-60ish',
        run: (t) => {
          const lens = extractAll(t, 'TITLE', 5).map((s) => s.length);
          const over = lens.filter((l) => l > 70).length;
          return { pass: over === 0, note: 'title lengths: ' + lens.join(', ') };
        },
      },
      {
        id: 'titles-not-quoted',
        run: (t) => ({
          pass: extractAll(t, 'TITLE', 5).every((s) => !/^["“].*["”]$/.test(s)),
          note: 'no title wrapped in quotation marks',
        }),
      },
      {
        id: 'hashtags-2-3',
        run: (t) => {
          const n = (extract(t, 'SUGGESTED HASHTAGS').match(/#[\w\d_]+/g) || []).length;
          return { pass: n >= 2 && n <= 3, note: n + ' hashtags (want 2-3)' };
        },
      },
      {
        id: 'full-description-length',
        run: (t) => {
          const seg = t.split(/^FULL DESCRIPTION:/m)[1] || '';
          const words = seg.trim().split(/\s+/).filter(Boolean).length;
          return { pass: words >= 140, note: words + ' words (prompt asks 170+, warn under 140)' };
        },
      },
    ],
  },
  {
    task: 'titles',
    name: 'tiktok-fitness-caption',
    kind: 'text',
    fields: {
      platform: 'TikTok',
      contentType: 'Short / Reel',
      description: 'A 45 second clip showing the one hip mobility stretch that fixed my squat depth after years of desk work, with a before/after comparison.',
      keyword: '',
      tone: 'Direct and motivating',
      length: 'under 60 seconds',
    },
    checks: [
      ...requiredLabels([...numbered('CAPTION', 5), ...numbered('HOOK', 5), 'BEST COMBO', 'EXTRA HASHTAGS']),
      noMarkdownLabels,
      {
        id: 'captions-under-150',
        run: (t) => {
          const lens = extractAll(t, 'CAPTION', 5).map((s) => s.length);
          return { pass: lens.every((l) => l <= 165), note: 'caption lengths: ' + lens.join(', ') };
        },
      },
      {
        id: 'captions-carry-hashtags',
        run: (t) => {
          const withTags = extractAll(t, 'CAPTION', 5).filter((s) => /#[\w\d_]+/.test(s)).length;
          return { pass: withTags >= 4, note: withTags + '/5 captions have baked hashtags' };
        },
      },
    ],
  },
  {
    task: 'titles',
    name: 'partial-input-minimal',
    kind: 'text',
    // Bad/partial input: near-empty context. The contract must still hold —
    // graceful degradation means valid labels, not a lecture about missing fields.
    fields: { platform: 'YouTube', contentType: '', description: 'a video about my cat', keyword: '', tone: '', length: '' },
    checks: [
      ...requiredLabels([...numbered('TITLE', 5), ...numbered('HOOK', 5), 'BEST COMBO']),
      noMarkdownLabels,
    ],
  },

  // ---------------- Analyze/improve (analyze-title) ----------------
  // AI-ROUTING requires a STABLE score. The current production prompt asks the
  // model to invent one — this case exists to measure exactly how unstable that
  // is across repeats, as evidence for the deterministic-score redesign.
  {
    task: 'analyze-title',
    name: 'analyze-mid-title',
    kind: 'text',
    fields: {
      platform: 'YouTube',
      contentType: 'TCG / collectibles',
      audience: 'Pokemon collectors aged 18-35',
      title: 'I Opened 36 Packs of Pokemon 151... Was It Worth It?',
      desc: 'Opening a booster box of Pokemon 151. Watch to see if I pull the Charizard. Like and subscribe for more pack openings.',
    },
    checks: [
      ...requiredLabels(['SCORE', 'TITLE STRENGTHS', 'TITLE WEAKNESSES', 'IMPROVED TITLE 1',
        'IMPROVED TITLE 2', 'IMPROVED TITLE 3', 'DESCRIPTION FEEDBACK', 'IMPROVED DESCRIPTION',
        'KEYWORDS MISSING', 'ONE BIG TIP']),
      noMarkdownLabels,
      {
        id: 'score-parseable',
        run: (t) => {
          const m = extract(t, 'SCORE').match(/(\d{1,3})\s*\/\s*100/);
          return { pass: !!m, note: m ? 'score ' + m[1] + '/100' : 'SCORE not in X/100 form' };
        },
        // The runner also diffs this number across repeats (see repeatMetric).
      },
    ],
    repeatMetric: (t) => {
      const m = extract(t, 'SCORE').match(/(\d{1,3})\s*\/\s*100/);
      return m ? Number(m[1]) : null;
    },
  },

  // ---------------- Insight/review (weekly-review) ----------------
  // Facts arrive precomputed; the model may only interpret. The harness feeds a
  // deliberately thin week — the honest response is to say so, not invent.
  {
    task: 'weekly-review',
    name: 'thin-first-week',
    kind: 'text',
    fields: {
      goal: 'Twice a week',
      shippedCount: 1,
      streak: 1,
      niche: 'TCG / collectibles',
      weeksOfHistory: 1,
      shipped: '- "Opening the new Prismatic Evolutions ETB" (YouTube)',
      scoreLine: '',
      viewsLine: '',
      missingOutcomes: 1,
    },
    checks: [
      ...requiredLabels(['HEADLINE', 'WHAT WORKED', 'ONE THING TO CHANGE', 'NEXT WEEK']),
      noMarkdownLabels,
      {
        id: 'headline-no-exclamation',
        run: (t) => ({ pass: !extract(t, 'HEADLINE').includes('!'), note: 'prompt forbids exclamation marks' }),
      },
      {
        id: 'no-invented-numbers',
        run: (t) => {
          // Only 1 (shipped/streak/goal-adjacent) should appear; any other
          // standalone figure is suspect. Loose heuristic: flag numbers >= 10.
          const nums = (t.match(/\b\d{2,}\b/g) || []).filter((n) => !['10', '15'].includes(n));
          return { pass: nums.length === 0, note: nums.length ? 'suspect figures: ' + nums.join(', ') : 'no invented figures' };
        },
      },
    ],
  },

  // ---------------- Routing payoff (channel-audit FIX FIRST) ----------------
  {
    task: 'channel-audit',
    name: 'audit-small-yt',
    kind: 'text',
    fields: {
      platform: 'YouTube', niche: 'TCG / collectibles', period: 'last 28 days',
      subs: '4200', views: '18500', newSubs: '120', avgViews: '1400',
      retention: '38% average viewed', frequency: '2 per week',
      top: 'A 41k-view video opening a vintage booster pack',
      challenge: 'Views collapsed after one video did 41k and nothing since has passed 2k',
    },
    checks: [
      ...requiredLabels(['DIAGNOSIS', 'THE BOTTLENECK', "WHY IT'S THE BOTTLENECK", "WHAT'S WORKING",
        'BENCHMARK', 'DO THIS WEEK 1', 'DO THIS WEEK 2', 'DO THIS WEEK 3', 'METRIC TO WATCH',
        'FIX FIRST', 'WHY THAT TOOL']),
      noMarkdownLabels,
      {
        id: 'fix-first-machine-readable',
        run: (t) => {
          const v = extract(t, 'FIX FIRST');
          const ok = ['TITLES', 'TAGS', 'THUMBNAILS', 'IDEAS', 'SCHEDULE', 'LIVE'].includes(v);
          return { pass: ok, note: 'FIX FIRST = "' + v + '" (load-bearing: the routing button needs one exact word)' };
        },
      },
    ],
  },

  // ---------------- Vision (thumbnail-analyze) ----------------
  {
    task: 'thumbnail-analyze',
    name: 'vision-synthetic-thumb',
    kind: 'vision',
    fields: {
      platform: 'YouTube', contentType: 'Pack opening',
      title: 'I Opened 36 Packs of Pokemon 151', channelSize: '1k-10k subscribers',
      emotion: 'Curiosity',
      // imageBase64 / imageType injected by the runner from fixtures.mjs
    },
    checks: [
      ...requiredLabels(['OVERALL SCORE', 'CLICK THROUGH POTENTIAL', 'TEXT READABILITY',
        'VISUAL CLARITY', 'EMOTIONAL IMPACT', 'COLOR & CONTRAST', "WHAT'S WORKING", 'WHAT TO FIX',
        'IMPROVEMENT 1', 'IMPROVEMENT 2', 'IMPROVEMENT 3', 'MOBILE CHECK', 'COMPETITOR EDGE']),
      noMarkdownLabels,
    ],
  },
  {
    task: 'thumbnail-analyze',
    name: 'vision-invalid-file',
    kind: 'vision-invalid',
    // Not-an-image bytes. The pass condition is a GRACEFUL provider error —
    // recorded, never thrown. Handled specially by the runner.
    fields: {
      platform: 'YouTube', contentType: 'Pack opening',
      title: 'test', channelSize: '1k-10k subscribers', emotion: 'Curiosity',
    },
    checks: [],
  },
];
