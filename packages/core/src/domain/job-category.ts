/**
 * Job categories — the 12 fixed top-level buckets the Mini App sells campaigns for.
 *
 * Source of truth lives here. The Supabase `job_category` enum MUST match in shape and
 * order; any edit here requires a migration that adds/removes enum values atomically and
 * a regen of `packages/db/types/generated.ts`.
 *
 * Framework-free: consumed by `snapshot/schema.ts`, `category-fields/*`, wizard UI,
 * downstream worker — nobody else owns this list.
 */

export const JOB_CATEGORIES = [
  'tech',
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
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export function isJobCategory(value: unknown): value is JobCategory {
  return typeof value === 'string' && (JOB_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Display metadata for each category — label + one-liner intent + icon hint.
 * Labels are English source strings; real localisation comes from `messages/*.json`
 * under the `category.<slug>.label` keys (Phase 3+).
 */
export interface CategoryMeta {
  readonly slug: JobCategory;
  readonly label: string;
  readonly intent: string;
  readonly iconHint: string;
}

export const CATEGORY_META: Readonly<Record<JobCategory, CategoryMeta>> = {
  tech: {
    slug: 'tech',
    label: 'Tech & Engineering',
    intent: 'Stack + seniority + remote + timezone',
    iconHint: 'code',
  },
  design: {
    slug: 'design',
    label: 'Design & Creative',
    intent: 'Tools + specialization + portfolio',
    iconHint: 'pen-tool',
  },
  marketing: {
    slug: 'marketing',
    label: 'Marketing & Growth',
    intent: 'Channels + audience + industries',
    iconHint: 'trending-up',
  },
  sales: {
    slug: 'sales',
    label: 'Sales & Business Dev',
    intent: 'Segment + deal size + industries',
    iconHint: 'handshake',
  },
  product: {
    slug: 'product',
    label: 'Product & Project Mgmt',
    intent: 'PM type + domain + team scale',
    iconHint: 'kanban',
  },
  finance: {
    slug: 'finance',
    label: 'Finance & Accounting',
    intent: 'Function + certifications + industry',
    iconHint: 'calculator',
  },
  hr: {
    slug: 'hr',
    label: 'HR & People Ops',
    intent: 'Function + headcount scale',
    iconHint: 'users',
  },
  support: {
    slug: 'support',
    label: 'Customer Support & Success',
    intent: 'Tier + channel + CSM vs support',
    iconHint: 'life-buoy',
  },
  content: {
    slug: 'content',
    label: 'Content, Writing & Translation',
    intent: 'Format + content languages',
    iconHint: 'type',
  },
  ops: {
    slug: 'ops',
    label: 'Operations & Administration',
    intent: 'Function + industry',
    iconHint: 'settings',
  },
  data: {
    slug: 'data',
    label: 'Data, Analytics & Research',
    intent: 'Type + stack',
    iconHint: 'database',
  },
  web3: {
    slug: 'web3',
    label: 'Crypto & Web3',
    intent: 'Chain + role type + DAO experience',
    iconHint: 'link-2',
  },
};
