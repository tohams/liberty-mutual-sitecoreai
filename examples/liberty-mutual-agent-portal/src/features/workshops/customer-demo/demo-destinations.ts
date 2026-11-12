/** Shared launch destinations for the private presenter guides. */
export const PUBLIC = "https://liberty-mutual-public-site.vercel.app";
export const PORTAL = "https://liberty-mutual-agent-portal.vercel.app";
export const ORG = "org_XqL3u1MSNVuubOTb";
export const TENANT = "97eea84c-ac47-4d91-7e4f-08defdaaa7df";
export const TENANT_NAME = "scaipocusem400b-sitecoreai950c-demo4418";
export const SITECORE_AI = `https://app.sitecorecloud.io/channels?organization=${ORG}&tenantName=${TENANT_NAME}`;
export const CONTEXT = `organization=${ORG}&tenantId=${TENANT}`;
export const SEARCH_SOURCE = `https://app.sitecorecloud.io/search/f527245d-98c7-4978-8802-237d7717ca43/preview?${CONTEXT}`;
export const ANALYTICS = `https://app.sitecorecloud.io/optimization/dashboards/events?${CONTEXT}`;
export const MARKETING_ELIGIBILITY = `https://app.sitecorecloud.io/optimization/personalization/af90f4c1-20ab-4ae3-871d-97e91f22431b?experienceType=INTERACTIVE_API_FLOW&section=configuration&operationalTimeWindow=15m&${CONTEXT}`;
export const BUNDLING = `${PUBLIC}/bundling`;
export const BUNDLING_PAGE_ID = "7d7352f2-0c45-5093-b9e6-fbeae4e08953";
export const BUNDLING_FAQ_ID = "8c73b233-9576-52d7-bd5a-a78756a08c14";
export const BUNDLING_FAQ = `${BUNDLING}#faq-${BUNDLING_FAQ_ID}`;
export const GRAPHQL_EXPLORER = "https://edge.sitecorecloud.io/api/graphql/ide";
export const SCRUNCH_CONTEXT =
  "organization=org_vDtrEzJHxeuuB9cD&tenantName=sitecoresaa7acd-agverticals97fd-agvertsc3b5";
export const SCRUNCH_REVIEW = `https://app.sitecorecloud.io/channels/collection/45177ac3175042dc9bc748d76ba0858a/sites/d4c417d9-0acf-44f9-aec8-c94730b872bb/aeo-opportunities/readability/review?url=https%3A%2F%2Fprospera-bank.vercel.app%2F&${SCRUNCH_CONTEXT}`;
export const SCRUNCH_EDITOR = `https://pages.sitecorecloud.io/editor?${SCRUNCH_CONTEXT}&sc_site=prospera&sc_lang=en&sc_itemid=69fc0a48-3e75-426e-9b2b-296d7a3bf8a4&sc_aeo=1&sc_aeo_item=ca10c042-247a-4836-9d07-92a9e2224a7f&sc_aeo_field=Cards+%C2%B7+Description`;

export const PUBLIC_HOME_ID = "6d600332-3e21-4c5f-83ec-aae04f83450f";
export const PORTAL_HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
export const BRAND_KITS = `https://app.sitecorecloud.io/design/brandkits?organization=${ORG}&tenantName=${TENANT_NAME}`;
export const PRIORITIES_ID = "3127968e-4b21-50c3-ad79-b6bbbe5303b8";
export const COPYRIGHT_ID = "9dc572ee-3d67-5909-922f-6482def1cdb0";

export function pageBuilder(
  site: "public" | "portal",
  itemId: string,
  mode: "editor" | "content" = "editor",
) {
  const siteName =
    site === "public"
      ? "liberty-mutual-public-site"
      : "liberty-mutual-agent-portal";
  return `https://pages.sitecorecloud.io/${mode}?tenantName=${TENANT_NAME}&sc_site=${siteName}&organization=${ORG}&sc_itemid=${itemId}&sc_lang=en`;
}

export const bundlingFaqContent = pageBuilder(
  "public",
  BUNDLING_FAQ_ID,
  "content",
);
export const publicEditor = pageBuilder("public", PUBLIC_HOME_ID);
export const portalEditor = pageBuilder("portal", PORTAL_HOME_ID);
export const priorityContent = pageBuilder("portal", PRIORITIES_ID, "content");
export const copyrightContent = pageBuilder("public", COPYRIGHT_ID, "content");
