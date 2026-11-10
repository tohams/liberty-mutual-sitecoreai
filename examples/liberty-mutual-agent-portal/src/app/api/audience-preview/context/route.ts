import type { NextRequest } from "next/server";
import { jsonResponse, requireSameOrigin } from "@/server/http";
import { AudiencePreviewError } from "@/server/marketplace/audience-preview-config";
import { requireAudiencePreviewSession } from "@/server/marketplace/audience-preview-auth";
import { resolveAuthorizedPreviewPage } from "@/server/marketplace/audience-preview-pages";
import { limitAudiencePreviewRequests } from "@/server/audience-preview/preview-sessions";
import { audiencePreviewErrorResponse } from "@/server/audience-preview/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (
      request.headers.has("origin") ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      requireSameOrigin(request);
    const actor = await requireAudiencePreviewSession();
    await limitAudiencePreviewRequests(actor.user.sub!);
    const params = request.nextUrl.searchParams;
    if (
      [...params.keys()].some(
        (key) => !["pageId", "language", "version"].includes(key),
      ) ||
      params.getAll("pageId").length !== 1 ||
      params.getAll("language").length !== 1 ||
      params.getAll("version").length > 1 ||
      (params.has("version") &&
        !/^[1-9]\d{0,6}$/.test(params.get("version") || ""))
    )
      throw new AudiencePreviewError(
        "INVALID_PAGE_SELECTION",
        "Select a valid page in Page Builder.",
        400,
      );
    return jsonResponse(
      await resolveAuthorizedPreviewPage(
        {
          pageId: params.get("pageId") || "",
          language: params.get("language") || "",
          ...(params.has("version")
            ? { version: Number(params.get("version")) }
            : {}),
        },
        actor.accessToken,
      ),
    );
  } catch (error) {
    return audiencePreviewErrorResponse(error);
  }
}
