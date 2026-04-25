'use client';

import { ErrorScreen } from '@/features/error/error-screen';
import { useTranslations } from 'next-intl';

export default function DevErrorPage() {
  const t = useTranslations('screens.error');
  return (
    <ErrorScreen title={t('title')} hint={t('hint')} code="INVOICE_TIMEOUT" detail={t('detail')} />
  );
}
