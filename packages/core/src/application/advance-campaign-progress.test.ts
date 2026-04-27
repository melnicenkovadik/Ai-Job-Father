import { beforeEach, describe, expect, it } from 'vitest';
import {
  FakeCampaignEventRepo,
  FakeCampaignRepo,
  FakeProgressDriver,
  FakeProfileRepo,
  FixedClock,
} from '../../test/fakes';
import { CampaignEventFactory } from '../domain/campaign-event';
import { UserId } from '../domain/user';
import { advanceCampaignProgress } from './advance-campaign-progress';
import { createCampaign } from './create-campaign';

const userId = UserId.from('00000000-0000-0000-0000-000000000001');

async function seedRunning() {
  const clock = new FixedClock();
  const campaignRepo = new FakeCampaignRepo(clock);
  const eventRepo = new FakeCampaignEventRepo(clock);
  const profileRepo = new FakeProfileRepo(clock);
  const driver = new FakeProgressDriver();
  await profileRepo.create({ userId: userId.value, isDefault: true, name: 'P' });
  const profile = (await profileRepo.findByUserId(userId.value))[0]!;
  const draft = await createCampaign(
    {
      userId,
      profileId: profile.id.value,
      title: 'X',
      category: 'tech',
      quota: 10,
      countries: [],
    },
    { campaignRepo, profileRepo, clock },
  );
  await campaignRepo.updateStatus(draft.id, 'paid');
  await campaignRepo.updateStatus(draft.id, 'searching');
  return { clock, campaignRepo, eventRepo, driver, campaignId: draft.id };
}

describe('advanceCampaignProgress', () => {
  it('no-ops when driver returns null', async () => {
    const { clock, campaignRepo, eventRepo, driver, campaignId } = await seedRunning();
    const result = await advanceCampaignProgress(
      { campaignId },
      {
        campaignRepo,
        campaignEventRepo: eventRepo,
        campaignProgressDriver: driver,
        clock,
      },
    );
    expect(result.tick).toBeNull();
    expect(result.campaign.progressFound).toBe(0);
  });

  it('applies progress + events from driver', async () => {
    const { clock, campaignRepo, eventRepo, driver, campaignId } = await seedRunning();
    driver.enqueue({
      foundDelta: 3,
      appliedDelta: 1,
      events: [CampaignEventFactory.found(campaignId, userId, 'Klarna', 3)],
      nextStatus: null,
    });
    const result = await advanceCampaignProgress(
      { campaignId },
      {
        campaignRepo,
        campaignEventRepo: eventRepo,
        campaignProgressDriver: driver,
        clock,
      },
    );
    expect(result.campaign.progressFound).toBe(3);
    expect(result.campaign.progressApplied).toBe(1);
    expect(eventRepo.size).toBe(1);
  });

  it('graduates to completed when applied == quota', async () => {
    const { clock, campaignRepo, eventRepo, driver, campaignId } = await seedRunning();
    driver.enqueue({
      foundDelta: 12,
      appliedDelta: 10,
      events: [CampaignEventFactory.completed(campaignId, userId, 10)],
      nextStatus: 'completed',
    });
    const result = await advanceCampaignProgress(
      { campaignId },
      {
        campaignRepo,
        campaignEventRepo: eventRepo,
        campaignProgressDriver: driver,
        clock,
      },
    );
    expect(result.campaign.status).toBe('completed');
    expect(result.campaign.progressApplied).toBe(10);
  });

  it('returns campaign untouched when status is not active', async () => {
    const { clock, campaignRepo, eventRepo, driver, campaignId } = await seedRunning();
    await campaignRepo.updateStatus(campaignId, 'completed');
    const result = await advanceCampaignProgress(
      { campaignId },
      {
        campaignRepo,
        campaignEventRepo: eventRepo,
        campaignProgressDriver: driver,
        clock,
      },
    );
    expect(result.tick).toBeNull();
    expect(result.campaign.status).toBe('completed');
  });
});
