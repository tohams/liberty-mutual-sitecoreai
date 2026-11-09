const PUBLIC_SITE = "liberty-mutual-public-site";
const PUBLIC_HOME =
  "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Home";
const ORGANIZATION = "org_XqL3u1MSNVuubOTb";
const TENANT_NAME = "scaipocusem400b-sitecoreai950c-demo4418";

type Context = {
  siteInfo?: { name?: unknown };
  pageInfo?: {
    id?: unknown;
    path?: unknown;
    language?: unknown;
    version?: unknown;
  };
};

/** The public site uses native Checklist fields, so its panel never queries or saves metadata. */
export function isPublicMetadataContext(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    (value as Context).siteInfo?.name === PUBLIC_SITE
  );
}

export function publicPageContentUrl(value: unknown): string | null {
  if (!isPublicMetadataContext(value)) return null;
  const page = (value as Context).pageInfo;
  if (
    !page ||
    typeof page.id !== "string" ||
    !/^(?:[a-f\d]{32}|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(
      page.id,
    ) ||
    typeof page.path !== "string" ||
    (page.path !== PUBLIC_HOME && !page.path.startsWith(PUBLIC_HOME + "/")) ||
    page.path.includes("/../") ||
    typeof page.language !== "string" ||
    !/^[a-z]{2}(?:-[a-z0-9]{2,8})*$/i.test(page.language) ||
    typeof page.version !== "number" ||
    !Number.isSafeInteger(page.version) ||
    page.version < 1
  )
    return null;
  const url = new URL("https://pages.sitecorecloud.io/content");
  url.search = new URLSearchParams({
    tenantName: TENANT_NAME,
    sc_site: PUBLIC_SITE,
    organization: ORGANIZATION,
    sc_itemid: page.id.replace(/[{}]/g, ""),
    sc_lang: page.language,
    sc_version: String(page.version),
  }).toString();
  return url.href;
}
