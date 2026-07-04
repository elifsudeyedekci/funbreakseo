'use client';

// Kök seviye hata sınırı — kendi <html>/<body>'sini render etmek zorunda
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body style={{ background: '#0A0A0B', color: '#F5F5F7', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#F85149', fontFamily: 'monospace', marginBottom: 12 }}>500</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Bir şeyler ters gitti / Something went wrong
          </h1>
          {error.digest && (
            <p style={{ fontSize: 12, color: '#6B6B73', fontFamily: 'monospace', marginBottom: 24 }}>{error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              background: '#5B8DEF',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tekrar dene / Try again
          </button>
        </main>
      </body>
    </html>
  );
}
