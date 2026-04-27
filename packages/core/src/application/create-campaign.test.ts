import { beforeEach, describe, expect, it } from 'vitest';
import { FakeCampaignRepo, FakeProfileRepo, FixedClock } from '../../test/fakes';
import { UserId } from '../domain/user';
import { ProfileOwnershipError, createCampaign } from './create-campaign';

const userId = UserId.from('00000000-0000-0000-0000-000000000001');
const otherUserId = UserId.from('00000000-0000-0000-0000-000000000099');

describe('createCampaign', () => {
  let clock: FixedClock;
  let campaignRepo: FakeCampaignRepo;
  let profileRepo: FakeProfileRepo;

  beforeEach(async () => {
    clock = new FixedClock('2026-04-28T10:00:00.000Z');
    campaignRepo = new FakeCampaignRepo(clock);
    profileRepo = new FakeProfileRepo(clock);
    await profileRepo.create({
      userId: userId.value,
      isDefault: true,
      name: 'Test Profile',
    });
  });

  it('creates a draft campaign with server-recomputed price', async () => {
    const profile = (await profileRepo.findByUserId(userId.value))[0]!;
    const c = await createCampaign(
      {
        userId,
        profileId: profile.id.value,
        title: 'Senior Frontend Engineer',
        category: 'tech',
        quota: 25,
        countries: ['DE', 'NL'],
      },
      { campaignRepo, profileRepo, clock },
    );
    expect(c.status).toBe('draft');
    expect(c.priceAmountCents).toBeGreaterThan(0);
    // medium tech, quota 25: 50 * 1.0 * 1.0 * 25 = 1250 cents
    expect(c.priceAmountCents).toBe(1250);
    expect(c.priceBreakdown.complexityMultiplier).toBe(1.0);
  });

  it('applies high-complexity multiplier when supplied', async () => {
    const profile = (await profileRepo.findByUserId(userId.value))[0]!;
    const c = await createCampaign(
      {
        userId,
        profileId: profile.id.value,
        title: 'X',
        category: 'tech',
        quota: 25,
        countries: [],
        complexity: 'high',
      },
      { campaignRepo, profileRepo, clock },
    );
    expect(c.priceBreakdown.complexityMultiplier).toBe(1.3);
  });

  it('rejects when profile is owned by another user', async () => {
    const profile = (await profileRepo.findByUserId(userId.value))[0]!;
    await expect(
      createCampaign(
        {
          userId: otherUserId,
          profileId: profile.id.value,
          title: 'X',
          category: 'tech',
          quota: 25,
          countries: [],
        },
        { campaignRepo, profileRepo, clock },
      ),
    ).rejects.toThrow(ProfileOwnershipError);
  });

  it('rejects when profile does not exist', async () => {
    await expect(
      createCampaign(
        {
          userId,
          profileId: 'ghost-id',
          title: 'X',
          category: 'tech',
          quota: 25,
          countries: [],
        },
        { campaignRepo, profileRepo, clock },
      ),
    ).rejects.toThrow(ProfileOwnershipError);
  });
});
