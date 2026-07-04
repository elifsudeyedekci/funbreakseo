'use client';

// Outreach platform tarafından merkezi yürütülür — müşteri backlink havuzunu kullanır.
import { redirect, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function ProjectOutreachRedirect() {
  const locale = useLocale();
  const { projectId } = useParams<{ projectId: string }>();
  redirect(`/${locale}/dashboard/projects/${projectId}/backlinks`);
}
