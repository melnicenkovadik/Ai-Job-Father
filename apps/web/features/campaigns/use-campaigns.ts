'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import { getBrowserLogger } from '@/lib/logger';
import type { JobCategory } from '@ai-job-bot/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CampaignDto {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  category: JobCategory;
  status: 'draft' | 'paid' | 'searching' | 'applying' | 'completed' | 'failed' | 'cancelled';
  quota: number;
  countries: string[];
  priceAmountCents: number;
  priceBreakdown: {
    baseRateCents: number;
    categoryMultiplier: number;
    complexityMultiplier: number;
    quota: number;
    amountCents: number;
  };
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

export interface CampaignEventDto {
  id: string;
  campaignId: string;
  kind: 'paid' | 'started' | 'found' | 'applied' | 'completed' | 'failed' | 'info';
  text: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

const ACTIVE_STATUSES = new Set<CampaignDto['status']>(['searching', 'applying', 'paid']);

export function isCampaignActive(c: Pick<CampaignDto, 'status'>): boolean {
  return ACTIVE_STATUSES.has(c.status);
}

async function fetchCampaigns(): Promise<CampaignDto[]> {
  const res = await authedFetch('/api/campaigns');
  if (!res.ok) throw new Error(`campaigns_list_failed_${res.status}`);
  const body = (await res.json()) as { campaigns: CampaignDto[] };
  return body.campaigns;
}

async function fetchCampaign(id: string): Promise<CampaignDto> {
  const res = await authedFetch(`/api/campaigns/${id}`);
  if (!res.ok) throw new Error(`campaign_get_failed_${res.status}`);
  return (await res.json()) as CampaignDto;
}

async function fetchEvents(id: string): Promise<CampaignEventDto[]> {
  const res = await authedFetch(`/api/campaigns/${id}/events`);
  if (!res.ok) throw new Error(`campaign_events_failed_${res.status}`);
  const body = (await res.json()) as { events: CampaignEventDto[] };
  return body.events;
}

export interface CreateCampaignBody {
  profileId: string;
  title: string;
  category: JobCategory;
  quota: number;
  countries: string[];
  complexity?: 'low' | 'medium' | 'high';
}

async function postCampaign(body: CreateCampaignBody): Promise<CampaignDto> {
  const res = await authedFetch('/api/campaigns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `campaign_create_failed_${res.status}`);
  }
  return (await res.json()) as CampaignDto;
}

async function postCancel(id: string): Promise<CampaignDto> {
  const res = await authedFetch(`/api/campaigns/${id}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `campaign_cancel_failed_${res.status}`);
  }
  return (await res.json()) as CampaignDto;
}

export function useCampaignsQuery() {
  return useQuery<CampaignDto[], Error>({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
    staleTime: 10_000,
    refetchOnWindowFocus: 'always',
  });
}

export function useCampaignQuery(id: string) {
  return useQuery<CampaignDto, Error>({
    queryKey: ['campaigns', id],
    queryFn: () => fetchCampaign(id),
    staleTime: 5_000,
    enabled: id.length > 0,
  });
}

export function useCampaignEventsQuery(id: string) {
  return useQuery<CampaignEventDto[], Error>({
    queryKey: ['campaigns', id, 'events'],
    queryFn: () => fetchEvents(id),
    staleTime: 5_000,
    enabled: id.length > 0,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation<CampaignDto, Error, CreateCampaignBody>({
    mutationFn: postCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err) => {
      getBrowserLogger().error({
        context: 'features/campaigns.create',
        message: err.message,
        error: err,
      });
    },
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation<CampaignDto, Error, string>({
    mutationFn: postCancel,
    onSuccess: (campaign) => {
      qc.setQueryData(['campaigns', campaign.id], campaign);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err) => {
      getBrowserLogger().error({
        context: 'features/campaigns.cancel',
        message: err.message,
        error: err,
      });
    },
  });
}
