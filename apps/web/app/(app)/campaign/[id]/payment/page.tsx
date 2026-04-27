import { PaymentScreen } from '@/features/payment/payment-screen';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ method?: string }>;
}

export default async function CampaignPaymentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const method: 'stars' | 'ton' = sp.method === 'ton' ? 'ton' : 'stars';
  return <PaymentScreen campaignId={id} method={method} />;
}
