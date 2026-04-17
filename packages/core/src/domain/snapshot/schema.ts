/**
 * Snapshot contract — the immutable JSON written into `campaigns.snapshot_data`
 * at checkout click. Downstream workers read this; once written, it never
 * changes (Postgres trigger `enforce_snapshot_immutability()` blocks UPDATEs
 * while status ∈ paid|running|completed).
 *
 * Schema-versioned. Every new breaking change bumps `schema_version` and
 * ships a migration in `docs/integration/snapshot-schema-v1.json` (Phase 3
 * writes the public JSON Schema doc).
 *
 * This module owns:
 *   - `snapshotV1Schema` — Zod validator for the full JSONB shape
 *   - discriminated union on `category` + `category_fields` (tech ships
 *     Phase 2; other 11 added incrementally in Phase 3).
 *
 * Pure TS + Zod, framework-free.
 */

import { z } from 'zod';
import {
  cefrLevelSchema,
  countryCodeSchema,
  currencySchema,
  employmentTypeSchema,
  salarySchema,
  seniorityLevelSchema,
  spokenLanguageSchema,
  targetRoleSchema,
  timezoneToleranceSchema,
  workModeSchema,
} from '../category-fields/base';
import { techCategoryFieldsSchema } from '../category-fields/tech';

export const snapshotLocaleSchema = z.enum(['en', 'uk', 'ru', 'it', 'pl']);

/**
 * Which fields on the snapshot act as HARD filters for downstream search.
 * Per-stack-item hardness is carried inside `category_fields.tech.stack[i].is_hard`,
 * so `stack` is absent from this list — use this list for category-wide toggles
 * only (seniority / countries / salary).
 */
export const hardRequirementKeySchema = z.enum(['seniority', 'countries', 'salary']);

const universalSchema = z.object({
  target_roles: z.array(targetRoleSchema).min(1).max(5),
  seniority: z.array(seniorityLevelSchema).min(1).max(6),
  countries: z.array(countryCodeSchema).min(1).max(15),
  work_modes: z.array(workModeSchema).min(1).max(3),
  timezone_tolerance_hours: timezoneToleranceSchema,
  user_timezone: z.string().min(1),
  relocation_willing: z.boolean(),
  employment_types: z.array(employmentTypeSchema).min(1).max(5),
  salary: salarySchema,
  spoken_languages: z.array(spokenLanguageSchema).max(10),
  exclude_keywords: z.array(z.string().min(1).max(40)).max(20),
  exclude_companies: z.array(z.string().min(1).max(60)).max(40),
  max_posting_age_days: z.union([
    z.literal(7),
    z.literal(14),
    z.literal(30),
    z.literal(60),
    z.literal(90),
  ]),
  target_quota: z.number().int().min(1).max(500),
  hard_requirements: z.array(hardRequirementKeySchema),
});
export type SnapshotUniversal = z.infer<typeof universalSchema>;

const metaSchema = z.object({
  created_via: z.enum(['wizard', 'bot_quick', 'api']),
  wizard_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  profile_id: z.string().uuid(),
  profile_name: z.string().min(1).max(40),
});
export type SnapshotMeta = z.infer<typeof metaSchema>;

const techVariant = z.object({
  schema_version: z.literal(1),
  locale_at_checkout: snapshotLocaleSchema,
  category: z.literal('tech'),
  universal: universalSchema,
  category_fields: techCategoryFieldsSchema,
  meta: metaSchema,
});

/**
 * Placeholder variant for the remaining 11 categories — they accept any
 * JSON object for `category_fields` until their Zod schemas land in Phase 3.
 * Phase 3 replaces this fallback with per-category discriminated-union arms.
 */
const pendingVariant = z.object({
  schema_version: z.literal(1),
  locale_at_checkout: snapshotLocaleSchema,
  category: z.enum([
    'design',
    'marketing',
    'sales',
    'product',
    'finance',
    'hr',
    'support',
    'content',
    'ops',
    'data',
    'web3',
  ]),
  universal: universalSchema,
  category_fields: z.record(z.string(), z.unknown()),
  meta: metaSchema,
});

export const snapshotV1Schema = z.discriminatedUnion('category', [techVariant, pendingVariant]);
export type SnapshotV1 = z.infer<typeof snapshotV1Schema>;

/**
 * Human-readable label for each snapshot version — used in migrations / logs.
 */
export const CURRENT_SNAPSHOT_VERSION = 1 as const;
