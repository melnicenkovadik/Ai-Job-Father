import { CheckoutScreen } from '@/features/checkout/checkout-screen';
import { SEED_CAMPAIGNS } from '@/lib/mocks/seed';

export default function DevCheckoutPage() {
  const campaignId = SEED_CAMPAIGNS[0]?.id ?? 'c-7a2f';
  return <CheckoutScreen campaignId={campaignId} />;
}
