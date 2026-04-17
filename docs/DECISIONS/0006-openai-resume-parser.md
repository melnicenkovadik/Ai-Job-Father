# ADR 0006 — OpenAI GPT-5.1 for resume parsing (supersedes Anthropic choice in main plan)

- **Status:** Accepted
- **Date:** 2026-04-17
- **Supersedes:** the reference to "Claude Sonnet 4.5" for resume parse in
  `~/.claude/plans/effervescent-wibbling-breeze.md` §Resume parse. The plan's
  data contract and `ResumeParser` port are unchanged — only the concrete
  provider changes.

## Context

Phase 2 ships a PDF → structured-profile flow:
1. User uploads a PDF CV via the Mini App.
2. Server extracts text (pure-JS via `unpdf`).
3. An LLM returns structured JSON matching the `ParsedResume` shape.
4. User reviews the fields, edits, and saves.

The original plan picked Anthropic Claude Sonnet 4.5 because the author was
already on the Anthropic stack for authoring. Before wiring the adapter, the
product owner requested we evaluate OpenAI on cost grounds.

### Provider comparison (Jan 2026)

| Model | Input $/M | Output $/M | Per-resume cost¹ | Notes |
|---|---|---|---|---|
| GPT-5.1 | ~$2 | ~$10 | ~$0.015 | Current frontier OpenAI; supports Structured Outputs (strict JSON schema) |
| GPT-4o | ~$2.5 | ~$10 | ~$0.015 | Older; similar price, slightly weaker on multilingual structure |
| GPT-4o-mini | ~$0.15 | ~$0.60 | ~$0.001 | 20× cheaper but visibly weaker on 5-locale CVs |
| Claude Sonnet 4.5 | $3 | $15 | ~$0.021 | Per the original plan; stronger long-context, but pricier |

¹ Assumes ~2 k input + ~1 k output tokens per CV after unpdf text extraction.

The MVP serves users in 5 locales (en / uk / ru / it / pl); multilingual
fidelity is a hard requirement, which rules out `gpt-4o-mini` as the
primary model. Between the remaining three, GPT-5.1 is the cheapest frontier
option at the time of decision and the SDK ships first-class
`chat.completions.parse()` + `zodResponseFormat()` ergonomics that bind the
Zod schema directly to a strict JSON-schema response format.

## Decision

**Use OpenAI `gpt-5.1` via `@ai-job-bot/web`'s `apps/web/lib/openai/resume-parser.ts`
adapter as the only production `ResumeParser` implementation.** Strict
Structured Outputs with a Zod schema guard the wire contract on both ends;
the core domain stays framework-free.

- Model id lives in `OPENAI_RESUME_MODEL` env (default `gpt-5.1`) to allow
  cheap per-deployment overrides without a code deploy.
- The adapter is serverless-safe: `unpdf` is pure-JS, no native deps; the
  OpenAI SDK is HTTP-only.
- Missing `OPENAI_API_KEY` → the factory returns a stub parser that throws
  `ResumeParserUnavailableError`, so preview / dev environments without the
  key render a "fill manually" CTA instead of a generic 500.
- Scanned / image-only PDFs (text < 200 chars after unpdf) raise
  `ResumeFormatError`. OCR fallback via the OpenAI Files API is **out of
  scope for Phase 2** — revisit when we have telemetry showing non-trivial
  scanned-CV upload rates.

## Consequences

**Positive**
- ~30 % cheaper per resume than Claude Sonnet 4.5 (~$0.015 vs ~$0.021).
- Zod schema + `zodResponseFormat` removes a whole class of "model returned
  almost-valid JSON" bugs — invalid payload fails at SDK parse time.
- Single-provider AI surface for Phase 2 keeps the threat model simple
  (one API key, one rate-limit domain, one vendor status page).

**Negative**
- We're locked to OpenAI for as long as Phase 2 ships without an abstraction
  above the port. Migrating back to Anthropic or cross-to-Gemini requires
  writing a second adapter (~an afternoon) — acceptable because the
  `ResumeParser` port was designed to be swappable from day one.
- `gpt-5.1` is new enough that field-quality data on structured extraction
  in Ukrainian / Italian is thin; we track user edit-rate post-parse as a
  quality signal and can demote to `gpt-4o` or add a second-pass validator
  if edits exceed a threshold (e.g. > 40 % of fields).

**Neutral**
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` remain wired through
  `apps/web/lib/env.ts` as optional vars. No adapter consumes them today —
  they stay for the "easy rollback" option.

## Alternatives considered

1. **Stay with Claude Sonnet 4.5 (original plan).** Slightly better on
   long-context multilingual CVs but ~30 % more per parse and requires a
   separate SDK. Rejected on cost.
2. **Start with GPT-4o-mini for 20× savings.** Rejected: visible quality
   gap on non-English CVs per public benchmarks, and MVP users skew toward
   RU / UK / IT, where mini drops fields more often. Would force adding an
   edit-heavy review step. Revisit post-MVP as a per-user "draft" mode.
3. **Multi-provider with runtime routing.** Adds deployment surface
   (two API keys, two rate-limit schemes) for no MVP-scale benefit.
   Rejected until we have data justifying the complexity.
4. **Self-hosted open model (Llama-3, Qwen).** Cheapest at scale but adds
   GPU infra + eval harness. Out of scope; not serverless-friendly on the
   Vercel runtime the app is deployed to.

## Reference

- Adapter: [`apps/web/lib/openai/resume-parser.ts`](../../apps/web/lib/openai/resume-parser.ts)
- Port:    [`packages/core/src/application/ports/resume-parser.ts`](../../packages/core/src/application/ports/resume-parser.ts)
- Use case: [`packages/core/src/application/parse-resume.ts`](../../packages/core/src/application/parse-resume.ts)
- Env:     `OPENAI_API_KEY`, `OPENAI_RESUME_MODEL` (default `gpt-5.1`)
