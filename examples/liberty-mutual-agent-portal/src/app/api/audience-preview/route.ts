import type { NextRequest } from "next/server";
import { jsonResponse, readJson, requireSameOrigin } from "@/server/http";
import { requireAudiencePreviewSession } from "@/server/marketplace/audience-preview-auth";
import { resolveAuthorizedPreviewPage } from "@/server/marketplace/audience-preview-pages";
import { limitAudiencePreviewRequests } from "@/server/audience-preview/preview-sessions";
import {
  audiencePreviewErrorResponse,
  parseAudiencePreviewRequest,
  prepareAudiencePreview,
} from "@/server/audience-preview/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireAudiencePreviewSession();
    await limitAudiencePreviewRequests(actor.user.sub!);
    const input = parseAudiencePreviewRequest(await readJson(request, 4_096));
    const page = await resolveAuthorizedPreviewPage(input, actor.accessToken);
    const result = await prepareAudiencePreview(
      actor.user.sub!,
      page,
      input.input,
    );
    const response = jsonResponse(
      result,
      result.status === "pending" ? 202 : 200,
    );
    if (result.status === "pending")
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  } catch (error) {
    return audiencePreviewErrorResponse(error);
  }
}
