import { NextRequest, NextResponse } from "next/server";
import { getPersonalizationPreviewAuth } from "@/server/marketplace/personalization-preview-auth";
import { personalizationPreviewAuthConfiguration } from "@/server/marketplace/personalization-preview-config";
import {
  personalizationPreviewCallbackDestination,
  personalizationPreviewSilentLoginOptions,
} from "@/server/marketplace/personalization-preview-sso";
import { PERSONALIZATION_PREVIEW_SILENT_RETURN } from "@/features/personalization-preview/sso";
import { privateHeaders } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configuration = personalizationPreviewAuthConfiguration();
  const auth = getPersonalizationPreviewAuth();
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
      personalizationPreviewSilentLoginOptions(configuration),
      clean,
    );
  } catch {
    response = NextResponse.redirect(
      personalizationPreviewCallbackDestination(
        new Error("silent_start_failed"),
        PERSONALIZATION_PREVIEW_SILENT_RETURN,
        configuration.appBaseUrl,
      ),
    );
  }
  for (const [name, value] of Object.entries(privateHeaders))
    response.headers.set(name, value);
  return response;
}
