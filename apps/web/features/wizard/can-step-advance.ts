import type { WizardDraft } from './draft-store';

export const STEP_KEYS = [
  'profile',
  'category',
  'roles',
  'countries',
  'salary',
  'stack',
  'languages',
  'quota',
  'checkout',
] as const;

export type StepKey = (typeof STEP_KEYS)[number];

/**
 * Per-step gate. The wizard's MainButton is disabled when this returns false;
 * the whole point is that NO step can be skipped with empty required fields.
 *
 * - profile: which profile this campaign uses (only shown when the user has
 *   2+ profiles; otherwise the wizard pre-selects the default and skips the
 *   step entirely).
 * - category: must pick one of the 12.
 * - roles: ≥ 1 role.
 * - countries: ≥ 1 country code.
 * - salary: salaryMin must be set and ≥ 400; salaryMax ≥ salaryMin.
 * - stack: only required when categoryNeedsStack — the wizard removes the
 *   step from the active list for non-tech categories, so this gate is only
 *   asked when the step is shown.
 * - languages: ≥ 1 language for the interview funnel.
 * - quota: must be 10..100 (range covers the slider min/max).
 * - checkout: category set (precondition for pricing); profile existence is
 *   checked separately so the user sees a "no profile" warning rather than
 *   a silent disabled button.
 */
export function canStepAdvance(stepKey: StepKey, draft: WizardDraft): boolean {
  switch (stepKey) {
    case 'profile':
      return Boolean(draft.profileId);
    case 'category':
      return Boolean(draft.category);
    case 'roles':
      return draft.roles.length > 0;
    case 'countries':
      return draft.countries.length > 0;
    case 'salary':
      return (
        draft.salaryMin !== undefined &&
        draft.salaryMax !== undefined &&
        draft.salaryMin >= 400 &&
        draft.salaryMax >= draft.salaryMin
      );
    case 'stack':
      return draft.stack.length > 0;
    case 'languages':
      return draft.languages.length > 0;
    case 'quota':
      return draft.quota >= 10 && draft.quota <= 100;
    case 'checkout':
      return Boolean(draft.category);
    default:
      return false;
  }
}
