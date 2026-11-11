import type { NextRequest } from "next/server";
import { jsonResponse, requireSameOrigin } from "@/server/http";
import { requirePersonalizationPreviewSession } from "@/server/marketplace/personalization-preview-auth";
import { resolveAuthorizedPersonalizationPreviewPage } from "@/server/marketplace/personalization-preview-pages";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import { limitPersonalizationPreviewRequests } from "@/server/personalization-preview/preview-sessions";
import {
  loadPersonalizationPreviewCatalog,
  parsePersonalizationPageRequest,
  personalizationPreviewErrorResponse,
} from "@/server/personalization-preview/service";
import { PersonalizationPreviewServerTimings } from "@/server/personalization-preview/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const timings = new PersonalizationPreviewServerTimings();
  try {
    if (
      request.headers.has("origin") ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      requireSameOrigin(request);
    const actor = await timings.measure("auth", () =>
      requirePersonalizationPreviewSession(),
    );
    await timings.measure("limit", () =>
      limitPersonalizationPreviewRequests(actor.user.sub!),
    );
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
    const page = await timings.measure("page", () =>
      resolveAuthorizedPersonalizationPreviewPage(input, actor.accessToken),
    );
    const catalog = await timings.measure("catalog", () =>
      loadPersonalizationPreviewCatalog(page, actor.accessToken),
    );
    return timings.apply(jsonResponse(catalog.context));
  } catch (error) {
    return timings.apply(personalizationPreviewErrorResponse(error));
  }
}
