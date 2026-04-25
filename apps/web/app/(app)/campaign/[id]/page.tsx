import { CampaignDetailScreen } from '@/features/campaign-detail/campaign-detail-screen';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CampaignDetailScreen campaignId={id} />;
}
