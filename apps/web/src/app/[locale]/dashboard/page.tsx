import { redirect } from 'next/navigation';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const prefix = locale === 'tr' ? '' : `/${locale}`;
  redirect(`${prefix}/dashboard/projects`);
}
