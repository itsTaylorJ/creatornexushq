# Model benchmark harness (Stage 1, AI-ROUTING.md)

Benchmarks candidate AI models against a golden set built from the Worker's
**real production prompts** — `worker/src/index.js` is evaluated directly, so
the harness can never drift out of sync with what production sends.

## What it measures (deterministically)

- **Schema validity** — every ALL-CAPS label the client parsers depend on,
  including the load-bearing `FIX FIRST:` word and markdown-drift detection.
- **Latency** and total tokens per generation.
- **Repeatability** — same input N times; for `analyze-title` it records the
  spread of the model-invented score across repeats (the evidence for moving
  to deterministic scoring).
- **Graceful failure** — an invalid image file must produce a recorded error,
  never a crash.

**Usefulness is reviewed by a human.** Every raw response is saved to
`results/<timestamp>/transcripts/`. The harness never asks a model to grade a
model.

## Running it

```
node bench/run-bench.mjs --dry        # validate the harness — zero API calls
node bench/run-bench.mjs --discover   # list live model ids per provider (needs keys)
node bench/run-bench.mjs              # full text run
node bench/run-bench.mjs --vision     # include vision cases
node bench/run-bench.mjs --task=titles --repeats=3
```

Keys come from `GROQ_API_KEY` / `GEMINI_API_KEY` environment variables (the
same values as the Worker secrets). **Never commit them.** PowerShell:

```
$env:GROQ_API_KEY = "..."; $env:GEMINI_API_KEY = "..."
node bench/run-bench.mjs --dry
```

## Quota reality — read before a full run

Calls bypass the Worker (no KV allowance is touched) but spend the **same
provider free tier production shares**: Groq ~200K tokens/day, Gemini 250
requests/day (which is also production's text fallback AND vision pool).

A default full text run is: 6 text cases x 4 candidates x 2 repeats = up to
48 calls (~115K Groq tokens if all Groq candidates run). Run it at a quiet
time, and keep `--vision` runs small — every Gemini vision call comes out of
the same 250 RPD production leans on.

## Rules

- Only **explicit pinned ids** may be promoted to production routing.
  `gemini-flash-latest` is benchmarked to record what the alias currently
  does — it is not a pinning candidate.
- The runner checks every candidate against the provider's live model list
  first and skips ids that don't exist, so a guessed id can't burn quota.
- Groq vision candidates are deliberately empty in `models.mjs` (the two
  hard-coded production fallbacks are retired). Run `--discover`, then add
  what actually exists.
- Record the selected models, dates, measured results and cost assumptions in
  `AI-ROUTING.md` before inviting more testers.
