'use client';

import { redirect } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function AuditPage() {
  const locale = useLocale();
  redirect(`/${locale}/dashboard/crawl`);
}
