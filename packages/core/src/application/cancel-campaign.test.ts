import { beforeEach, describe, expect, it } from 'vitest';
import { FakeCampaignRepo, FakeProfileRepo, FixedClock } from '../../test/fakes';
import { CampaignId } from '../domain/campaign';
import { UserId } from '../domain/user';
import {
  CampaignNotFoundError,
  CampaignOwnershipError,
  cancelCampaign,
} from './cancel-campaign';
import { createCampaign } from './create-campaign';

const userId = UserId.from('00000000-0000-0000-0000-000000000001');
const other = UserId.from('00000000-0000-0000-0000-000000000099');

async function seedDraft(): Promise<{
  clock: FixedClock;
  repo: FakeCampaignRepo;
  campaignId: CampaignId;
}> {
  const clock = new FixedClock();
  const repo = new FakeCampaignRepo(clock);
  const profileRepo = new FakeProfileRepo(clock);
  await profileRepo.create({ userId: userId.value, isDefault: true, name: 'P' });
  const profile = (await profileRepo.findByUserId(userId.value))[0]!;
  const c = await createCampaign(
    {
      userId,
      profileId: profile.id.value,
      title: 'X',
      category: 'tech',
      quota: 25,
      countries: [],
    },
    { campaignRepo: repo, profileRepo, clock },
  );
  return { clock, repo, campaignId: c.id };
}

describe('cancelCampaign', () => {
  it('flips draft → cancelled', async () => {
    const { clock, repo, campaignId } = await seedDraft();
    const cancelled = await cancelCampaign({ id: campaignId, userId }, { campaignRepo: repo });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledAt).toEqual(clock.now());
  });

  it('is idempotent on a second call', async () => {
    const { repo, campaignId } = await seedDraft();
    await cancelCampaign({ id: campaignId, userId }, { campaignRepo: repo });
    const second = await cancelCampaign({ id: campaignId, userId }, { campaignRepo: repo });
    expect(second.status).toBe('cancelled');
  });

  it('rejects on missing campaign', async () => {
    const { repo } = await seedDraft();
    await expect(
      cancelCampaign(
        { id: CampaignId.from('not-found'), userId },
        { campaignRepo: repo },
      ),
    ).rejects.toThrow(CampaignNotFoundError);
  });

  it('rejects when campaign belongs to another user', async () => {
    const { repo, campaignId } = await seedDraft();
    await expect(
      cancelCampaign({ id: campaignId, userId: other }, { campaignRepo: repo }),
    ).rejects.toThrow(CampaignOwnershipError);
  });
});
