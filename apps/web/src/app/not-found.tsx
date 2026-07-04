import Link from 'next/link';

// Kök seviye 404 — [locale] dışında kalan yollar için; kendi <html>'ini render eder
export default function RootNotFound() {
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
          <p style={{ color: '#5B8DEF', fontFamily: 'monospace', marginBottom: 12 }}>404</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
            Sayfa bulunamadı / Page not found
          </h1>
          <Link
            href="/tr"
            style={{
              background: '#5B8DEF',
              color: '#fff',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ana Sayfa / Home
          </Link>
        </main>
      </body>
    </html>
  );
}
