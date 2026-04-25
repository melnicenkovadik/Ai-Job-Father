import { WizardScreen } from '@/features/wizard/wizard-screen';

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function DevWizardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = Number(sp.step);
  if (Number.isFinite(parsed)) return <WizardScreen initialStep={parsed} />;
  return <WizardScreen />;
}
