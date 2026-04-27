import { beforeEach, describe, expect, it } from 'vitest';
import {
  FakeCampaignEventRepo,
  FakeCampaignRepo,
  FakePaymentRepo,
  FakeProfileRepo,
  FixedClock,
} from '../../test/fakes';
import { CampaignId } from '../domain/campaign';
import { UserId } from '../domain/user';
import { createCampaign } from './create-campaign';
import { recordPayment } from './record-payment';

const userId = UserId.from('00000000-0000-0000-0000-000000000001');

async function seedDraft() {
  const clock = new FixedClock();
  const paymentRepo = new FakePaymentRepo(clock);
  const campaignRepo = new FakeCampaignRepo(clock);
  const eventRepo = new FakeCampaignEventRepo(clock);
  const profileRepo = new FakeProfileRepo(clock);
  await profileRepo.create({ userId: userId.value, isDefault: true, name: 'P' });
  const profile = (await profileRepo.findByUserId(userId.value))[0]!;
  const campaign = await createCampaign(
    {
      userId,
      profileId: profile.id.value,
      title: 'X',
      category: 'tech',
      quota: 25,
      countries: [],
    },
    { campaignRepo, profileRepo, clock },
  );
  return { clock, paymentRepo, campaignRepo, eventRepo, campaignId: campaign.id };
}

describe('recordPayment', () => {
  it('flips campaign draft → paid → searching and emits paid + started events', async () => {
    const { paymentRepo, campaignRepo, eventRepo, campaignId } = await seedDraft();
    const payment = await recordPayment(
      {
        userId,
        campaignId,
        provider: 'stars',
        providerChargeId: 'tg_pmt_xxx',
        amountCents: 1250,
        amountProvider: 625,
        currency: 'STARS',
        snapshotData: { v: 1 },
        snapshotHash: 'abc',
        nonce: 'nonce-1',
      },
      { paymentRepo, campaignRepo, campaignEventRepo: eventRepo },
    );
    expect(payment.status).toBe('succeeded');
    const campaign = await campaignRepo.findById(campaignId);
    expect(campaign?.status).toBe('searching');
    const events = await eventRepo.findByCampaignId(campaignId, 10);
    const kinds = events.map((e) => e.kind).sort();
    expect(kinds).toEqual(['paid', 'started']);
  });

  it('is idempotent on duplicate (provider, providerChargeId)', async () => {
    const { paymentRepo, campaignRepo, eventRepo, campaignId } = await seedDraft();
    const first = await recordPayment(
      {
        userId,
        campaignId,
        provider: 'stars',
        providerChargeId: 'tg_pmt_xxx',
        amountCents: 1250,
        amountProvider: 625,
        currency: 'STARS',
        snapshotData: { v: 1 },
        snapshotHash: 'abc',
        nonce: 'nonce-1',
      },
      { paymentRepo, campaignRepo, campaignEventRepo: eventRepo },
    );
    const second = await recordPayment(
      {
        userId,
        campaignId,
        provider: 'stars',
        providerChargeId: 'tg_pmt_xxx',
        amountCents: 1250,
        amountProvider: 625,
        currency: 'STARS',
        snapshotData: { v: 1 },
        snapshotHash: 'abc',
        nonce: 'nonce-1',
      },
      { paymentRepo, campaignRepo, campaignEventRepo: eventRepo },
    );
    expect(second.id).toBe(first.id);
    expect(paymentRepo.size).toBe(1);
  });

  it('rejects when the campaign was deleted between init and confirm', async () => {
    const { paymentRepo, campaignRepo, eventRepo } = await seedDraft();
    const ghost = CampaignId.from('00000000-0000-0000-0000-00000000abcd');
    await expect(
      recordPayment(
        {
          userId,
          campaignId: ghost,
          provider: 'stars',
          providerChargeId: 'tg_pmt_yyy',
          amountCents: 1250,
          amountProvider: 625,
          currency: 'STARS',
          snapshotData: {},
          snapshotHash: 'h',
          nonce: 'n',
        },
        { paymentRepo, campaignRepo, campaignEventRepo: eventRepo },
      ),
    ).rejects.toThrow();
  });
});
