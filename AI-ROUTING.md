# CreatorNexusHQ — AI Routing and Quality Plan

**Status:** required pre-beta hardening. Model selection is not final until the benchmark is run.

## Known current risk

The Worker currently uses Groq `openai/gpt-oss-120b` for text with Gemini fallback, and Gemini for vision with Groq Llama 4 fallback entries. The Groq Llama 4 Maverick and Scout fallback models are retired and must not remain in a production fallback chain.

The `gemini-flash-latest` alias is also mutable. Production routing must use explicit, supported model identifiers after compatibility testing.

## Approved routing approach

Use **task-based, pinned models selected by a benchmark**, with a tested fallback for every task. Do not choose a provider globally based on reputation alone, and do not use a multi-agent generation swarm.

| Task | Requirements | Quality rule |
|---|---|---|
| Creative generation | Helpful, specific, platform-aware output | Evaluate against a curated prompt set and human review rubric |
| Analyze/improve | Stable score + helpful explanation | Deterministic score first; AI explains and improves |
| Vision/thumbnail review | Robust image reasoning | Test real thumbnails, invalid files, and provider fallback |
| Insight/review | Facts come from saved creator data | Compute figures in code; AI may summarize only supplied facts |

## Response contract

- Use structured, validated responses for every new or redesigned endpoint.
- The server must validate required fields and recover or fail clearly if the model returns malformed output.
- Keep model output separate from deterministic calculations.
- Preserve the exact input context and result version needed to explain a saved score later.
- A failed provider response must not consume a creator allowance.

## Benchmark before rollout

Create a small “golden set” for each tool: realistic niche/context, expected response shape, bad/partial input, selected platforms, and unacceptable output examples. Test primary and fallback for output usefulness, schema validity, latency, repeatability, graceful provider failure, and allowance behavior.

Record the selected models, dates, measured results, and cost/limit assumptions in this file before inviting additional beta users.

## Beta and future entitlements

Current private-beta access remains owner-granted. Do not display payment, checkout, or tiers until the owner authorizes launch work.

The future direction is daily per-tool allowances with one free regeneration, and a middle tier target of five generations per tool per day. Final prices and allowances must be modeled against real benchmarked token/vision cost, provider limits, and a safety margin before implementation.
