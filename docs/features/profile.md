# Profile

**Phase:** 2
**Shipped:** 2026-04-17
**Spec:** [2026-04-17-profile-ui-design.md](../superpowers/specs/2026-04-17-profile-ui-design.md)
**ADRs:** [0006 — OpenAI gpt-5.1](../DECISIONS/0006-openai-resume-parser.md), [0007 — two-tier parse](../DECISIONS/0007-two-tier-resume-parse.md)

## What it does

Lets a Telegram-authed user create or edit a **default profile** — the resume-derived identity that seeds all future campaigns (Phase 3 wizard). One long `/profile` route hosts the form; an inline "📎 Upload CV" button at the top runs the free-tier heuristic parser and fills empty fields.

## Route map

| Surface | Purpose |
|---|---|
| `GET /profile` (RSC page) | Render the editor. Client hydrates via TanStack Query. |
| `GET /api/profile` | Return the authed user's default profile or `null`. |
| `POST /api/profile` | Create the default profile. Zod-validated body. |
| `PUT /api/profile/:id` | Partial update. Owner-only; 403 if someone else's. |
| `POST /api/profile/parse-resume` | multipart PDF → `ParsedResume` via `HeuristicResumeParser`. |

All routes authenticate via `Authorization: Tma <initData>` (handled by `requireAuth` in `apps/web/lib/telegram/auth-middleware.ts`).

## Architecture

```
Browser
 ├─ /profile page (client component)
 │    useQuery     → GET /api/profile
 │    useMutation  → POST / PUT /api/profile/:id
 │    useProfileDraft  (form state + dirty tracking)
 │
 ├─ UploadCvButton
 │    POST /api/profile/parse-resume
 │    onParsed → mergeParsedResume(draft, parsed)
 │
 └─ SaveProfileButton
      Telegram MainButton bridge, web fallback

Server (apps/web/)
 ├─ /api/profile/route.ts         GET + POST
 ├─ /api/profile/[id]/route.ts    PUT
 ├─ /api/profile/parse-resume     multipart → HeuristicResumeParser
 ├─ lib/profile/schema.ts         Zod + ProfileDto serializer
 ├─ lib/resume/heuristic-parser.ts (unpdf + core heuristics)
 └─ lib/supabase/profile-repo.ts  ProfileRepo adapter (service-role)

Core (packages/core/)
 ├─ application/save-profile.ts   createProfile / updateProfile / deleteProfile
 ├─ application/parse-resume.ts   thin orchestration (size / PDF signature)
 ├─ application/ports/
 │    ├─ profile-repo.ts
 │    └─ resume-parser.ts
 └─ domain/resume-heuristics/     7 extractors + parseResumeText
```

## Form state & merge rule

- **Single state:** `useProfileDraft` holds one `ProfileDraft` object + an `initialDraft` baseline. Dirty flag = shallow JSON compare.
- **Validation for save:** only `name` is required. Everything else is optional at the view-model level; the server re-validates via Zod on write.
- **Upload merge rule:** after a successful `POST /api/profile/parse-resume`, the `mergeParsedResume(draft, parsed)` helper in `features/profile/types.ts` fills fields **only if the draft field is empty** (string `''`, null number, empty array). User edits are never clobbered. Scalar fields (email, headline, …) use `draft.x || parsed.x`; array fields (skills, experience, …) use `draft.x.length > 0 ? draft.x : parsed.x`.

## Sections

All sections live in `apps/web/features/profile/`:

1. **Identity** — name (required, ≤ 40), fullName, headline (hint: "Short role description"), summary (textarea, ≤ 2000), location + timezone (two-column row), yearsTotal (0–80), English level (CEFR chip row A1..C2).
2. **Experience** — blank-line-separated `<details>` cards. Default opens when company + role empty. Fields: company, role, start/end `<input type="month">`, "Present" checkbox that nulls `endMonth`, description (textarea 400-char soft cap), stack (comma list).
3. **Education** — same `<details>` pattern, fewer fields.
4. **Skills** — always-visible input on top + chip grid below (A+B hybrid from the spec). Enter / `+` adds. Tap chip → inline editor with name + years slider (0–30) + remove.
5. **Languages** — same chip pattern. Name/ISO input normalises "English" / "english" / "en" → code `en`. Default CEFR on add = `B1`; tap chip → select + level radio.
6. **Links & Contacts** — email, phone, LinkedIn, GitHub, portfolio.

The Save action is bound to the Telegram MainButton via `SaveProfileButton`; outside Telegram, a sticky bottom button is rendered as a fallback (dev / browser visit).

## Error surfaces

| Error | Surface | Copy key |
|---|---|---|
| File > 10 MB | Inline under upload button | `profile.upload.error.file_too_large` |
| Non-PDF / corrupt | Inline under upload button | `profile.upload.error.format` |
| Scanned / < 200 chars | Inline under upload button | `profile.upload.error.format` (fallback) |
| Parser 429 | Inline under upload button | `profile.upload.error.rate_limit` |
| Parser 503 (OPENAI_API_KEY missing for AI tier — future) | Inline under upload button | `profile.upload.error.unavailable` |
| Save 4xx / 5xx | Top banner | `profile.save.error` |
| `name` empty | Inline on Identity row | `profile.validation.nameRequired` |

All copy is `t('profile.*')`; EN real, uk/ru/it/pl carry `[LOCALE] …` stubs until Phase 6.

## Two-tier parse (ADR 0007)

- **Free tier (shipped):** `HeuristicResumeParser` — `unpdf` for PDF → text, then `parseResumeText` from `packages/core/src/domain/resume-heuristics/`. Output tagged `model: "heuristic-v1"`.
- **Paid tier (Phase 4):** `OpenAIResumeParser` (gpt-5.1 + Structured Outputs) lives behind a Stars payment wall. Same `ResumeParser` port, same `ParsedResume` shape; a different factory is wired per request when the user has a valid Stars receipt.

Phase 2 does **not** ship any AI-upgrade CTA in the UI — we add it alongside Phase 4 when the Stars flow works.

## Out of scope for Phase 2

- Multi-profile switcher & named alt profiles.
- Persisting the uploaded PDF in Supabase Storage (`resumes/{user_id}/…`) — retention policy lands in a later ADR.
- ESCO autocomplete for roles / skills (Phase 3 wizard will wire this).
- `confidence` score per parsed field.
- Unsaved-changes warning on BackButton (native `window.confirm` is enough for Phase 2).

## Verification

- `pnpm -r typecheck && pnpm -r lint && pnpm -r build` green.
- `pnpm -r test:unit` — 259 core + 23 web passing (12 integration skipped when local Supabase isn't reachable).
- Manual in Telegram Mini App: open `/profile`, upload a PDF, see fields fill, tap Save → MainButton flips to "Saving..." then "Save profile" — a fresh row lands in `public.profiles` (default for the current user).
- Visual regression baselines for `/profile` × 5 viewports × 2 themes × 3 locales — to be captured as part of the Phase 2 verify pass.

## Related files

- [`apps/web/app/(app)/profile/page.tsx`](../../apps/web/app/(app)/profile/page.tsx)
- [`apps/web/app/api/profile/route.ts`](../../apps/web/app/api/profile/route.ts)
- [`apps/web/app/api/profile/[id]/route.ts`](../../apps/web/app/api/profile/[id]/route.ts)
- [`apps/web/app/api/profile/parse-resume/route.ts`](../../apps/web/app/api/profile/parse-resume/route.ts)
- [`apps/web/features/profile/`](../../apps/web/features/profile/)
- [`apps/web/lib/profile/schema.ts`](../../apps/web/lib/profile/schema.ts)
- [`apps/web/lib/resume/heuristic-parser.ts`](../../apps/web/lib/resume/heuristic-parser.ts)
- [`apps/web/lib/supabase/profile-repo.ts`](../../apps/web/lib/supabase/profile-repo.ts)
- [`packages/core/src/domain/resume-heuristics/`](../../packages/core/src/domain/resume-heuristics/)
- [`packages/core/src/application/save-profile.ts`](../../packages/core/src/application/save-profile.ts)
- [`packages/core/src/application/parse-resume.ts`](../../packages/core/src/application/parse-resume.ts)
