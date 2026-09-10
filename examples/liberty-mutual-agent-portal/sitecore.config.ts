import { defineConfig } from '@sitecore-content-sdk/nextjs/config';

export default defineConfig({
  defaultSite: process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || 'liberty-mutual-agent-portal',
  defaultLanguage: 'en',
  generateStaticPaths: false,
  multisite: { enabled: true, useCookieResolution: () => false },
  personalize: { enabled: process.env.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED === 'true' },
  redirects: { enabled: false },
});
