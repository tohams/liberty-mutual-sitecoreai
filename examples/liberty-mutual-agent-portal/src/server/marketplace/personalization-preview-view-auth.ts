import "server-only";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import { NextRequest, NextResponse } from "next/server";
import { privateHeaders } from "@/server/http";
import {
  PersonalizationPreviewError,
  personalizationPreviewAuthConfiguration,
  type PersonalizationPreviewAuthConfiguration,
} from "./personalization-preview-config";
import {
  personalizationPreviewTokenDiagnostic,
  isBoundPersonalizationPreviewSession,
} from "./personalization-preview-session";

export function isPersonalizationPreviewViewPath(path: string): boolean {
  return /^\/apps\/personalization-preview\/view\/[^/]+\/?$/.test(path);
}

interface PreviewViewAuthProvider {
  getSession(request: NextRequest): Promise<SessionData | null>;
  getAccessToken(
    request: NextRequest,
    response: NextResponse,
  ): Promise<{ token: string }>;
}

/** Persist SDK refresh cookies in middleware before the read-only Server Component runs. */
export async function preflightPersonalizationPreviewView(
  request: NextRequest,
  response: NextResponse,
  auth: PreviewViewAuthProvider,
  configuration: PersonalizationPreviewAuthConfiguration | null = personalizationPreviewAuthConfiguration(),
): Promise<NextResponse> {
  if (!configuration)
    return NextResponse.json(
      {
        error: {
          code: "CONFIGURATION_REQUIRED",
          message: "Personalization preview sign-in is not configured.",
        },
      },
      { status: 503, headers: privateHeaders },
    );
  let session: SessionData | null = null;
  try {
    session = await auth.getSession(request);
    if (!isBoundPersonalizationPreviewSession(session, configuration)) {
      throw new PersonalizationPreviewError(
        session ? "session_binding_mismatch" : "missing_session",
        "Connect to SitecoreAI to open this preview.",
        401,
      );
    }
    // Keep the request/response overload: it writes refreshed cookies before
    // rendering. The client's configured audience remains authoritative.
    const { token } = await auth.getAccessToken(request, response);
    if (!token) throw new Error("No delegated access token.");
    return response;
  } catch (error) {
    console.warn(
      "Personalization Preview view authentication rejected",
      personalizationPreviewTokenDiagnostic(error, session),
    );
    return NextResponse.json(
      {
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message:
            "Connect to SitecoreAI in Page Builder to open this preview.",
        },
      },
      { status: 401, headers: privateHeaders },
    );
  }
}
