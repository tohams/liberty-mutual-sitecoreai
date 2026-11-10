import "server-only";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { User } from "@auth0/nextjs-auth0/types";
import { NextResponse } from "next/server";
import { audiencePreviewCallbackDestination } from "./audience-preview-sso";
import { createAudiencePreviewAuthFetch } from "./audience-preview-auth-fetch";
import {
  AUDIENCE_PREVIEW_APP_PATH,
  AUDIENCE_PREVIEW_AUTH0_DOMAIN,
  AudiencePreviewError,
  audiencePreviewAuthConfiguration,
  audiencePreviewAuthorizationParameters,
} from "./audience-preview-config";
import {
  audiencePreviewTokenDiagnostic,
  bindAudiencePreviewSession,
  isBoundAudiencePreviewSession,
} from "./audience-preview-session";

let configuredClient: Auth0Client | undefined;
let configuredKey: string | undefined;

/** Lazy initialization keeps ordinary portal builds independent of app setup. */
export function getAudiencePreviewAuth(): Auth0Client | null {
  const configuration = audiencePreviewAuthConfiguration();
  if (!configuration) return null;
  const key = JSON.stringify(configuration);
  if (configuredClient && configuredKey === key) return configuredClient;
  configuredClient = new Auth0Client({
    clientId: configuration.clientId,
    clientSecret: configuration.clientSecret,
    secret: configuration.secret,
    appBaseUrl: configuration.appBaseUrl,
    domain: AUDIENCE_PREVIEW_AUTH0_DOMAIN,
    customFetch: createAudiencePreviewAuthFetch(configuration.marketplaceAppId),
    tokenRefreshBuffer: 60,
    authorizationParameters:
      audiencePreviewAuthorizationParameters(configuration),
    signInReturnToPath: `${AUDIENCE_PREVIEW_APP_PATH}/auth/complete`,
    session: {
      cookie: {
        name: "audience_preview_session",
        path: "/",
        sameSite: "none",
        secure: true,
      },
    },
    transactionCookie: {
      prefix: "audience_preview_transaction_",
      path: "/",
      sameSite: "none",
      secure: true,
    },
    routes: {
      login: `${AUDIENCE_PREVIEW_APP_PATH}/auth/login`,
      callback: `${AUDIENCE_PREVIEW_APP_PATH}/auth/callback`,
      logout: `${AUDIENCE_PREVIEW_APP_PATH}/auth/logout`,
      profile: `${AUDIENCE_PREVIEW_APP_PATH}/auth/profile`,
      accessToken: `${AUDIENCE_PREVIEW_APP_PATH}/auth/access-token`,
    },
    enableAccessTokenEndpoint: false,
    onCallback: async (error, context) =>
      NextResponse.redirect(
        audiencePreviewCallbackDestination(
          error,
          context.returnTo,
          configuration.appBaseUrl,
        ),
      ),
    beforeSessionSaved: async (session) =>
      bindAudiencePreviewSession(session, configuration),
  });
  configuredKey = key;
  return configuredClient;
}

export interface AudiencePreviewSession {
  user: User;
  accessToken: string;
}

/** This is Sitecore's authenticated user session, never a synthetic portal login. */
export async function requireAudiencePreviewSession(): Promise<AudiencePreviewSession> {
  const auth = getAudiencePreviewAuth();
  const configuration = audiencePreviewAuthConfiguration();
  if (!auth || !configuration) {
    throw new AudiencePreviewError(
      "CONFIGURATION_REQUIRED",
      "Audience preview sign-in is not configured.",
      503,
    );
  }
  const session = await auth.getSession();
  if (!isBoundAudiencePreviewSession(session, configuration)) {
    console.warn(
      "Audience Preview authentication rejected",
      audiencePreviewTokenDiagnostic(
        { code: session ? "session_binding_mismatch" : "missing_session" },
        session,
      ),
    );
    throw new AudiencePreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI to preview this page.",
      401,
    );
  }
  try {
    // The client already fixes this single audience. A per-call audience would
    // unnecessarily request an MRRT audience override during token refresh.
    const { token } = await auth.getAccessToken();
    if (!token) throw new Error("No delegated access token.");
    return { user: session.user, accessToken: token };
  } catch (error) {
    console.warn(
      "Audience Preview token refresh rejected",
      audiencePreviewTokenDiagnostic(error, session),
    );
    throw new AudiencePreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI again to continue previewing.",
      401,
    );
  }
}
