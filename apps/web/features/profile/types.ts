import type { ProfileDto } from '@/lib/profile/schema';
import type { CefrLevel, ParsedResume } from '@ai-job-bot/core';

/**
 * Form view-model for the Profile editor.
 *
 * Lives on the client; mirrors `ProfileDraftDto` from `lib/profile/schema.ts`
 * minus server-only concerns. Every field present here is editable in the UI;
 * the server truncates / validates on write.
 */
export interface ProfileDraft {
  name: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  headline: string;
  summary: string;
  yearsTotal: number | null;
  englishLevel: CefrLevel | null;
  skills: SkillDraft[];
  experience: ExperienceDraft[];
  education: EducationDraft[];
  languages: LanguageDraft[];
}

export interface SkillDraft {
  readonly id: string;
  name: string;
  years: number | null;
}

export interface ExperienceDraft {
  readonly id: string;
  company: string;
  role: string;
  startMonth: string;
  endMonth: string | null;
  description: string;
  stack: string[];
}

export interface EducationDraft {
  readonly id: string;
  school: string;
  degree: string;
  startMonth: string;
  endMonth: string;
}

export interface LanguageDraft {
  readonly id: string;
  code: string;
  level: CefrLevel;
}

export const EMPTY_DRAFT: ProfileDraft = {
  name: 'Default profile',
  fullName: '',
  email: '',
  phone: '',
  location: '',
  timezone: '',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  headline: '',
  summary: '',
  yearsTotal: null,
  englishLevel: null,
  skills: [],
  experience: [],
  education: [],
  languages: [],
};

/** Stable client-side id for list items. */
export function draftId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalise a server `ProfileDto` (or null) into a form draft.
 * Missing optional fields collapse to empty strings / empty arrays so inputs
 * never see `null` and React stays controlled.
 */
export function dtoToDraft(dto: ProfileDto | null): ProfileDraft {
  if (!dto) return EMPTY_DRAFT;
  return {
    name: dto.name,
    fullName: dto.fullName ?? '',
    email: dto.email ?? '',
    phone: dto.phone ?? '',
    location: dto.location ?? '',
    timezone: dto.timezone ?? '',
    linkedinUrl: dto.linkedinUrl ?? '',
    githubUrl: dto.githubUrl ?? '',
    portfolioUrl: dto.portfolioUrl ?? '',
    headline: dto.headline ?? '',
    summary: dto.summary ?? '',
    yearsTotal: dto.yearsTotal,
    englishLevel: (dto.englishLevel as CefrLevel | null) ?? null,
    skills: dto.skills.map((s) => ({
      id: draftId('s'),
      name: s.name,
      years: s.years ?? null,
    })),
    experience: dto.experience.map((e) => ({
      id: draftId('x'),
      company: e.company,
      role: e.role,
      startMonth: e.startMonth,
      endMonth: e.endMonth,
      description: e.description ?? '',
      stack: e.stack ? [...e.stack] : [],
    })),
    education: dto.education.map((e) => ({
      id: draftId('e'),
      school: e.school,
      degree: e.degree ?? '',
      startMonth: e.startMonth ?? '',
      endMonth: e.endMonth ?? '',
    })),
    languages: dto.languages.map((l) => ({
      id: draftId('l'),
      code: l.code,
      level: l.level as CefrLevel,
    })),
  };
}

/**
 * Serialize a `ProfileDraft` for the server — undefined-for-empty conventions
 * so the Zod validator on the server accepts it. Arrays always send, strings
 * collapse to `undefined` when empty.
 */
export function draftToWire(draft: ProfileDraft): Record<string, unknown> {
  return {
    name: draft.name,
    fullName: emptyToUndefined(draft.fullName),
    email: emptyToUndefined(draft.email),
    phone: emptyToUndefined(draft.phone),
    location: emptyToUndefined(draft.location),
    timezone: emptyToUndefined(draft.timezone),
    linkedinUrl: emptyToUndefined(draft.linkedinUrl),
    githubUrl: emptyToUndefined(draft.githubUrl),
    portfolioUrl: emptyToUndefined(draft.portfolioUrl),
    headline: emptyToUndefined(draft.headline),
    summary: emptyToUndefined(draft.summary),
    yearsTotal: draft.yearsTotal ?? undefined,
    englishLevel: draft.englishLevel ?? undefined,
    skills: draft.skills
      .filter((s) => s.name.trim().length > 0)
      .map((s) => ({
        name: s.name.trim(),
        ...(s.years !== null ? { years: s.years } : {}),
      })),
    experience: draft.experience
      .filter((e) => e.company.trim().length > 0 && e.role.trim().length > 0 && e.startMonth)
      .map((e) => ({
        company: e.company.trim(),
        role: e.role.trim(),
        startMonth: e.startMonth,
        endMonth: e.endMonth,
        ...(e.description.trim().length > 0 ? { description: e.description.trim() } : {}),
        ...(e.stack.length > 0 ? { stack: e.stack.filter((s) => s.trim()) } : {}),
      })),
    education: draft.education
      .filter((e) => e.school.trim().length > 0)
      .map((e) => ({
        school: e.school.trim(),
        ...(e.degree.trim().length > 0 ? { degree: e.degree.trim() } : {}),
        ...(e.startMonth ? { startMonth: e.startMonth } : {}),
        ...(e.endMonth ? { endMonth: e.endMonth } : {}),
      })),
    languages: draft.languages
      .filter((l) => l.code.length === 2)
      .map((l) => ({ code: l.code, level: l.level })),
  };
}

/**
 * Merge a ParsedResume (from the free-tier parser) into an existing draft.
 * Rule: if a draft field is "empty" (string === '' or array length === 0
 * or numeric null), fill it from parsed output. Otherwise the user's edits
 * win — protects manual work when someone re-uploads a CV by mistake.
 */
export function mergeParsedResume(draft: ProfileDraft, parsed: ParsedResume): ProfileDraft {
  return {
    ...draft,
    fullName: draft.fullName || parsed.fullName || '',
    email: draft.email || parsed.email || '',
    phone: draft.phone || parsed.phone || '',
    location: draft.location || parsed.location || '',
    linkedinUrl: draft.linkedinUrl || parsed.linkedinUrl || '',
    githubUrl: draft.githubUrl || parsed.githubUrl || '',
    portfolioUrl: draft.portfolioUrl || parsed.portfolioUrl || '',
    headline: draft.headline || parsed.headline || '',
    summary: draft.summary || parsed.summary || '',
    yearsTotal: draft.yearsTotal ?? parsed.yearsTotal ?? null,
    englishLevel: draft.englishLevel ?? parsed.englishLevel ?? null,
    skills:
      draft.skills.length > 0
        ? draft.skills
        : parsed.skills.map((s) => ({
            id: draftId('s'),
            name: s.name,
            years: s.years ?? null,
          })),
    experience:
      draft.experience.length > 0
        ? draft.experience
        : parsed.experience.map((e) => ({
            id: draftId('x'),
            company: e.company,
            role: e.role,
            startMonth: e.startMonth,
            endMonth: e.endMonth,
            description: e.description ?? '',
            stack: e.stack ? [...e.stack] : [],
          })),
    education:
      draft.education.length > 0
        ? draft.education
        : parsed.education.map((e) => ({
            id: draftId('e'),
            school: e.school,
            degree: e.degree ?? '',
            startMonth: e.startMonth ?? '',
            endMonth: e.endMonth ?? '',
          })),
    languages:
      draft.languages.length > 0
        ? draft.languages
        : parsed.languages.map((l) => ({
            id: draftId('l'),
            code: l.code,
            level: l.level,
          })),
  };
}

/**
 * Summary of "filled" fields — used for the success toast after upload.
 * `filled/total` where total is a fixed count of top-level fields + array
 * non-emptiness. Cheap heuristic, shown as `8 / 12` in UI.
 */
export function draftFilledRatio(draft: ProfileDraft): { filled: number; total: number } {
  const checks: boolean[] = [
    draft.fullName.trim().length > 0,
    draft.email.trim().length > 0,
    draft.phone.trim().length > 0,
    draft.location.trim().length > 0,
    draft.linkedinUrl.trim().length > 0 ||
      draft.githubUrl.trim().length > 0 ||
      draft.portfolioUrl.trim().length > 0,
    draft.headline.trim().length > 0,
    draft.summary.trim().length > 0,
    draft.yearsTotal !== null,
    draft.englishLevel !== null,
    draft.skills.length > 0,
    draft.experience.length > 0,
    draft.languages.length > 0,
  ];
  return { filled: checks.filter(Boolean).length, total: checks.length };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
