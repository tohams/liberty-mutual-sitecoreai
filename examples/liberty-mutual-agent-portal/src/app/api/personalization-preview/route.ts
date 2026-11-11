import type { NextRequest } from "next/server";
import { jsonResponse, readJson, requireSameOrigin } from "@/server/http";
import { requirePersonalizationPreviewSession } from "@/server/marketplace/personalization-preview-auth";
import { resolveAuthorizedPersonalizationPreviewPage } from "@/server/marketplace/personalization-preview-pages";
import { limitPersonalizationPreviewRequests } from "@/server/personalization-preview/preview-sessions";
import {
  parsePersonalizationPreviewRequest,
  personalizationPreviewErrorResponse,
  personalizationPreviewDependencies,
  preparePersonalizationPreview,
} from "@/server/personalization-preview/service";
import { PersonalizationPreviewServerTimings } from "@/server/personalization-preview/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const timings = new PersonalizationPreviewServerTimings();
  try {
    requireSameOrigin(request);
    const actor = await timings.measure("auth", () =>
      requirePersonalizationPreviewSession(),
    );
    await timings.measure("limit", () =>
      limitPersonalizationPreviewRequests(actor.user.sub!),
    );
    const input = parsePersonalizationPreviewRequest(
      await readJson(request, 8_192),
    );
    const page = await timings.measure("page", () =>
      resolveAuthorizedPersonalizationPreviewPage(input, actor.accessToken),
    );
    const dependencies = {
      ...personalizationPreviewDependencies(),
      onTiming: timings.add,
    };
    return timings.apply(
      jsonResponse(
        await preparePersonalizationPreview(
          actor.user.sub!,
          actor.accessToken,
          page,
          input,
          dependencies,
        ),
      ),
    );
  } catch (error) {
    return timings.apply(personalizationPreviewErrorResponse(error));
  }
}
