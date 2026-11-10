import "server-only";
import {
  AudiencePreviewError,
  audiencePreviewApiConfiguration,
} from "./audience-preview-config";

const GATEWAY = "https://edge-platform.sitecorecloud.io";
const SITES = [
  {
    id: "e1624003-27d5-49c4-9aa6-32563bdf2277",
    name: "liberty-mutual-agent-portal",
    root: "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal",
  },
] as const;

export interface AudiencePreviewPageRequest {
  pageId: string;
  language: string;
  version?: number;
}

export interface AudiencePreviewPage {
  id: string;
  name: string;
  /** Authoritative route relative to the site's Home item. */
  path: string;
  contentPath: string;
  siteName: string;
  language: string;
  version: number;
}

function itemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/^\{(.+)\}$/, "$1").toLowerCase();
  if (/^[0-9a-f]{32}$/.test(normalized)) {
    return normalized.replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5",
    );
  }
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AudiencePreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an invalid page response.",
      502,
    );
  }
  return value as Record<string, unknown>;
}

function siteForPath(value: unknown, pageOnly = false) {
  if (typeof value !== "string" || /[\\\u0000-\u001f]/.test(value)) return null;
  const path = `/${value.toLowerCase().replace(/^\/+|\/+$/g, "")}`;
  if (path.split("/").some((part) => part === "." || part === ".."))
    return null;
  return SITES.find((site) => {
    const root = `${site.root}${pageOnly ? "/Home" : ""}`.toLowerCase();
    return path === root || path.startsWith(`${root}/`);
  });
}

async function readSitecore(
  pathname: string,
  parameters: Record<string, string>,
  accessToken: string,
  contextId: string,
): Promise<Record<string, unknown>> {
  const url = new URL(pathname, GATEWAY);
  url.search = new URLSearchParams({
    ...parameters,
    sitecoreContextId: contextId,
  }).toString();
  let response: Response;
  try {
    // These paths and headers follow @sitecore-marketplace-sdk/xmc 0.5.0.
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "sc-resource": "marketplace",
        "sc-marketplace-auth": "interactive/v1",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AudiencePreviewError(
      "SITECORE_UNAVAILABLE",
      "SitecoreAI could not load this page. Please try again.",
      502,
    );
  }
  if (!response.ok) {
    const correlation = [
      "x-request-id",
      "x-correlation-id",
      "x-sitecore-request-id",
      "traceparent",
    ]
      .map((name) => response.headers.get(name))
      .find((value) => value && /^[A-Za-z0-9._-]{1,128}$/.test(value));
    console.warn("Audience Preview Sitecore request rejected", {
      status: response.status,
      path: pathname,
      ...(correlation ? { correlationId: correlation } : {}),
    });
    void response.body?.cancel().catch(() => undefined);
    const status = [401, 403, 404].includes(response.status)
      ? response.status
      : 502;
    throw new AudiencePreviewError(
      "PAGE_ACCESS_DENIED",
      "This SitecoreAI account cannot preview the selected page and version.",
      status,
    );
  }
  try {
    return record(await response.json());
  } catch (error) {
    if (error instanceof AudiencePreviewError) throw error;
    throw new AudiencePreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an invalid page response.",
      502,
    );
  }
}

/** Re-authorize the selected page/version before reading draft content for preview. */
export async function resolveAuthorizedPreviewPage(
  input: AudiencePreviewPageRequest,
  accessToken: string,
): Promise<AudiencePreviewPage> {
  const pageId = itemId(input.pageId);
  if (
    !pageId ||
    typeof input.language !== "string" ||
    !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(input.language) ||
    input.language.length > 35 ||
    (input.version !== undefined &&
      (!Number.isSafeInteger(input.version) || input.version < 1))
  ) {
    throw new AudiencePreviewError(
      "INVALID_PAGE_SELECTION",
      "Select a valid SitecoreAI page, language, and version.",
      400,
    );
  }
  if (!accessToken || /[\s\u0000-\u001f]/.test(accessToken)) {
    throw new AudiencePreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI to preview this page.",
      401,
    );
  }
  const { contextId } = audiencePreviewApiConfiguration();
  // The delegated Pages API returns the full content path and current-user
  // permissions. A separate Agent API lookup is unnecessary for ownership.
  // The site is server-defined; neither SDK host context nor request input can
  // select another site for the authorization request.
  const site = SITES[0];
  const page = await readSitecore(
    `/authoring/api/v1/pages/${pageId}`,
    {
      site: site.id,
      language: input.language,
      ...(input.version === undefined
        ? {}
        : { version: String(input.version) }),
    },
    accessToken,
    contextId,
  );
  if (siteForPath(page.path, true)?.name !== site.name) {
    throw new AudiencePreviewError(
      "PAGE_OUTSIDE_SITE",
      "Audience preview is currently available for Agent Portal pages.",
      403,
    );
  }
  const permissions = page.permissions ? record(page.permissions) : undefined;
  if (
    itemId(page.id) !== pageId ||
    page.hasPresentation === false ||
    permissions?.canRead === false ||
    page.language !== input.language ||
    typeof page.version !== "number" ||
    !Number.isSafeInteger(page.version) ||
    page.version < 1 ||
    (input.version !== undefined && page.version !== input.version) ||
    typeof page.name !== "string" ||
    !page.name
  ) {
    throw new AudiencePreviewError(
      "PAGE_ACCESS_DENIED",
      "This SitecoreAI account cannot preview the selected page and version.",
      403,
    );
  }
  const contentPath = `/${String(page.path).replace(/^\/+|\/+$/g, "")}`;
  const path = contentPath.slice(`${site.root}/Home`.length) || "/";
  return {
    id: pageId,
    name: page.name,
    path,
    contentPath,
    siteName: site.name,
    language: String(page.language),
    version: page.version,
  };
}
