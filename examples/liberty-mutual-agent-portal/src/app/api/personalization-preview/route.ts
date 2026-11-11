import type { NextRequest } from "next/server";
import { jsonResponse, readJson, requireSameOrigin } from "@/server/http";
import { requirePersonalizationPreviewSession } from "@/server/marketplace/personalization-preview-auth";
import { resolveAuthorizedPersonalizationPreviewPage } from "@/server/marketplace/personalization-preview-pages";
import { limitPersonalizationPreviewRequests } from "@/server/personalization-preview/preview-sessions";
import {
  parsePersonalizationPreviewRequest,
  personalizationPreviewErrorResponse,
  preparePersonalizationPreview,
} from "@/server/personalization-preview/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requirePersonalizationPreviewSession();
    await limitPersonalizationPreviewRequests(actor.user.sub!);
    const input = parsePersonalizationPreviewRequest(
      await readJson(request, 8_192),
    );
    const page = await resolveAuthorizedPersonalizationPreviewPage(
      input,
      actor.accessToken,
    );
    return jsonResponse(
      await preparePersonalizationPreview(
        actor.user.sub!,
        actor.accessToken,
        page,
        input,
      ),
    );
  } catch (error) {
    return personalizationPreviewErrorResponse(error);
  }
}
