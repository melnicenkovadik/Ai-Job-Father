import { createClient } from '@supabase/supabase-js';
import { TelegramId } from '@ai-job-bot/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from './types';
import { SupabaseUserRepo } from './user-repo';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Skip the suite if the local Supabase stack isn't reachable.
const supabaseClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function supabaseIsReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SERVICE_ROLE_KEY },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

const describeIfSupabase = (await supabaseIsReachable()) ? describe : describe.skip;

describeIfSupabase('SupabaseUserRepo (integration)', () => {
  const repo = new SupabaseUserRepo(supabaseClient);

  async function cleanupTelegramIds(...ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await supabaseClient.from('users').delete().in('telegram_id', ids);
  }

  const TEST_IDS = [9_000_001, 9_000_002, 9_000_003, 9_000_004];

  beforeAll(async () => {
    await cleanupTelegramIds(...TEST_IDS);
  });

  afterAll(async () => {
    await cleanupTelegramIds(...TEST_IDS);
  });

  beforeEach(async () => {
    await cleanupTelegramIds(...TEST_IDS);
  });

  it('returns null for an unknown telegram id', async () => {
    const user = await repo.findByTelegramId(TelegramId.from(TEST_IDS[0]!));
    expect(user).toBeNull();
  });

  it('upserts a new user and re-reads it', async () => {
    const created = await repo.upsert({
      telegramId: TelegramId.from(TEST_IDS[1]!),
      isPremium: false,
      locale: 'uk',
      firstName: 'Vadym',
      username: 'vad',
    });
    expect(created.locale).toBe('uk');
    expect(created.firstName).toBe('Vadym');

    const found = await repo.findByTelegramId(TelegramId.from(TEST_IDS[1]!));
    expect(found?.id.value).toBe(created.id.value);
    expect(found?.locale).toBe('uk');
  });

  it('upsert is idempotent on telegram_id and preserves identity', async () => {
    const first = await repo.upsert({
      telegramId: TelegramId.from(TEST_IDS[2]!),
      isPremium: false,
      locale: 'en',
    });
    const second = await repo.upsert({
      telegramId: TelegramId.from(TEST_IDS[2]!),
      isPremium: true,
      locale: 'en',
      firstName: 'Updated',
    });
    expect(second.id.equals(first.id)).toBe(true);
    expect(second.isPremium).toBe(true);
    expect(second.firstName).toBe('Updated');
  });

  it('persists all optional profile fields', async () => {
    const user = await repo.upsert({
      telegramId: TelegramId.from(TEST_IDS[3]!),
      isPremium: true,
      locale: 'it',
      username: 'melnicenkovadik',
      firstName: 'Vadym',
      lastName: 'Melnychenko',
      timezone: 'Europe/Rome',
    });
    expect(user.username).toBe('melnicenkovadik');
    expect(user.lastName).toBe('Melnychenko');
    expect(user.timezone).toBe('Europe/Rome');
    expect(user.isPremium).toBe(true);
  });
});
