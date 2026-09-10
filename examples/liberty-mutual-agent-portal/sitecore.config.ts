import { defineConfig } from '@sitecore-content-sdk/nextjs/config';

function timeout(value: string | undefined, fallback: number): number {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : fallback;
}

export default defineConfig({
  defaultSite: process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || 'liberty-mutual-agent-portal',
  defaultLanguage: 'en',
  generateStaticPaths: false,
  multisite: { enabled: true, useCookieResolution: () => false },
  personalize: {
    enabled: process.env.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED === 'true',
    edgeTimeout: timeout(process.env.PERSONALIZE_MIDDLEWARE_EDGE_TIMEOUT, 1500),
    cdpTimeout: timeout(process.env.PERSONALIZE_MIDDLEWARE_CDP_TIMEOUT, 2000),
  },
  redirects: { enabled: false },
});
