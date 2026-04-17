# Profile UI — Design Spec

**Status:** Draft for review
**Phase:** 2 (Profile + AI resume parse)
**Date:** 2026-04-17
**Decided via:** terminal brainstorming + visual companion (archived in `.superpowers/brainstorm/`)

## 1. Goal

Let a Telegram-authed user create or edit a `Profile` (the resume-derived identity used as the seed for campaigns). A default profile is required before entering the campaign wizard (Phase 3). The UI must:

- Work fluently on 320-414 px mobile inside the Mini App viewport.
- Support five locales (en / uk / ru / it / pl).
- Gracefully degrade when AI resume parse is unavailable (no `OPENAI_API_KEY`, or user is on the free tier — which for MVP is everyone).
- Be editable repeatedly (not a one-shot wizard).

## 2. Route

```
apps/web/app/(app)/profile/page.tsx          # "Default profile" editor
apps/web/app/(app)/profile/[id]/page.tsx     # Future: edit alternate profile
apps/web/app/api/profile/parse-resume/route.ts  # POST PDF → ParsedResume
apps/web/app/api/profile/route.ts               # POST create / PUT update
```

Phase 2 ships only the default-profile flow (`/profile`). Multi-profile switcher lands when Phase 3 wizard calls for it.

## 3. Screen structure — single scroll, 4 labeled sections

Sections follow the "B — labeled sections (always-open)" decision. Each section stays visually open; no accordion chrome. The page is one `<Screen>` + `<Scroll>` + `<Stack>` of primitives from `apps/web/components/ui/layout/`.

Top → bottom:

### 3.1 Header row
- `<Row>`: profile name badge ("Default profile") on the left, `[⚙]` menu on the right (future: rename, delete, mark-default — inert in Phase 2).
- `<Section>` with no title, full-width `<button>` **📎 Загрузить CV** — inline file picker (`<input type="file" accept=".pdf">`).
  - Click → upload → `POST /api/profile/parse-resume` → returns `ParsedResume` → merges into form state.
  - While uploading: button shows inline spinner, form inputs disabled.
  - On success: inline green banner directly under the upload button — `✓ Готово · заполнено X / Y полей`. Auto-dismiss after 4 s. (No `Telegram.WebApp.showPopup` — keep all feedback in the same scroll context.)
  - On failure (`ResumeFormatError`, network): inline error row under the button with retry CTA. No modal.
  - The AI upgrade CTA is **out of scope for Phase 2** (ADR 0007 — lands in Phase 4 alongside Stars payment).

### 3.2 `👤 Identity`
`<Section title="Identity">` containing:

- `<FieldGroup label="Имя">` → `<input>` (full name, 1-40 chars, required).
- `<FieldGroup label="Headline" hint="Короткое описание роли">` → `<input>` (0-120 chars).
- `<FieldGroup label="Summary">` → `<textarea>` (0-800 chars, auto-grow).
- `<FieldGroup label="Город / таймзона">` → two inputs on one `<Row>`: location (free text), timezone (IANA picker — simple `<select>` for MVP).
- `<FieldGroup label="Всего лет опыта">` → `<input type="number" min="0" max="80">` (optional).
- `<FieldGroup label="Уровень английского">` → radio row A1 / A2 / B1 / B2 / C1 / C2 / — (none).

### 3.3 `💼 Experience & Education`

- `<Section title="Опыт работы">` with a list of **collapsible experience cards**.
  - Collapsed card (default): one `<Row>` — `Company · Role · 2022—present` + chevron. Tap toggles.
  - Expanded card: `<Stack gap>`:
    - `<FieldGroup label="Компания">` → input
    - `<FieldGroup label="Роль">` → input
    - `<Row>`: start `<input type="month">` · end `<input type="month">` (native — works well on Telegram mobile). `null` end ⇒ `<input>` disabled + sibling toggle `[По настоящее время]`.
    - `<FieldGroup label="Описание">` → textarea (400-char counter)
    - `<FieldGroup label="Стек">` → chip input (same pattern as Skills, narrower)
    - footer `<Row>`: `[💾 Save]` · `[🗑 Remove]`
  - Footer of list: full-width `[+ Добавить опыт]` inline button.
- `<Section title="Образование">` mirrors the same pattern (school + degree + date range), fewer fields.

### 3.4 `🧠 Skills & Languages`

Both follow the chosen A+B hybrid chip pattern.

#### Skills
- `<Section title="Skills">`:
  - `<input placeholder="Добавить скилл…">` (always visible, typeahead — simple local fuzzy filter over existing chips for MVP; ESCO autocomplete is Phase 3).
  - Enter / tap suggestion → chip appended to the grid below.
  - Chip grid: `[React · 5y]` `[TypeScript · 4y]` `[Next.js]`
  - Tap chip → inline expand → name input + years slider (0-30, nullable) + `[Save]` / `[Remove]`. Only one chip expanded at a time.

#### Languages
- `<Section title="Языки">` — same primitive, level picker CEFR replaces years:
  - Input accepts language name (en / uk / ru / it / pl / de / fr / es dictionary + bare ISO).
  - Adds a chip `[EN · C1]`. Default level `B1`; tap chip to change.
  - Tap chip → expand → language dropdown + CEFR radio A1..C2 + `[Save]` / `[Remove]`.

### 3.5 `🔗 Links & Contacts`

`<Section title="Contacts & links">`:
- `<FieldGroup label="Email">` → input (type=email).
- `<FieldGroup label="Phone">` → input (type=tel).
- `<FieldGroup label="LinkedIn">` → input.
- `<FieldGroup label="GitHub">` → input.
- `<FieldGroup label="Portfolio URL">` → input.

### 3.6 Footer

- `<Section>` `[💾 Сохранить профиль]` — primary button bound to Telegram MainButton via `TelegramMainButton`. Disabled while form is invalid or unchanged.
- Below the button: `"Поля со звёздочкой обязательны"` hint.

## 4. Form state model

```ts
type ProfileDraft = {
  id?: string;
  name: string;
  isDefault: boolean;
  fullName?: string; email?: string; phone?: string;
  location?: string; timezone?: string;
  linkedinUrl?: string; githubUrl?: string; portfolioUrl?: string;
  headline?: string; summary?: string;
  yearsTotal?: number;
  englishLevel?: CefrLevel;
  skills: Skill[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  languages: LanguageEntry[];
};
```

Client state = `useState<ProfileDraft>` (single object, not Zustand — only one form on screen).
Dirty tracking = shallow compare vs `initialDraft` to enable/disable the save button.

## 5. Data flow

```
Page load
 └─> server fetches default profile (SupabaseProfileRepo.findDefault)
       ├─ exists    → hydrate form
       └─ null      → empty draft (name defaults to "Default profile")

📎 Upload CV
 └─> FormData(file) → POST /api/profile/parse-resume
       ├─ 200 ParsedResume → merge into form state (overwrite empty fields only, keep user edits)
       ├─ 415 ResumeFormatError → inline error under button
       └─ 500 → inline error + "retry"

💾 Save
 └─> POST /api/profile (if new) | PUT /api/profile/:id (if existing)
       ├─ 200 Profile → replace initialDraft, clear dirty, flash "✓ Сохранено"
       └─ 4xx / 5xx → inline error banner at page top
```

### Merge rule (upload result → form state)

- **Empty fields** (`undefined`, `''`, `[]`) are always overwritten with parsed values.
- **Non-empty fields** that the user has edited are **never overwritten** (protects manual work).
- For arrays (`skills`, `experience`, `education`, `languages`): if empty → replace; if non-empty → keep user data (no merge in MVP; user can delete and re-upload if they want parser output).

## 6. API routes

### `POST /api/profile/parse-resume`
- Runtime: Node. Authenticated via existing `initData` session middleware.
- Body: `multipart/form-data` with `file` (PDF, ≤ 10 MB).
- Handler: `createHeuristicResumeParser()` from `apps/web/lib/resume/heuristic-parser.ts`.
- Response: `ParsedResume` JSON or error body `{ error: 'format' | 'rate_limit' | 'server' }`.

### `POST /api/profile`, `PUT /api/profile/:id`
- Runtime: Node. Authenticated.
- Body: `ProfileDraft` JSON.
- Handler: `createProfile` / `updateProfile` use cases (already in `packages/core/src/application/save-profile.ts`), wired to `SupabaseProfileRepo`.
- Response: `Profile` JSON.

## 7. Error states

| Error | Surface | Copy |
|---|---|---|
| File > 10 MB | Inline under upload button | "Файл больше 10 MB. Загрузите файл поменьше." |
| Non-PDF / corrupt | Inline under upload button | "Не удалось прочитать PDF. Попробуйте другой файл." |
| Scanned / < 200 chars | Inline under upload button | "Похоже, это скан. Загрузите текстовый PDF или заполните вручную." |
| Network fail on upload | Inline under upload button + retry | "Ошибка сети. Повторить?" |
| Save validation | Top banner + field-level highlights | "Проверьте обязательные поля." |
| Save server error | Top banner | "Не удалось сохранить. Повторить?" |

All copy goes through `t('profile.error.*')` keys (en real; uk/ru/it/pl `[LOCALE] …` stubs per Phase 6 plan).

## 8. Primitives used (no raw `<div>`)

From `apps/web/components/ui/layout/`:

- `<Screen>` — root, viewport + MainButton reserve + safe area.
- `<Scroll>` — owns vertical overflow.
- `<Stack gap="md">` — vertical stack of sections.
- `<Row gap="sm">` — horizontal rows (header, date pickers, footer buttons).
- `<Section title="…">` — each of the 4 major sections.
- `<FieldGroup label hint error>` — wraps every form control (ensures consistent label alignment + error slot).
- `<Clamp lines={3}>` — for long parsed descriptions in collapsed cards.
- `<HScroll>` — reserved for future tab/section switcher; not used in MVP.

New feature components (go in `apps/web/features/profile/`):

- `UploadCvButton.tsx`
- `IdentitySection.tsx`
- `ExperienceSection.tsx` + `ExperienceCard.tsx`
- `EducationSection.tsx` + `EducationCard.tsx`
- `SkillsSection.tsx` + `SkillChip.tsx` + `SkillChipEditor.tsx`
- `LanguagesSection.tsx` + `LanguageChip.tsx`
- `LinksSection.tsx`
- `SaveProfileButton.tsx` (TelegramMainButton adapter)
- `useProfileDraft.ts` (hook — single-state form + dirty tracking)

## 9. Accessibility & layout invariants

- Every interactive element ≥ 44×44 px (`min-h-[2.75rem]`).
- All labels explicitly linked via `htmlFor` / `id`.
- Form controls keyboard-navigable (tab order follows DOM).
- No fixed px widths in feature code (primitives only). Any `fixed|absolute` needs a `/* layout-safe: … */` rationale.
- Collapsible cards use `<details>` / `<summary>` for native keyboard + screen-reader support.

## 10. Out of Phase 2 scope

- **AI upgrade UI** (banner / per-field badges). Lands in Phase 4 with Stars payment.
- **ESCO autocomplete** for skills / roles. Lands in Phase 3 with the wizard.
- **Multi-profile list** and switcher. Lands when Phase 3 wizard needs it.
- **Resume upload to Storage bucket** (`resumes/{user_id}/…`). Phase 2 parses the bytes inline and discards — storage is a separate follow-up because it touches retention policy.
- **`confidence` score per field** (heuristic parser would need to emit this). Future enhancement.

## 11. Verification

- Manual on iPhone SE 1 (320 px) + Pixel 3a + iPad mini: no overflow, no clipping, upload → form fill → save works.
- Playwright visual regression baseline: `/profile` × 5 viewports × 2 themes × 3 locales (en / ru / x-loud pseudo-locale).
- `pnpm build` green.
- All feature components render without TypeScript errors under `exactOptionalPropertyTypes: true`.

## 12. Open questions (non-blocking)

- Should the `isDefault` toggle be visible in Phase 2, given we ship only the default profile? → **No**, hide it; Phase 3 exposes it alongside multi-profile.
- Do we persist the uploaded PDF in Storage even when AI is off? → **No for MVP**; add after Phase 4 defines retention (ADR 0008 future).
- Unsaved-changes warning on BackButton? → **Yes, minimal**: native `window.confirm` is enough for Phase 2.

---

## Next step after approval

1. Implement `POST /api/profile/parse-resume` first (wires `HeuristicResumeParser`, small surface).
2. Implement `GET /profile` page shell with sections 3.1-3.2 (upload + Identity) — visible on staging, manual smoke.
3. Remaining sections (Experience / Skills / Languages / Links / Save) in the same PR or separate — decide when we get there.
4. Docs: `docs/features/profile.md` + `.planning/phases/2/verify.md` after ship.
