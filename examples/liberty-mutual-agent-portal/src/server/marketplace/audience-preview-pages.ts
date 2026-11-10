import "server-only";
import {
  AudiencePreviewError,
  audiencePreviewApiConfiguration,
} from "./audience-preview-config";

const GATEWAY = "https://edge-platform.sitecorecloud.io";
const SITES = [
  {
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

function diagnosticText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return (
    value
      .replace(
        /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
        "[credential]",
      )
      .replace(/\b(?:Bearer|ApiKey)\s+[^\s,;]+/gi, "[credential]")
      .replace(/https?:\/\/[^\s<>"']+/gi, "[URL]")
      .replace(
        /\b(?:sitecoreContextId|contextId|token|client_secret|authorization|secret|password)\s*[:=]\s*["']?[^\s,"';&]+/gi,
        "[credential]",
      )
      .replace(
        /\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/gi,
        "[identifier]",
      )
      .replace(/\b[A-Za-z0-9_-]{20,}\b/g, "[identifier]")
      .replace(/<[^>]*>/g, " ")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300) || undefined
  );
}

/** Inspect only bounded ProblemDetails diagnostics; never log the raw body. */
async function problemDiagnostics(
  response: Response,
): Promise<Record<string, unknown>> {
  if (
    !response.body ||
    !/\bjson\b/i.test(response.headers.get("content-type") || "")
  )
    return {};
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8_192) {
        await reader.cancel();
        return {};
      }
      chunks.push(value);
    }
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return {};
    const problem = payload as Record<string, unknown>;
    const title = diagnosticText(problem.title);
    const detail = diagnosticText(problem.detail);
    const fields =
      problem.errors &&
      typeof problem.errors === "object" &&
      !Array.isArray(problem.errors)
        ? Object.keys(problem.errors)
            .filter((key) => /^[A-Za-z0-9_.$\[\]-]{1,80}$/.test(key))
            .slice(0, 12)
        : [];
    return {
      ...(title ? { problemTitle: title } : {}),
      ...(detail ? { problemDetail: detail } : {}),
      ...(fields.length ? { validationFields: fields } : {}),
    };
  } catch {
    return {};
  } finally {
    reader.releaseLock();
  }
}

async function readSitecore(
  pathname: string,
  parameters: Record<string, string>,
  accessToken: string,
  contextId: string,
): Promise<unknown> {
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
      ...(await problemDiagnostics(response)),
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
    return await response.json();
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
  // Sites API IDs are its own contract; a SiteGrouping item ID is not a
  // substitute. Resolve the fixed site through the same delegated identity.
  // The host and request cannot choose another site or identifier.
  const site = SITES[0];
  const sites = await readSitecore(
    "/authoring/api/v1/sites",
    {},
    accessToken,
    contextId,
  );
  if (!Array.isArray(sites) || sites.length > 1_000) {
    throw new AudiencePreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an invalid site response.",
      502,
    );
  }
  const candidates = sites.filter((candidate: unknown) => {
    return (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as Record<string, unknown>).name === site.name
    );
  });
  const siteId =
    candidates.length === 1 ? itemId(record(candidates[0]).id) : null;
  if (!siteId) {
    throw new AudiencePreviewError(
      "SITE_ACCESS_DENIED",
      "This SitecoreAI account cannot access Agent Portal for audience preview.",
      403,
    );
  }
  const page = record(
    await readSitecore(
      `/authoring/api/v1/pages/${pageId}`,
      {
        site: siteId,
        language: input.language,
        ...(input.version === undefined
          ? {}
          : { version: String(input.version) }),
      },
      accessToken,
      contextId,
    ),
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
