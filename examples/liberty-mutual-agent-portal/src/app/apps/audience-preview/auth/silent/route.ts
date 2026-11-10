import { NextRequest, NextResponse } from "next/server";
import { getAudiencePreviewAuth } from "@/server/marketplace/audience-preview-auth";
import { audiencePreviewAuthConfiguration } from "@/server/marketplace/audience-preview-config";
import {
  audiencePreviewCallbackDestination,
  audiencePreviewSilentLoginOptions,
} from "@/server/marketplace/audience-preview-sso";
import { AUDIENCE_PREVIEW_SILENT_RETURN } from "@/features/audience-preview/sso";
import { privateHeaders } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configuration = audiencePreviewAuthConfiguration();
  const auth = getAudiencePreviewAuth();
  if (!configuration || !auth)
    return new NextResponse(null, { status: 503, headers: privateHeaders });
  let response: NextResponse;
  try {
    // No request query parameter may override the tenant, product, prompt, or return destination.
    const clean = new NextRequest(
      new URL(request.nextUrl.pathname, configuration.appBaseUrl),
      { headers: request.headers },
    );
    response = await auth.startInteractiveLogin(
      audiencePreviewSilentLoginOptions(configuration),
      clean,
    );
  } catch {
    response = NextResponse.redirect(
      audiencePreviewCallbackDestination(
        new Error("silent_start_failed"),
        AUDIENCE_PREVIEW_SILENT_RETURN,
        configuration.appBaseUrl,
      ),
    );
  }
  for (const [name, value] of Object.entries(privateHeaders))
    response.headers.set(name, value);
  return response;
}
