// Temporary authenticated integration diagnostic. Remove before final release.
import type { NextRequest } from "next/server";
import { jsonResponse, requireSameOrigin } from "@/server/http";
import { requirePersonalizationPreviewSession } from "@/server/marketplace/personalization-preview-auth";
import { resolveAuthorizedPersonalizationPreviewPage } from "@/server/marketplace/personalization-preview-pages";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import { limitPersonalizationPreviewRequests } from "@/server/personalization-preview/preview-sessions";
import {
  parsePersonalizationPageRequest,
  personalizationPreviewErrorResponse,
  personalizationPreviewDependencies,
} from "@/server/personalization-preview/service";
import { readPersonalizationDefinitionDiagnostics } from "@/server/personalization-preview/upstream";
import { nativePreviewExecutions } from "@/server/audience-preview/decisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Preserve only bounded configuration data; condition/source code is omitted. */
function diagnosticValue(value: unknown, key = "", depth = 0): unknown {
  if (depth > 20) return "[depth omitted]";
  if (
    /^(?:authorization|accessToken|clientSecret|secret|password|token)$/i.test(
      key,
    )
  )
    return "[credential omitted]";
  if (typeof value === "string") {
    if (value.length > 262_144) return "[large value omitted]";
    if (/^[\s]*[\[{]/.test(value)) {
      try {
        return JSON.stringify(
          diagnosticValue(JSON.parse(value), key, depth + 1),
        );
      } catch {
        return "[non-JSON definition omitted]";
      }
    }
    if (
      /(?:code|script|expression|definition|functionBody)/i.test(key) ||
      (key === "template" &&
        /\b(?:function|return|const|var|let)\b|=>/.test(value))
    )
      return "[source code omitted]";
    return value;
  }
  if (Array.isArray(value))
    return value
      .slice(0, 500)
      .map((entry) => diagnosticValue(entry, key, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 250)
        .map(([name, entry]) => [
          name,
          diagnosticValue(entry, name, depth + 1),
        ]),
    );
  return value;
}

export async function GET(request: NextRequest) {
  try {
    if (
      request.headers.has("origin") ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      requireSameOrigin(request);
    const actor = await requirePersonalizationPreviewSession();
    await limitPersonalizationPreviewRequests(actor.user.sub!);
    const params = request.nextUrl.searchParams;
    if (
      [...params.keys()].some(
        (key) => !["pageId", "language", "version", "siteName"].includes(key),
      ) ||
      params.getAll("pageId").length !== 1 ||
      params.getAll("language").length !== 1 ||
      params.getAll("version").length > 1 ||
      params.getAll("siteName").length > 1 ||
      (params.has("version") &&
        !/^[1-9]\d{0,6}$/.test(params.get("version") || ""))
    )
      throw new PersonalizationPreviewError(
        "INVALID_PAGE_SELECTION",
        "Select a valid page in Page Builder.",
        400,
      );
    const input = parsePersonalizationPageRequest({
      pageId: params.get("pageId"),
      language: params.get("language"),
      ...(params.has("version")
        ? { version: Number(params.get("version")) }
        : {}),
      ...(params.has("siteName") ? { siteName: params.get("siteName") } : {}),
    });
    let layouts: { finalLayout: unknown; sharedLayout: unknown } | undefined;
    const page = await resolveAuthorizedPersonalizationPreviewPage(
      input,
      actor.accessToken,
      (value) => {
        layouts = value;
      },
    );
    const dependencies = personalizationPreviewDependencies();
    const [definitions, nativeInfo] = await Promise.all([
      readPersonalizationDefinitionDiagnostics(page, actor.accessToken),
      dependencies.getInfo(page),
    ]);
    return jsonResponse({
      page,
      layouts: diagnosticValue(layouts),
      probes: diagnosticValue(definitions),
      nativeInfo: nativeInfo || null,
      executions: nativeInfo
        ? nativePreviewExecutions(nativeInfo, page.language, dependencies.scope)
        : [],
    });
  } catch (error) {
    return personalizationPreviewErrorResponse(error);
  }
}
