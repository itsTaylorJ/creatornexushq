// Loads the REAL prompt builders out of worker/src/index.js instead of keeping
// a copy. A stale duplicated parser in a live-test script once reported a
// failure that no longer existed (see CLAUDE.md, Testing patterns) — so the
// harness evaluates the actual Worker source, minus its import and its fetch
// handler, and pulls TOOLS / normalizeModelText / the model constants out.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, '..', 'worker', 'src', 'index.js');

export function loadWorkerInternals() {
  let src = readFileSync(srcPath, 'utf8');
  const cut = src.indexOf('export default');
  if (cut < 0) throw new Error('worker source changed: "export default" not found');
  src = src.slice(0, cut);
  src = src.replace(/^import[^\n]*\n/, ''); // strip the jose import
  src += '\n;__benchExports({ TOOLS, PLATFORM_RULES, platformKey, normalizeModelText, '
       + 'GROQ_MODEL, GEMINI_MODEL, GROQ_VISION_MODELS, GEMINI_OPENAI_URL });';

  let out = null;
  const sandbox = {
    console,
    URL,
    setTimeout,
    // The worker's network/auth machinery must never run during load. Chat
    // calls in the benchmark go through the runner's own HTTP, not these.
    fetch: () => { throw new Error('worker code must not fetch during bench load'); },
    jwtVerify: () => { throw new Error('jwtVerify is stubbed in the bench'); },
    createRemoteJWKSet: () => null,
    Response: class {},
    __benchExports: (x) => { out = x; },
  };
  vm.createContext(sandbox);
  new vm.Script(src, { filename: 'worker-index-transformed.js' }).runInContext(sandbox);
  if (!out || !out.TOOLS) throw new Error('bench load produced no TOOLS — worker source layout changed');
  return out;
}
