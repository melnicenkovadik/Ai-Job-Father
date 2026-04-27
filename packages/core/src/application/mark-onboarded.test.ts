import { describe, expect, it } from 'vitest';
import { FakeUserSettingsRepo, FixedClock } from '../../test/fakes';
import { UserId } from '../domain/user';
import { markOnboarded } from './mark-onboarded';

const aUserId = UserId.from('00000000-0000-0000-0000-000000000001');

describe('markOnboarded', () => {
  it('sets hasOnboarded=true', async () => {
    const clock = new FixedClock();
    const repo = new FakeUserSettingsRepo(clock);
    repo.seed(aUserId, 'en');
    const result = await markOnboarded(aUserId, { userSettingsRepo: repo });
    expect(result.hasOnboarded).toBe(true);
  });

  it('is idempotent — second call still returns hasOnboarded=true', async () => {
    const clock = new FixedClock();
    const repo = new FakeUserSettingsRepo(clock);
    repo.seed(aUserId, 'en');
    await markOnboarded(aUserId, { userSettingsRepo: repo });
    const second = await markOnboarded(aUserId, { userSettingsRepo: repo });
    expect(second.hasOnboarded).toBe(true);
  });
});
