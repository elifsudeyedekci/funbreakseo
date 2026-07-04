'use client';

// Outreach artık platform tarafından merkezi yürütülür (backlink havuzunu besler).
// Müşteri linkleri doğrudan havuzdan satın alır — bu sayfa havuza yönlendirir.
import { redirect } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function OutreachRedirect() {
  const locale = useLocale();
  redirect(`/${locale}/dashboard/backlinks`);
}
