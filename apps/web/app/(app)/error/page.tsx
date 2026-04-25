import { ErrorScreen } from '@/features/error/error-screen';
import { useTranslations } from 'next-intl';

interface PageProps {
  searchParams: Promise<{ code?: string; detail?: string }>;
}

export default async function ErrorPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <ErrorScreenWrapper code={sp.code ?? 'INVOICE_TIMEOUT'} detail={sp.detail} />;
}

function ErrorScreenWrapper({ code, detail }: { code: string; detail: string | undefined }) {
  const t = useTranslations('screens.error');
  return (
    <ErrorScreen title={t('title')} hint={t('hint')} code={code} detail={detail ?? t('detail')} />
  );
}
