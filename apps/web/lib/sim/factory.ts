import 'server-only';
import type { CampaignProgressDriver } from '@ai-job-bot/core';
import { SupabaseCampaignRepo } from '../supabase/campaign-repo';
import { SimulatorDriver } from './simulator-driver';
import { SimulatorStateRepo } from './simulator-state-repo';

let cached: CampaignProgressDriver | null = null;

/**
 * Pluggable factory for the campaign progress driver. The real downstream
 * scraper will swap this implementation without touching the use cases or
 * route handlers.
 */
export function getCampaignProgressDriver(): CampaignProgressDriver {
  if (cached) return cached;
  cached = new SimulatorDriver(new SimulatorStateRepo(), new SupabaseCampaignRepo());
  return cached;
}

const SystemClock = { now: () => new Date() };
export { SystemClock };
