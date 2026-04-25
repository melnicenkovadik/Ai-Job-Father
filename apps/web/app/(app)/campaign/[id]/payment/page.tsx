import { PaymentScreen } from '@/features/payment/payment-screen';
import type { PaymentMethod } from '@/lib/mocks/types';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ method?: string; simulate?: string }>;
}

const isMethod = (v: string | undefined): v is PaymentMethod => v === 'stars' || v === 'ton';
const isSimulate = (v: string | undefined): v is 'success' | 'fail' =>
  v === 'success' || v === 'fail';

export default async function CampaignPaymentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const method: PaymentMethod = isMethod(sp.method) ? sp.method : 'stars';
  if (isSimulate(sp.simulate)) {
    return <PaymentScreen campaignId={id} method={method} simulate={sp.simulate} />;
  }
  return <PaymentScreen campaignId={id} method={method} />;
}
