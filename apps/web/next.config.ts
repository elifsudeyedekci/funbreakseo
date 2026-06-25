import type { NextConfig } from 'next';
import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    // Force a single lucide-react instance across all packages to prevent
    // SSR/client hydration mismatch from version split in pnpm workspace
    config.resolve.alias = {
      ...config.resolve.alias,
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    };
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['funbreakseo.com', 'api.funbreakseo.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    return [
      {
        source: '/sitemap.xml',
        destination: `${apiUrl}/sitemap.xml`,
      },
      {
        source: '/robots.txt',
        destination: `${apiUrl}/robots.txt`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
