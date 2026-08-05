// Candidate models for the benchmark. RULES:
//  - Only EXPLICIT, PINNED ids may end up in production routing (AI-ROUTING.md).
//    The `gemini-flash-latest` alias is benchmarked ONLY to record what it
//    currently resolves to and how it behaves — it is not a pinning candidate.
//  - The runner verifies every candidate against the provider's live model list
//    (--discover) BEFORE spending a single generation, and skips unknown ids
//    with a note instead of burning quota on guesses.
//  - Groq's vision lineup churns (both Llama 4 fallbacks in production are
//    retired). Vision candidates for Groq are intentionally EMPTY here: run
//    `node bench/run-bench.mjs --discover` and add what actually exists.

export const CANDIDATES = {
  text: [
    { provider: 'groq',   model: 'openai/gpt-oss-120b',      note: 'current production primary' },
    { provider: 'groq',   model: 'llama-3.3-70b-versatile',  note: 'fallback candidate — confirm via --discover' },
    { provider: 'gemini', model: 'gemini-flash-latest',      note: 'production alias — measured for the record, NOT pinnable' },
    { provider: 'gemini', model: 'gemini-2.5-flash',         note: 'pinned candidate — confirm exact id via --discover' },
  ],
  vision: [
    { provider: 'gemini', model: 'gemini-flash-latest',      note: 'current vision carrier — measured for the record, NOT pinnable' },
    { provider: 'gemini', model: 'gemini-2.5-flash',         note: 'pinned candidate — confirm exact id via --discover' },
    // groq: add ids from --discover output. Both hard-coded production
    // fallbacks (llama-4 maverick/scout) return 404 — do not re-add them.
  ],
};

export const PROVIDERS = {
  groq: {
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    keyEnv: 'GROQ_API_KEY',
  },
  gemini: {
    chatUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    keyEnv: 'GEMINI_API_KEY',
  },
};
