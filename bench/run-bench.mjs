// CreatorNexusHQ model benchmark (Stage 1 of IMPLEMENTATION-PLAN.md).
//
//   node bench/run-bench.mjs --dry              validate harness, zero API calls
//   node bench/run-bench.mjs --discover         list live model ids per provider
//   node bench/run-bench.mjs                    full text run (needs keys in env)
//   node bench/run-bench.mjs --vision           include vision cases
//   node bench/run-bench.mjs --task=titles      one task only
//   node bench/run-bench.mjs --repeats=3        default 2
//
// Keys come from GROQ_API_KEY / GEMINI_API_KEY environment variables — the
// same keys the Worker uses. NEVER commit them. Calls go straight to the
// providers (the Worker and its KV allowances are not involved), but they DO
// spend the same provider free tier production shares — run at a quiet time.
//
// The harness measures what can be measured (schema validity, latency,
// repeatability, graceful failure) and SAVES every transcript for the human
// usefulness review. It never asks a model to grade a model.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkerInternals } from './worker-source.mjs';
import { GOLDEN } from './golden-set.mjs';
import { CANDIDATES, PROVIDERS } from './models.mjs';
import { makeTestPng, makeInvalidImageBase64 } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const REPEATS = Math.max(1, parseInt(args.repeats || '2', 10) || 2);
const W = loadWorkerInternals();

// ---------- provider plumbing ----------
function keyFor(provider) {
  return (process.env[PROVIDERS[provider].keyEnv] || '').trim();
}

async function listModels(provider) {
  const key = keyFor(provider);
  if (!key) return { error: 'no ' + PROVIDERS[provider].keyEnv + ' in env' };
  try {
    const res = await fetch(PROVIDERS[provider].modelsUrl, {
      headers: { Authorization: 'Bearer ' + key },
    });
    if (!res.ok) return { error: 'HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200) };
    const data = await res.json();
    return { ids: (data.data || []).map((m) => String(m.id).replace(/^models\//, '')).sort() };
  } catch (e) {
    return { error: String(e) };
  }
}

async function callChat(provider, model, system, userContent) {
  const key = keyFor(provider);
  if (!key) return { error: 'no key', status: 0 };
  const started = Date.now();
  try {
    const res = await fetch(PROVIDERS[provider].chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        max_tokens: 3000, // mirror production: reasoning tokens bill against this
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
      }),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { error: 'http', status: res.status, latencyMs, detail: (await res.text()).slice(0, 300) };
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};
    if (!text) return { error: 'empty', status: 200, latencyMs };
    return { text, latencyMs, tokens: usage.total_tokens ?? null };
  } catch (e) {
    return { error: 'network', status: 0, latencyMs: Date.now() - started, detail: String(e) };
  }
}

// ---------- case execution ----------
function buildUserContent(kase) {
  const def = W.TOOLS[kase.task];
  if (!def) throw new Error('unknown task in golden set: ' + kase.task);
  const fields = { ...kase.fields };
  if (kase.kind === 'vision') {
    fields.imageBase64 = makeTestPng().toString('base64');
    fields.imageType = 'image/png';
  }
  if (kase.kind === 'vision-invalid') {
    fields.imageBase64 = makeInvalidImageBase64();
    fields.imageType = 'image/png';
  }
  const promptText = def.build(fields);
  if (kase.kind === 'vision' || kase.kind === 'vision-invalid') {
    return {
      system: def.system,
      user: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: 'data:' + fields.imageType + ';base64,' + fields.imageBase64 } },
      ],
    };
  }
  return { system: def.system, user: promptText };
}

function runChecks(kase, rawText) {
  const text = W.normalizeModelText(rawText); // exactly what production shows clients
  return kase.checks.map((c) => {
    try {
      const r = c.run(text);
      return { id: c.id, pass: !!r.pass, note: r.note };
    } catch (e) {
      return { id: c.id, pass: false, note: 'check threw: ' + e };
    }
  });
}

async function runCase(kase, cand, outDir) {
  const { system, user } = buildUserContent(kase);
  const runs = [];
  for (let i = 0; i < REPEATS; i++) {
    const r = await callChat(cand.provider, cand.model, system, user);
    if (kase.kind === 'vision-invalid') {
      // Success here means a GRACEFUL, non-throwing outcome either way.
      runs.push({
        graceful: true,
        outcome: r.error ? 'provider error ' + (r.status || 0) : 'model answered anyway',
        latencyMs: r.latencyMs,
      });
      continue;
    }
    if (r.error) {
      runs.push({ error: r.error, status: r.status, detail: r.detail, latencyMs: r.latencyMs });
      continue;
    }
    const checks = runChecks(kase, r.text);
    const run = {
      latencyMs: r.latencyMs,
      tokens: r.tokens,
      checksPassed: checks.filter((c) => c.pass).length,
      checksTotal: checks.length,
      failed: checks.filter((c) => !c.pass),
    };
    if (kase.repeatMetric) run.metric = kase.repeatMetric(W.normalizeModelText(r.text));
    runs.push(run);
    const fname = [kase.task, kase.name, cand.provider, cand.model.replace(/[^\w.-]+/g, '_'), 'r' + (i + 1)].join('__') + '.txt';
    writeFileSync(join(outDir, 'transcripts', fname), r.text, 'utf8');
  }
  const metrics = runs.map((r) => r.metric).filter((m) => m != null);
  return {
    task: kase.task, case: kase.name, provider: cand.provider, model: cand.model,
    runs,
    metricSpread: metrics.length >= 2 ? Math.max(...metrics) - Math.min(...metrics) : null,
  };
}

// ---------- modes ----------
async function discover() {
  for (const provider of Object.keys(PROVIDERS)) {
    const r = await listModels(provider);
    console.log('\n=== ' + provider + ' live models ===');
    if (r.error) { console.log('  (' + r.error + ')'); continue; }
    r.ids.forEach((id) => console.log('  ' + id));
    for (const lane of ['text', 'vision']) {
      for (const c of CANDIDATES[lane].filter((c) => c.provider === provider)) {
        console.log('  candidate [' + lane + '] ' + c.model + ' -> ' + (r.ids.includes(c.model) ? 'LIVE' : 'NOT FOUND'));
      }
    }
  }
  console.log('\nProduction ids for reference: text=' + W.GROQ_MODEL + ' / ' + W.GEMINI_MODEL
    + ' | groq vision fallbacks=' + W.GROQ_VISION_MODELS.join(', '));
}

function dryRun() {
  let problems = 0;
  for (const kase of GOLDEN) {
    try {
      const { system, user } = buildUserContent(kase);
      const promptLen = typeof user === 'string' ? user.length : user[0].text.length;
      if (!system || !promptLen) throw new Error('empty prompt');
      // Checks must at least run against an empty string without throwing.
      for (const c of kase.checks) c.run('');
      console.log('ok  ' + kase.task + ' / ' + kase.name + '  (prompt ' + promptLen + ' chars, ' + kase.checks.length + ' checks)');
    } catch (e) {
      problems++;
      console.log('FAIL ' + kase.task + ' / ' + kase.name + ': ' + e.message);
    }
  }
  console.log(problems ? '\n' + problems + ' case(s) broken.' : '\nDry run clean — harness is runnable.');
  process.exitCode = problems ? 1 : 0;
}

async function fullRun() {
  const wantTask = args.task && args.task !== true ? String(args.task) : null;
  const includeVision = !!args.vision;
  const cases = GOLDEN.filter((k) =>
    (!wantTask || k.task === wantTask) &&
    (includeVision || (k.kind !== 'vision' && k.kind !== 'vision-invalid')));
  if (!cases.length) { console.log('No cases match.'); return; }

  // Never spend quota on a model id the provider doesn't currently serve.
  const live = {};
  for (const provider of Object.keys(PROVIDERS)) {
    if (keyFor(provider)) live[provider] = await listModels(provider);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(here, 'results', stamp);
  mkdirSync(join(outDir, 'transcripts'), { recursive: true });

  const results = [];
  for (const kase of cases) {
    const lane = kase.kind === 'text' ? 'text' : 'vision';
    for (const cand of CANDIDATES[lane]) {
      const l = live[cand.provider];
      if (!l) { results.push({ ...cand, task: kase.task, case: kase.name, skipped: 'no key' }); continue; }
      if (l.ids && !l.ids.includes(cand.model)) {
        results.push({ ...cand, task: kase.task, case: kase.name, skipped: 'model not in live list' });
        continue;
      }
      console.log('running ' + kase.task + '/' + kase.name + ' on ' + cand.provider + ':' + cand.model + ' x' + REPEATS);
      results.push(await runCase(kase, cand, outDir));
    }
  }

  writeFileSync(join(outDir, 'results.json'), JSON.stringify({
    at: new Date().toISOString(), repeats: REPEATS,
    production: { text: [W.GROQ_MODEL, W.GEMINI_MODEL], groqVisionFallbacks: W.GROQ_VISION_MODELS },
    results,
  }, null, 2), 'utf8');

  // Compact human summary.
  const lines = ['# Bench summary — ' + stamp, ''];
  for (const r of results) {
    if (r.skipped) { lines.push('- SKIP ' + r.task + '/' + (r.case || '') + ' ' + r.provider + ':' + r.model + ' — ' + r.skipped); continue; }
    const ok = r.runs.filter((x) => !x.error).length;
    const lat = r.runs.filter((x) => x.latencyMs).map((x) => x.latencyMs);
    const avgLat = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
    const checks = r.runs.filter((x) => x.checksTotal != null)
      .map((x) => x.checksPassed + '/' + x.checksTotal).join(', ');
    lines.push('- ' + r.task + '/' + r.case + ' ' + r.provider + ':' + r.model
      + ' — ' + ok + '/' + r.runs.length + ' ok, avg ' + avgLat + 'ms'
      + (checks ? ', checks ' + checks : '')
      + (r.metricSpread != null ? ', score spread across repeats: ' + r.metricSpread : ''));
    for (const run of r.runs) {
      for (const f of run.failed || []) lines.push('    - FAILED ' + f.id + ': ' + f.note);
      if (run.error) lines.push('    - ERROR ' + run.error + ' status=' + run.status + ' ' + (run.detail || ''));
      if (run.graceful) lines.push('    - invalid-file outcome: ' + run.outcome);
    }
  }
  lines.push('', 'Transcripts for the human usefulness review are in transcripts/.',
    'Record pinned choices + dates + these numbers in AI-ROUTING.md before inviting testers.');
  writeFileSync(join(outDir, 'SUMMARY.md'), lines.join('\n'), 'utf8');
  console.log('\nWrote ' + join(outDir, 'SUMMARY.md'));
}

if (args.discover) await discover();
else if (args.dry) dryRun();
else await fullRun();
