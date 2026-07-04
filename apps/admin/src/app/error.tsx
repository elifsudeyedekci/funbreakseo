'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#0A0A0B]">
      <p className="text-sm font-mono text-red-400/70 mb-3">500</p>
      <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Bir hata oluştu</h1>
      {error.digest && <p className="text-xs text-white/25 font-mono mb-6">{error.digest}</p>}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        Tekrar Dene
      </button>
    </main>
  );
}
