import { beforeEach, describe, expect, it } from 'vitest';
import { FakeProfileRepo } from '../../test/fakes/fake-profile-repo';
import { FixedClock } from '../../test/fakes/fixed-clock';
import { createProfile, deleteProfile, updateProfile } from './save-profile';

function freshDeps() {
  const clock = new FixedClock(new Date('2026-04-17T08:00:00Z'));
  const profileRepo = new FakeProfileRepo(clock);
  return { clock, profileRepo };
}

describe('createProfile', () => {
  it('marks the first profile as default automatically', async () => {
    const deps = freshDeps();
    const p = await createProfile({ userId: 'user-1', name: 'Frontend EU' }, deps);
    expect(p.isDefault).toBe(true);
  });

  it('keeps subsequent profiles non-default by default', async () => {
    const deps = freshDeps();
    await createProfile({ userId: 'user-1', name: 'Frontend EU' }, deps);
    const second = await createProfile({ userId: 'user-1', name: 'AI Senior US' }, deps);
    expect(second.isDefault).toBe(false);
  });

  it('demotes the existing default when isDefault:true is requested', async () => {
    const deps = freshDeps();
    const first = await createProfile({ userId: 'user-1', name: 'Frontend EU' }, deps);
    const second = await createProfile(
      { userId: 'user-1', name: 'AI Senior US', isDefault: true },
      deps,
    );
    const firstAfter = await deps.profileRepo.findById(first.id.value);
    expect(second.isDefault).toBe(true);
    expect(firstAfter?.isDefault).toBe(false);
  });

  it('does not affect other users when creating a default', async () => {
    const deps = freshDeps();
    const alice = await createProfile({ userId: 'alice', name: 'A' }, deps);
    const bob = await createProfile({ userId: 'bob', name: 'B' }, deps);
    expect(alice.isDefault).toBe(true);
    expect(bob.isDefault).toBe(true);
  });
});

describe('updateProfile', () => {
  it('partial update preserves unspecified fields', async () => {
    const deps = freshDeps();
    const created = await createProfile(
      { userId: 'user-1', name: 'A', headline: 'Original' },
      deps,
    );
    deps.clock.tick(60_000);
    const updated = await updateProfile({ id: created.id.value, name: 'B' }, deps);
    expect(updated.name).toBe('B');
    expect(updated.headline).toBe('Original');
  });

  it('flipping isDefault to true demotes the prior default', async () => {
    const deps = freshDeps();
    const a = await createProfile({ userId: 'user-1', name: 'A' }, deps);
    const b = await createProfile({ userId: 'user-1', name: 'B' }, deps);
    const bPromoted = await updateProfile({ id: b.id.value, isDefault: true }, deps);
    const aAfter = await deps.profileRepo.findById(a.id.value);
    expect(bPromoted.isDefault).toBe(true);
    expect(aAfter?.isDefault).toBe(false);
  });
});

describe('deleteProfile', () => {
  it('removes the row', async () => {
    const deps = freshDeps();
    const p = await createProfile({ userId: 'user-1', name: 'A' }, deps);
    await deleteProfile(p.id.value, deps);
    expect(await deps.profileRepo.findById(p.id.value)).toBeNull();
  });
});

describe('findByUserId + findDefault', () => {
  let deps: ReturnType<typeof freshDeps>;
  beforeEach(async () => {
    deps = freshDeps();
    await createProfile({ userId: 'user-1', name: 'A' }, deps);
    await createProfile({ userId: 'user-1', name: 'B' }, deps);
    await createProfile({ userId: 'user-2', name: 'C' }, deps);
  });

  it('returns all user profiles', async () => {
    const all = await deps.profileRepo.findByUserId('user-1');
    expect(all.map((p) => p.name).sort()).toEqual(['A', 'B']);
  });

  it('returns only the default for findDefault', async () => {
    const def = await deps.profileRepo.findDefault('user-1');
    expect(def?.name).toBe('A');
  });
});
