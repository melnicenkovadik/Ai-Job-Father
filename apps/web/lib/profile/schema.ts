import 'server-only';
import { CEFR_LEVELS, JOB_CATEGORIES, type Profile } from '@ai-job-bot/core';
import { z } from 'zod';

/**
 * Wire-format validators for `/api/profile` POST + PUT bodies.
 *
 * Shape mirrors `SaveProfileInput` from `packages/core/src/application/ports/profile-repo.ts`
 * but lives in the web layer because the server is the only zod consumer
 * today. If the wizard (Phase 3) needs the same validator client-side,
 * promote to `packages/core/src/domain/profile-schema.ts`.
 */

const optionalString = (min = 0, max = 200) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

const cefrLevel = z.enum(CEFR_LEVELS);

const skill = z.object({
  name: z.string().min(1).max(40),
  years: z.number().int().min(0).max(30).optional(),
  level: cefrLevel.optional(),
});

const experienceEntry = z.object({
  company: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM'),
  endMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM')
    .nullable(),
  description: z.string().max(2000).optional(),
  stack: z.array(z.string().min(1).max(40)).max(30).optional(),
});

const educationEntry = z.object({
  school: z.string().min(1).max(120),
  degree: z.string().max(120).optional(),
  startMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM')
    .optional(),
  endMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM')
    .optional(),
});

const languageEntry = z.object({
  code: z
    .string()
    .regex(/^[a-z]{2}$/, 'ISO-639-1 two-letter lowercase')
    .max(2),
  level: cefrLevel,
});

export const profileDraftSchema = z.object({
  name: z.string().trim().min(1).max(40),
  isDefault: z.boolean().optional(),
  preferredCategories: z.array(z.enum(JOB_CATEGORIES)).max(12).optional(),
  fullName: optionalString(0, 120),
  email: z
    .string()
    .email()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: optionalString(0, 60),
  location: optionalString(0, 120),
  timezone: optionalString(0, 60),
  linkedinUrl: optionalString(0, 500),
  githubUrl: optionalString(0, 500),
  telegramUrl: optionalString(0, 500),
  twitterUrl: optionalString(0, 500),
  portfolioUrl: optionalString(0, 500),
  headline: optionalString(0, 120),
  summary: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  yearsTotal: z.number().int().min(0).max(80).optional(),
  englishLevel: cefrLevel.optional(),
  skills: z.array(skill).max(80).default([]),
  experience: z.array(experienceEntry).max(30).default([]),
  education: z.array(educationEntry).max(20).default([]),
  languages: z.array(languageEntry).max(20).default([]),
});

export type ProfileDraftDto = z.infer<typeof profileDraftSchema>;

export interface ProfileDto {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly preferredCategories: readonly string[];
  readonly fullName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly location: string | null;
  readonly timezone: string | null;
  readonly linkedinUrl: string | null;
  readonly githubUrl: string | null;
  readonly telegramUrl: string | null;
  readonly twitterUrl: string | null;
  readonly portfolioUrl: string | null;
  readonly headline: string | null;
  readonly summary: string | null;
  readonly yearsTotal: number | null;
  readonly englishLevel: string | null;
  readonly skills: readonly { name: string; years?: number; level?: string }[];
  readonly experience: readonly {
    company: string;
    role: string;
    startMonth: string;
    endMonth: string | null;
    description?: string;
    stack?: readonly string[];
  }[];
  readonly education: readonly {
    school: string;
    degree?: string;
    startMonth?: string;
    endMonth?: string;
  }[];
  readonly languages: readonly { code: string; level: string }[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function profileToDto(profile: Profile): ProfileDto {
  return {
    id: profile.id.value,
    userId: profile.userId,
    name: profile.name,
    isDefault: profile.isDefault,
    preferredCategories: [...profile.preferredCategories],
    fullName: profile.fullName ?? null,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    location: profile.location ?? null,
    timezone: profile.timezone ?? null,
    linkedinUrl: profile.linkedinUrl ?? null,
    githubUrl: profile.githubUrl ?? null,
    telegramUrl: profile.telegramUrl ?? null,
    twitterUrl: profile.twitterUrl ?? null,
    portfolioUrl: profile.portfolioUrl ?? null,
    headline: profile.headline ?? null,
    summary: profile.summary ?? null,
    yearsTotal: profile.yearsTotal ?? null,
    englishLevel: profile.englishLevel ?? null,
    skills: profile.skills.map((s) => ({
      name: s.name,
      ...(s.years !== undefined ? { years: s.years } : {}),
      ...(s.level !== undefined ? { level: s.level } : {}),
    })),
    experience: profile.experience.map((e) => ({
      company: e.company,
      role: e.role,
      startMonth: e.startMonth,
      endMonth: e.endMonth,
      ...(e.description !== undefined ? { description: e.description } : {}),
      ...(e.stack !== undefined ? { stack: [...e.stack] } : {}),
    })),
    education: profile.education.map((e) => ({
      school: e.school,
      ...(e.degree !== undefined ? { degree: e.degree } : {}),
      ...(e.startMonth !== undefined ? { startMonth: e.startMonth } : {}),
      ...(e.endMonth !== undefined ? { endMonth: e.endMonth } : {}),
    })),
    languages: profile.languages.map((l) => ({ code: l.code, level: l.level })),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
