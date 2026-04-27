import {
  type CAMPAIGN_STATUSES,
  type Campaign,
  type CampaignEvent,
  JOB_CATEGORIES,
  type PricingBreakdown,
} from '@ai-job-bot/core';
import { z } from 'zod';

export const createCampaignSchema = z.object({
  profileId: z.string().min(1),
  title: z.string().min(1).max(80),
  category: z.enum(JOB_CATEGORIES),
  quota: z.number().int().min(1).max(500),
  countries: z.array(z.string().min(1).max(32)).max(15).default([]),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
});
export type CreateCampaignBody = z.infer<typeof createCampaignSchema>;

export interface CampaignDto {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  category: (typeof JOB_CATEGORIES)[number];
  status: (typeof CAMPAIGN_STATUSES)[number];
  quota: number;
  countries: string[];
  priceAmountCents: number;
  priceBreakdown: PricingBreakdown;
  progress: { found: number; applied: number };
  paidAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lastTickedAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function campaignToDto(c: Campaign): CampaignDto {
  return {
    id: c.id.value,
    userId: c.userId.value,
    profileId: c.profileId,
    title: c.title,
    category: c.category,
    status: c.status,
    quota: c.quota,
    countries: [...c.countries],
    priceAmountCents: c.priceAmountCents,
    priceBreakdown: c.priceBreakdown,
    progress: { found: c.progressFound, applied: c.progressApplied },
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    startedAt: c.startedAt ? c.startedAt.toISOString() : null,
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
    cancelledAt: c.cancelledAt ? c.cancelledAt.toISOString() : null,
    lastTickedAt: c.lastTickedAt ? c.lastTickedAt.toISOString() : null,
    lastEventAt: c.lastEventAt ? c.lastEventAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export interface CampaignEventDto {
  id: string;
  campaignId: string;
  kind: CampaignEvent['kind'];
  text: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export function eventToDto(e: CampaignEvent): CampaignEventDto {
  return {
    id: e.id,
    campaignId: e.campaignId.value,
    kind: e.kind,
    text: e.text,
    data: e.data ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}
