/**
 * Category-fields schema for the `tech` category.
 *
 * Shape mirrors `packages/db/supabase/migrations/20260419000000_profiles.sql`
 * `profiles.category_fields` JSONB and the `snapshot_data.category_fields`
 * discriminated union. The wizard Screen 2 ("Deal") renders inputs from this
 * schema when Category = tech.
 *
 * `stack[]` is a small ordered list of technologies with years-of-experience
 * and a per-row `is_hard` toggle — this is the only category-fields block
 * with per-item hard/soft semantics (the rest use category-wide toggles
 * from `hard_requirements[]` on the snapshot root).
 */

import { z } from 'zod';

export const TECH_STACK_MAX = 5;

export const TECH_DOMAINS = [
  'fintech',
  'saas',
  'ecommerce',
  'healthcare',
  'gaming',
  'ai_ml',
  'web3',
  'devtools',
  'media',
  'education',
  'enterprise',
  'other',
] as const;
export type TechDomain = (typeof TECH_DOMAINS)[number];
export const techDomainSchema = z.enum(TECH_DOMAINS);

export const COMPANY_STAGES = [
  'seed',
  'series_a',
  'series_b_plus',
  'growth',
  'public',
  'enterprise',
  'bootstrapped',
  'agency',
] as const;
export type CompanyStage = (typeof COMPANY_STAGES)[number];
export const companyStageSchema = z.enum(COMPANY_STAGES);

export const techStackItemSchema = z.object({
  name: z.string().min(1).max(40),
  years_min: z.number().int().min(0).max(30),
  is_hard: z.boolean(),
});
export type TechStackItem = z.infer<typeof techStackItemSchema>;

export const techCategoryFieldsSchema = z
  .object({
    stack: z.array(techStackItemSchema).min(1).max(TECH_STACK_MAX),
    domains: z.array(techDomainSchema).max(5).default([]),
    company_stages: z.array(companyStageSchema).max(5).default([]),
  })
  .strict()
  .refine((v) => new Set(v.stack.map((s) => s.name.toLowerCase())).size === v.stack.length, {
    message: 'stack entries must be unique by name (case-insensitive)',
    path: ['stack'],
  });

export type TechCategoryFields = z.infer<typeof techCategoryFieldsSchema>;
