import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#0A0A0B]">
      <p className="text-sm font-mono text-indigo-400/70 mb-3">404</p>
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Sayfa bulunamadı</h1>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        Panele Dön
      </Link>
    </main>
  );
}
