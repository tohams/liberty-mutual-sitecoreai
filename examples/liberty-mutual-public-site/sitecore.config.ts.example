import { defineConfig } from "@sitecore-content-sdk/nextjs/config";

/** The dedicated public head uses Preview and Live context IDs configured per environment. */
export default defineConfig({
  // This head uses developer-owned React components; optional source-code extraction is unused.
  disableCodeGeneration: true,
  api: {
    edge: {
      contextId:
        process.env.SITECORE_EDGE_CONTEXT_ID ||
        process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID ||
        "",
      clientContextId: process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID,
      edgeUrl: process.env.NEXT_PUBLIC_SITECORE_EDGE_PLATFORM_HOSTNAME,
    },
  },
  defaultSite:
    process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || "liberty-mutual-public-site",
  defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en",
  editingSecret: process.env.SITECORE_EDITING_SECRET,
  generateStaticPaths: false,
  redirects: { enabled: true, locales: ["en"] },
  multisite: { enabled: true, useCookieResolution: () => false },
  personalize: {
    scope:
      process.env.NEXT_PUBLIC_PERSONALIZE_SCOPE || "liberty-mutual-public-site",
    edgeTimeout: Number(process.env.PERSONALIZE_MIDDLEWARE_EDGE_TIMEOUT || 500),
    cdpTimeout: Number(process.env.PERSONALIZE_MIDDLEWARE_CDP_TIMEOUT || 500),
  },
});
