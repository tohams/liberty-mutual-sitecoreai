import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingExcludes: { '*': ['./fixtures/portal-logins.json', './fixtures/udl/**'] },
  images: { remotePatterns: [{ protocol: 'https', hostname: 'edge.sitecorecloud.io' }, { protocol: 'https', hostname: 'edge-platform.sitecorecloud.io' }] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, {
      source: '/resource-metadata',
      headers: [{
        key: 'Content-Security-Policy',
        value: "frame-ancestors https://pages.sitecorecloud.io https://app.sitecorecloud.io https://portal.sitecorecloud.io",
      }],
    }];
  },
  async rewrites() { return [{ source: '/robots.txt', destination: '/api/robots' }]; },
};

export default createNextIntlPlugin()(nextConfig);
