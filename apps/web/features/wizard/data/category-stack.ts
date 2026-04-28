import type { JobCategory } from '@ai-job-bot/core';

/**
 * Per-category technology stack lists. Categories with an empty array don't
 * have a stack step at all — the wizard skips it dynamically (LinkedIn-style:
 * tech roles ask for stack, marketing/sales/etc. don't).
 *
 * Lists are intentionally short (10–18) — the wizard surfaces user's resume
 * skills first and only falls back to these defaults.
 */
export const STACK_BY_CATEGORY: Record<JobCategory, readonly string[]> = {
  tech: [
    'React',
    'TypeScript',
    'Next.js',
    'Node.js',
    'Vue',
    'Angular',
    'Python',
    'Go',
    'Rust',
    'Java',
    'Kotlin',
    'Swift',
    'GraphQL',
    'PostgreSQL',
    'Docker',
    'AWS',
    'Kubernetes',
    'Tailwind',
  ],
  data: [
    'Python',
    'SQL',
    'dbt',
    'Airflow',
    'Snowflake',
    'BigQuery',
    'Spark',
    'Kafka',
    'Looker',
    'Tableau',
    'Pandas',
    'PyTorch',
    'TensorFlow',
  ],
  web3: [
    'Solidity',
    'Rust',
    'Foundry',
    'Hardhat',
    'ethers.js',
    'viem',
    'wagmi',
    'The Graph',
    'IPFS',
    'OpenZeppelin',
  ],
  // Categories below skip the stack step entirely.
  design: [],
  marketing: [],
  sales: [],
  product: [],
  finance: [],
  hr: [],
  support: [],
  content: [],
  ops: [],
};

export function categoryNeedsStack(category: JobCategory | undefined): boolean {
  if (!category) return false;
  return STACK_BY_CATEGORY[category].length > 0;
}

/**
 * Merge the user's resume skills (passed in lowercased for case-insensitive
 * intersection) with the category default. Returns:
 *   { fromResume } — skills found in the resume that match the category set,
 *   { suggested }  — remaining defaults the user might still want to pick.
 *
 * If the resume is empty, fromResume is empty and suggested = the full
 * category default.
 */
export function suggestStack(
  category: JobCategory | undefined,
  resumeSkills: readonly string[],
): { fromResume: readonly string[]; suggested: readonly string[] } {
  if (!category) return { fromResume: [], suggested: [] };
  const defaults = STACK_BY_CATEGORY[category];
  if (defaults.length === 0) return { fromResume: [], suggested: [] };
  const lower = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const fromResume: string[] = [];
  const suggested: string[] = [];
  for (const item of defaults) {
    if (lower.has(item.toLowerCase())) fromResume.push(item);
    else suggested.push(item);
  }
  // Also include resume skills NOT in the defaults but plausibly relevant —
  // surface them so the user doesn't have to retype.
  for (const skill of resumeSkills) {
    const lc = skill.toLowerCase();
    if (defaults.some((d) => d.toLowerCase() === lc)) continue;
    fromResume.push(skill);
  }
  return { fromResume, suggested };
}
