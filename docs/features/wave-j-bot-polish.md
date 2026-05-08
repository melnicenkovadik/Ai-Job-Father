# Wave J — Bot polish (2026-05-08)

Six small, independent improvements to the bot's already-shipped surface area
(profiles, campaigns, payments, dashboard). Crawler / search-and-apply service
stays explicitly out of scope and postponed to a separate effort.

> **Plan:** `~/.claude/plans/snoopy-pondering-balloon.md` (locked decisions:
> auto-promote oldest sibling on default-profile delete; 4-tab layout
> Home/Campaigns/Profile/Settings; crawler postponed; i18n parity audit
> skipped — `messages-parity.test.ts` green).

## J.1 — Delete profile from `/profiles` list

`fd4a937 feat(web): delete profile from /profiles list`

A user with multiple profiles can now delete one from the Mini App without
going through the operator dashboard. Inline 2-stage confirm replaces the
card content; on the second tap the row vanishes.

- `DELETE /api/profile/:id` — owner check, then:
  - If the target is the default and siblings exist, **auto-promote** the
    oldest sibling to default (demote → promote → delete sequence inside
    the unique-default partial-index window).
  - Surfaces Postgres FK violation (`23505 == 23503` on `campaigns.profile_id`
    `RESTRICT`) as `409 has_campaigns` with a translated error message.
  - Allows deleting the last profile — the user just bounces back through
    onboarding on next visit.
- `useDeleteProfile()` invalidates `['profiles']`, `['profile', 'me']`, and
  `['campaigns']` (FK ripple).
- Trash icon at `right-2 top-2` on each card, mirroring the dashboard's
  `DeleteProfileButton` pattern (no Dialog primitive in our UI library).
- 5-locale i18n: `screens.profiles.delete.{label, confirmTitle, confirmHint,
  confirmYes, cancel, errorPaidCampaign, errorNotFound, errorGeneric}`.

## J.2 — Campaign history view

`cacb587 feat(web): /campaigns history view + 4-tab bar (J.2)`

Single campaign existed at `/campaign/[id]`; no list. Users couldn't see
past or active campaigns from inside the app.

- `app/(app)/campaigns/page.tsx` mounts `<CampaignsListScreen>`.
- Filter pills (all / active / past) using the existing `isCampaignActive`
  helper. `active` covers `searching | applying | paid`; `past` everything
  else.
- `CampaignCard` surfaces title, `StatusBadge`, country count, found/applied
  progress, creation date. Tap → `/campaign/[id]`.
- `+ New` button → `/campaign/new` (the wizard, not a dead `/wizard` route).
- Reused `useCampaignsQuery()` (already polls with adaptive refetch) — no
  new query keys.
- Tab bar grew from 3 → 4 tabs: **Home / Campaigns / Profile / Settings**.
  `dashboard` key renamed to `home` in `bottom-tab-bar.tsx`; `campaigns`
  key added with active state on `/campaigns` and `/campaign/*`.
- 5-locale i18n: `screens.campaigns.{title, subtitle, newCampaign, loading,
  empty, emptyFilter, filter.{all, active, past}, countriesCount, progress}`.

## J.3 — Resume PDF persisted to Supabase Storage

`6f8bcb4 feat(web): persist resume PDF to Supabase Storage`

The `resumes` Storage bucket has been migrated since 2026-04-19 but stayed
unused — uploads only lived in `sessionStorage`, which dies on tab close.

- `lib/supabase/resume-storage.ts` — service-role wrapper:
  - `uploadResume(userId, filename, bytes)` → path
    `resumes/{userId}/{timestamp}-{hash8}.pdf`. Hash via `crypto.subtle`
    `SHA-256`. Best-effort: failures log a warning and return `uploaded: false`;
    parse stays valid.
  - 60-second dedup window — same hash inside that window reuses the
    existing object instead of creating a duplicate.
  - `downloadResume(storagePath)` → `Uint8Array | null` for J.4 re-parse.
- Both `/api/profile/parse-resume` (heuristic) and
  `/api/profile/parse-resume/ai` (multipart path) now upload bytes
  post-parse and return four new fields:
  - `resumeStoragePath`
  - `resumeFileHash`
  - `resumeParsedAt` (ISO timestamp)
  - `resumeParseModel` (`heuristic-v1` or the OpenAI model id)
- `profileDraftSchema` extended with the four optional fields. Zod
  transforms `resumeParsedAt` from ISO string to `Date`. `ProfileDto`
  echoes them back; `profileToDto()` carries them from the entity.
- `ProfileDraft` form view-model carries them as non-editable strings;
  `dtoToDraft` / `draftToWire` pass them through. `applyResumeMeta()`
  helper overlays metadata onto a draft after parse.
- The upload screen stashes meta in `sessionStorage` alongside the
  parsed JSON; `/profile?new=1` hydrates both.

## J.4 — AI re-parse without re-upload

`cc47d55 feat(web): AI re-parse without re-upload`

Previously the user could only get an AI parse on initial upload — opening
`/profile` and clicking "Re-parse" forced a fresh PDF pick. With J.3
storing the PDF, we can re-parse from the existing object.

- `POST /api/profile/parse-resume/ai` now accepts two entry shapes:
  1. `multipart/form-data` with `file` — unchanged.
  2. `application/json { profileId }` — looks up the profile via
     service-role, owner-checks, downloads bytes from Storage, runs
     OpenAI, consumes one credit, returns the same JSON shape.
- Error mapping per code:
  - `404 no_resume_in_storage` — profile has no `resumeStoragePath`.
  - `404 profile_not_found` — id doesn't resolve.
  - `403 forbidden` — owner mismatch.
  - `502 storage_download_failed` — bucket flake.
- `<ReparseWithAiButton>` lives next to `<UploadCvButton>` on `/profile`
  in **edit mode only** (hidden in `?new=1`), and only when the loaded
  profile carries a `resumeStoragePath`. Reuses the existing `ai-init`
  invoice flow:
  - `alreadyHasCredit` → fire parse immediately.
  - Otherwise open invoice → wait for `paid` status → fire parse with
    a 500ms grace for the bot's `successful_payment` handler to land
    the credit row.
- 5-locale i18n: `profile.aiReparse.{label, hint, busyPay, busyParse,
  success, errorPayment, errorCancelled, errorNoPdf, errorNotFound,
  errorDownload, errorGeneric}`.

## J.5 — Push notifications on campaign completion

`f77178f feat(web): push notifications on campaign completion`

`user_settings.notify_push` existed since 2026-04-28 but the toggle was
disabled with "Coming soon" and no sender existed.

- `lib/notifications/dispatch.ts`:
  - `notifyCampaignCompleted(userId, campaign)` — looks up
    `user_settings.notify_push` first; if disabled, skip silently.
    Looks up `users.telegram_id` via service-role, formats a short
    HTML message, sends through the lazy bot singleton:

    ```
    ✅ Campaign completed
    <title>
    Applications sent: 12 / 12
    ```

  - `notifyIfJustCompleted(prevStatus, next)` — convenience guard;
    only fires when status transitioned from non-completed to
    completed.
  - End-to-end best-effort: every failure path is caught + warn-logged.
    Notifications must never break the request that triggered them.
- Wired into `GET /api/campaigns/[id]` and `GET /api/campaigns` (list).
  Both capture prior status before `tickCampaignIfDue`, fire the push
  via `void notifyIfJustCompleted(prev, post)` after.
- Dedup: relies on the one-shot status transition. If duplicates show
  up in production, gate via `app_logs` lookup
  `context='notify/completed/{campaignId}'`.
- Settings UI: push toggle is now live (`useUpdateSettings({notifications:
  {push: next}})`); email + weekly stay disabled with a "Coming soon"
  badge inside their own block.

## J.6 — Sentry instrumentation (dormant)

`d9eaf32 chore(web): wire Sentry instrumentation + log forwarding`
`e6a0ffe chore: wire Sentry instrumentation` (dashboard repo)
`6b2e498 docs(adr): defer Sentry activation to Phase 7`

`@sentry/nextjs` ≥ 10 scaffolded on both repos via the standard four-file
setup plus `app/global-error.tsx` for React render errors. Activation
deferred to Phase 7 — code-level scaffolding stays in place but stays a
no-op without DSN.

- `sentry.client.config.ts` — browser init; gates on
  `NEXT_PUBLIC_SENTRY_DSN`.
- `sentry.server.config.ts` + `sentry.edge.config.ts` — Node + edge
  inits; both gate on `SENTRY_DSN`.
- `instrumentation.ts` — Next.js hook; per-runtime config import +
  re-export of `captureRequestError as onRequestError`.
- `app/global-error.tsx` — top-level error boundary; calls
  `Sentry.captureException` then renders `next/error`.
- `next.config.ts` wrapped with `withSentryConfig({silent: true,
  widenClientFileUpload: true, tunnelRoute: '/monitoring'})`. Source-map
  upload runs only when `SENTRY_AUTH_TOKEN` is set, so preview/dev builds
  don't block on the Sentry CLI.
- `lib/logger/sentry-transport.ts` — `LogTransport` that forwards
  `error`-level events to `Sentry.captureException` with
  `context`/`source`/`url` tags and `data`/`message`/`userId` extras.
  Sits alongside `Console` + `Supabase` in the server logger pipeline.

**Activation checklist** (parked in Phase 7, ROADMAP §163):

1. Create two Sentry projects (Next.js): `ai-job-bot-web`,
   `ai-job-father-dashboard`.
2. Generate one auth token with `project:releases` + `project:read`.
3. Set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (per-project DSN) +
   `SENTRY_AUTH_TOKEN` (shared) on both Vercel projects, production
   scope.
4. Redeploy both, verify error capture by throwing a test exception.
5. `tracesSampleRate: 0` and `sendDefaultPii: false` — v1 is
   errors-only and PII-conservative. Bump tracing later when the
   project actually inspects traces.

## Verification

- All 51 web unit tests + 344 core tests green.
- `pnpm --filter @ai-job-bot/web typecheck` clean.
- Biome clean on changed files.
- `pnpm build` (web + dashboard) green; deploys on both Vercel projects
  show `● Ready` in production.
- 5-locale `messages-parity.test.ts` green — every J.* i18n key exists
  in EN/RU/UK/IT/PL.
