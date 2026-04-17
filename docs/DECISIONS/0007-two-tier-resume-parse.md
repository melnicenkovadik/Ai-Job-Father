# ADR 0007 — Two-tier resume parsing: heuristic free-tier + OpenAI paid-tier

- **Status:** Accepted (schedule-amended 2026-04-17 evening)
- **Date:** 2026-04-17
- **Supersedes in part:** ADR 0006 (single-provider OpenAI adapter as the
  only implementation). OpenAI remains the paid-tier adapter; heuristics
  take over the default path.

## 2026-04-17 schedule amendment

Live test on a real 3-page technical CV ("Company | Role" headers,
"Professional Summary" block, colon-prefixed skill categories) filled
only **2 of 12 fields** via the heuristic pipeline. Root cause:
`unpdf` collapses the layout enough that the section-split dictionary
mostly misses, and the contact regex is the only thing that survives.

We want users to hit a profile draft that's 70-80 % populated from the
first upload, not 15 %. So until the Phase-4 Stars paywall ships, the
**primary parser in production is OpenAI gpt-5.1** — free of charge,
driven by the `OPENAI_API_KEY` that's already deployed.

What doesn't change:
- Both adapters remain behind the same `ResumeParser` port.
- Heuristic pipeline stays in-repo and runs as the automatic fallback
  when the OpenAI call returns `ResumeParserUnavailableError`
  (missing key / 401 / 403).
- Phase 4 still introduces the Stars gate: the AI-tier endpoint will
  require a paid receipt; free-tier users fall back to the heuristic
  parser (which will keep getting hardened with every real-world layout
  we collect).

What does change:
- The original plan ("free heuristic from day one, AI paid from Phase 4")
  becomes **"AI free until Phase 4, then paid; heuristic is the fallback
  until its quality matches"**.
- Unit-economics impact: one OpenAI call per upload × MVP traffic.
  At ~$0.015 per resume and the expected Phase-2 volume, the cost is
  negligible compared to the conversion improvement.

## Context

During Phase 2 implementation we re-examined the monetisation model for
AI-driven features. The product owner's directive:

> "Any AI-powered feature the user triggers to improve or auto-fill their
> profile must be paid with Telegram Stars. Basic resume parsing and
> auto-fill can be done without AI — a simple library or a custom parser."

This reshapes the Phase 2 ingestion pipeline:

1. **Baseline (free) parse** — runs on every upload. Must be predictable,
   cheap (zero vendor cost), and survive the 5-locale user base
   (en / uk / ru / it / pl).
2. **AI-improve / AI-review** — optional, paid with Stars, returns richer
   structure and edits the user explicitly accepted. Phase 4 wires the
   payment gate; Phase 2 only leaves the slot open.

## Decision

Ship a **two-tier** `ResumeParser` strategy, both behind the same port from
`packages/core/src/application/ports/resume-parser.ts`:

### Tier 1 — heuristic (free, default)

- Lives in `packages/core/src/domain/resume-heuristics/*`. Pure TypeScript,
  zero external deps beyond what the adapter already uses (`unpdf` for PDF
  text extraction, sitting in the Web-layer adapter).
- Components: `splitIntoSections` (multilingual heading dictionary),
  `extractContacts`, `extractNameHeadlineSummary`, `extractSkills`,
  `extractLanguages`, `extractExperience`, `extractEducation`. Orchestrator
  `parseResumeText(text) -> ParsedResume` tags the output with
  `model: "heuristic-v1"`.
- Adapter: `apps/web/lib/resume/heuristic-parser.ts`. `unpdf.extractText`
  → normalise → `parseResumeText`. Scanned / image-only PDFs (< 200 chars
  extracted) raise `ResumeFormatError` → UI shows "upload text-based CV or
  enable AI parse (Stars)".
- Quality target: "gets the user 70-80 % of the way there on a standard
  text PDF". Everything ambiguous stays `undefined` — the review step is
  where humans fix misses, never the parser inventing data.

### Tier 2 — OpenAI gpt-5.1 (paid)

- Adapter kept from ADR 0006 (`apps/web/lib/openai/resume-parser.ts`).
  Unchanged wire protocol, unchanged env vars (`OPENAI_API_KEY`,
  `OPENAI_RESUME_MODEL`).
- Invocation path in Phase 2: behind a payment check that refuses to run
  until the user has a paid Stars receipt. Phase 4 ships the actual
  payment flow; until then the AI-tier route returns 402
  `PAYMENT_REQUIRED`.
- Intended use cases (all Stars-gated):
  1. "Re-parse with AI" — user uploaded a PDF, heuristic missed fields,
     they pay for a full AI re-extraction.
  2. "AI improve" — rewrite `summary` / `headline` in a chosen tone.
  3. "AI review" — score the profile, suggest gaps to fill.

### Routing

Both adapters implement `ResumeParser`. The API route (arriving in the
Profile UI commit) constructs whichever adapter matches the request:

```ts
const parser = req.query.tier === 'ai'
  ? createOpenAIResumeParser(env.OPENAI_API_KEY, env.OPENAI_RESUME_MODEL)
  : createHeuristicResumeParser();
```

The port ensures callers never see the difference beyond the `model` tag
on the returned `ParsedResume`.

## Consequences

**Positive**
- Zero per-parse vendor cost on the free tier — onboarding friction drops
  to "upload a PDF, see a draft" with no quota anxiety.
- Paid AI features carry their own cost into the user's Stars balance.
  Unit economics flip from "pay-per-user" to "pay-per-premium-action".
- Both adapters remain behind the same port — swapping providers is still
  one file.
- Heuristic parser is fully unit-testable (259 core tests cover 5
  extractors + the orchestrator). No network flakiness in CI.

**Negative**
- Heuristic quality varies with CV layout. The test fixtures cover three
  locales at write-time (EN / UA / IT); RU / PL coverage arrives as we
  collect real PDFs.
- Two code paths to maintain. We mitigate by keeping both adapters thin
  (PDF extraction + one call → port output) and the orchestration in core.
- Users with low-signal or heavily stylised CVs may see "only 30 % parsed
  for free"; the pitch for upgrading to AI parse depends on that gap being
  visible in the Review UI.

## Alternatives considered

1. **Keep OpenAI as the single parser (ADR 0006 status quo).** Clean code
   path but violates the "free for basics, pay for AI" directive. Also
   locks us into perpetual per-user cost for what should be a one-shot
   onboarding step.
2. **npm `resumix` / `pdf-resume-parser` / `resume-parser-tool` as the
   free parser.** Evaluated the three freshest options (2025-07..2026-04).
   None are multilingual; all three are English-only in practice. Rolling
   our own kept the dictionary explicit and tracked in-repo.
3. **AI for everyone, no paid tier.** Simpler UX but kills the monetisation
   wedge. Phase 4 payments need a concrete "what the user gets for Stars"
   proposition — AI-parse / AI-improve / AI-review is exactly that.
4. **Delay the split until Phase 4.** Considered but rejected — doing
   Phase 2 with only OpenAI means rewriting the adapter routing when
   Phase 4 lands. Front-loading the port choice now costs a day and saves
   a refactor.

## Reference

- Free-tier domain: [`packages/core/src/domain/resume-heuristics/`](../../packages/core/src/domain/resume-heuristics/)
- Free-tier adapter: [`apps/web/lib/resume/heuristic-parser.ts`](../../apps/web/lib/resume/heuristic-parser.ts)
- Paid-tier adapter: [`apps/web/lib/openai/resume-parser.ts`](../../apps/web/lib/openai/resume-parser.ts)
- Port (shared): [`packages/core/src/application/ports/resume-parser.ts`](../../packages/core/src/application/ports/resume-parser.ts)
- Prior provider decision: [ADR 0006](./0006-openai-resume-parser.md)
