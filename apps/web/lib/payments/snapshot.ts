import 'server-only';
import { createHash } from 'node:crypto';
import type { Campaign } from '@ai-job-bot/core';

/**
 * Build the immutable snapshot we freeze at Pay click. Today this is a
 * shallow projection of the campaign + a v=1 schema marker so we have a
 * concrete versioned record to migrate later if the shape changes.
 *
 * Wave B already produced `priceBreakdown` server-side, so we lift it
 * directly without recomputing.
 */
export function buildCampaignSnapshot(campaign: Campaign): Record<string, unknown> {
  return {
    schema_version: 1,
    campaign_id: campaign.id.value,
    user_id: campaign.userId.value,
    profile_id: campaign.profileId,
    title: campaign.title,
    category: campaign.category,
    quota: campaign.quota,
    countries: [...campaign.countries],
    price: {
      amount_cents: campaign.priceAmountCents,
      breakdown: campaign.priceBreakdown,
    },
    frozen_at: new Date().toISOString(),
  };
}

/**
 * Stable JSON canonicalisation for hashing. Keys sorted recursively so the
 * hash matches regardless of insert order. Mirror of the algo Phase-1
 * `dedup` would use; kept local because the dedup module is server-only and
 * pulls in node:crypto already.
 */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJSON(v)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJSON(v)}`).join(',')}}`;
}

export function hashSnapshot(snapshot: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJSON(snapshot)).digest('hex');
}
