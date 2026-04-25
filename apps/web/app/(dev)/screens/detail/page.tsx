import { CampaignDetailScreen } from '@/features/campaign-detail/campaign-detail-screen';
import { SEED_CAMPAIGNS } from '@/lib/mocks/seed';

export default function DevDetailPage() {
  const campaignId = SEED_CAMPAIGNS[0]?.id ?? 'c-7a2f';
  return <CampaignDetailScreen campaignId={campaignId} />;
}
