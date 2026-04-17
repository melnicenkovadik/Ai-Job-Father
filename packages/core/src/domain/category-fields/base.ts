/**
 * Shared primitives used by every category-fields Zod schema + the snapshot schema.
 * Pure types + Zod runtime — no framework dependencies.
 *
 * Seniority / work mode / employment type / hard-requirement toggles live here
 * because the wizard needs them for EVERY category, not just tech.
 */

import { z } from 'zod';

export const SENIORITY_LEVELS = [
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
  'director',
] as const;
export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];
export const seniorityLevelSchema = z.enum(SENIORITY_LEVELS);

export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const workModeSchema = z.enum(WORK_MODES);

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'internship',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);

export const TIMEZONE_TOLERANCE_HOURS = [0, 2, 4, 6, 'any'] as const;
export type TimezoneTolerance = (typeof TIMEZONE_TOLERANCE_HOURS)[number];
export const timezoneToleranceSchema = z.union([
  z.literal(0),
  z.literal(2),
  z.literal(4),
  z.literal(6),
  z.literal('any'),
]);

/** ISO-3166-1 alpha-2 or the sentinel `"any"` / `"any_eu"` quick-picks. */
export const countryCodeSchema = z
  .string()
  .min(2)
  .max(6)
  .regex(/^([A-Z]{2}|any|any_eu)$/, {
    message: 'Must be ISO-3166-1 alpha-2 (uppercase) or one of: any, any_eu',
  });

export const CEFR_LEVELS_EXPORT = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevelExport = (typeof CEFR_LEVELS_EXPORT)[number];
export const cefrLevelSchema = z.enum(CEFR_LEVELS_EXPORT);

export const spokenLanguageSchema = z.object({
  code: z.string().length(2).toLowerCase(),
  level: cefrLevelSchema,
});
export type SpokenLanguage = z.infer<typeof spokenLanguageSchema>;

export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'USDT', 'TON', 'PLN', 'UAH']);
export type Currency = z.infer<typeof currencySchema>;

export const salarySchema = z
  .object({
    min_usd: z.number().int().nonnegative().nullable(),
    max_usd: z.number().int().positive().nullable(),
    display_currency: currencySchema,
    negotiable: z.boolean(),
  })
  .refine((s) => s.max_usd === null || s.min_usd === null || s.max_usd >= s.min_usd, {
    message: 'salary.max_usd must be ≥ min_usd when both set',
  });
export type Salary = z.infer<typeof salarySchema>;

export const targetRoleSchema = z.object({
  label: z.string().min(1),
  esco_code: z
    .string()
    .regex(/^\d{4}\.\d+$/)
    .optional(),
  is_custom: z.boolean(),
});
export type TargetRole = z.infer<typeof targetRoleSchema>;
