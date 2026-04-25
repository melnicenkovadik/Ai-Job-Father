import { CheckoutScreen } from '@/features/checkout/checkout-screen';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignCheckoutPage({ params }: PageProps) {
  const { id } = await params;
  return <CheckoutScreen campaignId={id} />;
}
