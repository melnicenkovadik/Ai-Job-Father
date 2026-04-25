import { PaymentScreen } from '@/features/payment/payment-screen';
import { SEED_CAMPAIGNS } from '@/lib/mocks/seed';
import type { PaymentMethod } from '@/lib/mocks/types';

interface PageProps {
  searchParams: Promise<{ method?: string; phase?: string; simulate?: string }>;
}

const isMethod = (v: string | undefined): v is PaymentMethod => v === 'stars' || v === 'ton';
const isPhase = (v: string | undefined): v is 'processing' | 'success' | 'fail' =>
  v === 'processing' || v === 'success' || v === 'fail';
const isSimulate = (v: string | undefined): v is 'success' | 'fail' =>
  v === 'success' || v === 'fail';

export default async function DevPaymentPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const campaignId = SEED_CAMPAIGNS[0]?.id ?? 'c-7a2f';
  const method: PaymentMethod = isMethod(sp.method) ? sp.method : 'stars';
  const props: {
    campaignId: string;
    method: PaymentMethod;
    initialPhase?: 'processing' | 'success' | 'fail';
    simulate?: 'success' | 'fail';
  } = { campaignId, method };
  if (isPhase(sp.phase)) props.initialPhase = sp.phase;
  if (isSimulate(sp.simulate)) props.simulate = sp.simulate;
  return <PaymentScreen {...props} />;
}
