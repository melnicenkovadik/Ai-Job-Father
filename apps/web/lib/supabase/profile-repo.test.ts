import { TelegramId } from '@ai-job-bot/core';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SupabaseProfileRepo } from './profile-repo';
import type { Database } from './types';
import { SupabaseUserRepo } from './user-repo';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabaseClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function profilesTableReachable(): Promise<boolean> {
  try {
    const { error } = await supabaseClient.from('profiles').select('id').limit(0);
    return !error;
  } catch {
    return false;
  }
}

const describeIfSupabase = (await profilesTableReachable()) ? describe : describe.skip;

describeIfSupabase('SupabaseProfileRepo (integration)', () => {
  const userRepo = new SupabaseUserRepo(supabaseClient);
  const profileRepo = new SupabaseProfileRepo(supabaseClient);

  // Reserve a telegram_id range that doesn't collide with user-repo.test.ts (9_000_00x).
  const TEST_TG_IDS = [9_100_001, 9_100_002, 9_100_003];

  async function cleanupUsers(): Promise<void> {
    // Cascade delete of profiles is wired via `on delete cascade` on profiles.user_id.
    await supabaseClient.from('users').delete().in('telegram_id', TEST_TG_IDS);
  }

  async function seedUser(telegramId: number): Promise<string> {
    const user = await userRepo.upsert({
      telegramId: TelegramId.from(telegramId),
      isPremium: false,
      locale: 'en',
    });
    return user.id.value;
  }

  beforeAll(cleanupUsers);
  afterAll(cleanupUsers);
  beforeEach(cleanupUsers);

  it('findById returns null for an unknown id', async () => {
    const found = await profileRepo.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('creates a profile and re-reads it', async () => {
    const userId = await seedUser(TEST_TG_IDS[0]!);
    const created = await profileRepo.create({
      userId,
      name: 'Frontend EU',
      isDefault: true,
      preferredCategories: ['tech'],
      headline: 'Senior Frontend Developer',
      yearsTotal: 7,
      skills: [{ name: 'React', years: 5 }],
    });
    expect(created.name).toBe('Frontend EU');
    expect(created.isDefault).toBe(true);
    expect(created.preferredCategories).toEqual(['tech']);

    const re = await profileRepo.findById(created.id.value);
    expect(re?.name).toBe('Frontend EU');
    expect(re?.skills).toEqual([{ name: 'React', years: 5 }]);
    expect(re?.yearsTotal).toBe(7);
  });

  it('findByUserId returns profiles ordered by created_at ascending', async () => {
    const userId = await seedUser(TEST_TG_IDS[1]!);
    const first = await profileRepo.create({ userId, name: 'A', isDefault: true });
    await new Promise((r) => setTimeout(r, 10));
    const second = await profileRepo.create({ userId, name: 'B' });

    const list = await profileRepo.findByUserId(userId);
    expect(list.map((p) => p.id.value)).toEqual([first.id.value, second.id.value]);
  });

  it('creating a new default demotes the previous default', async () => {
    const userId = await seedUser(TEST_TG_IDS[2]!);
    const a = await profileRepo.create({ userId, name: 'A', isDefault: true });
    const b = await profileRepo.create({ userId, name: 'B', isDefault: true });

    const reA = await profileRepo.findById(a.id.value);
    const reB = await profileRepo.findById(b.id.value);
    expect(reA?.isDefault).toBe(false);
    expect(reB?.isDefault).toBe(true);

    const def = await profileRepo.findDefault(userId);
    expect(def?.id.value).toBe(b.id.value);
  });

  it('update promotes a non-default profile and demotes the existing one', async () => {
    const userId = await seedUser(TEST_TG_IDS[0]!);
    const a = await profileRepo.create({ userId, name: 'A', isDefault: true });
    const b = await profileRepo.create({ userId, name: 'B' });

    const promoted = await profileRepo.update({ id: b.id.value, isDefault: true });
    expect(promoted.isDefault).toBe(true);

    const reA = await profileRepo.findById(a.id.value);
    expect(reA?.isDefault).toBe(false);
  });

  it('update leaves unchanged fields intact', async () => {
    const userId = await seedUser(TEST_TG_IDS[1]!);
    const p = await profileRepo.create({
      userId,
      name: 'A',
      headline: 'Initial headline',
      yearsTotal: 5,
      skills: [{ name: 'React' }],
    });
    const updated = await profileRepo.update({
      id: p.id.value,
      yearsTotal: 10,
    });
    expect(updated.yearsTotal).toBe(10);
    expect(updated.headline).toBe('Initial headline');
    expect(updated.skills).toEqual([{ name: 'React' }]);
  });

  it('delete removes the row', async () => {
    const userId = await seedUser(TEST_TG_IDS[2]!);
    const p = await profileRepo.create({ userId, name: 'Temp' });
    await profileRepo.delete(p.id.value);
    const re = await profileRepo.findById(p.id.value);
    expect(re).toBeNull();
  });

  it('persists JSONB languages round-trip with CEFR levels', async () => {
    const userId = await seedUser(TEST_TG_IDS[0]!);
    const p = await profileRepo.create({
      userId,
      name: 'Multi',
      languages: [
        { code: 'en', level: 'C1' },
        { code: 'it', level: 'B1' },
      ],
    });
    const re = await profileRepo.findById(p.id.value);
    expect(re?.languages).toEqual([
      { code: 'en', level: 'C1' },
      { code: 'it', level: 'B1' },
    ]);
  });
});
