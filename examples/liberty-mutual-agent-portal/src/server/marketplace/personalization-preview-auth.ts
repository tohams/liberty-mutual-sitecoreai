import "server-only";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { User } from "@auth0/nextjs-auth0/types";
import { NextResponse } from "next/server";
import { personalizationPreviewCallbackDestination } from "./personalization-preview-sso";
import { createPersonalizationPreviewAuthFetch } from "./personalization-preview-auth-fetch";
import {
  PERSONALIZATION_PREVIEW_APP_PATH,
  PERSONALIZATION_PREVIEW_AUTH0_DOMAIN,
  PersonalizationPreviewError,
  personalizationPreviewAuthConfiguration,
  personalizationPreviewAuthorizationParameters,
} from "./personalization-preview-config";
import {
  personalizationPreviewTokenDiagnostic,
  bindPersonalizationPreviewSession,
  isBoundPersonalizationPreviewSession,
} from "./personalization-preview-session";

let configuredClient: Auth0Client | undefined;
let configuredKey: string | undefined;

/** Lazy initialization keeps ordinary portal builds independent of app setup. */
export function getPersonalizationPreviewAuth(): Auth0Client | null {
  const configuration = personalizationPreviewAuthConfiguration();
  if (!configuration) return null;
  const key = JSON.stringify(configuration);
  if (configuredClient && configuredKey === key) return configuredClient;
  configuredClient = new Auth0Client({
    clientId: configuration.clientId,
    clientSecret: configuration.clientSecret,
    secret: configuration.secret,
    appBaseUrl: configuration.appBaseUrl,
    domain: PERSONALIZATION_PREVIEW_AUTH0_DOMAIN,
    customFetch: createPersonalizationPreviewAuthFetch(configuration),
    tokenRefreshBuffer: 60,
    authorizationParameters:
      personalizationPreviewAuthorizationParameters(configuration),
    signInReturnToPath: `${PERSONALIZATION_PREVIEW_APP_PATH}/auth/complete`,
    session: {
      cookie: {
        name: "personalization_preview_session",
        path: "/",
        sameSite: "none",
        secure: true,
      },
    },
    transactionCookie: {
      prefix: "personalization_preview_transaction_",
      path: "/",
      sameSite: "none",
      secure: true,
    },
    routes: {
      login: `${PERSONALIZATION_PREVIEW_APP_PATH}/auth/login`,
      callback: `${PERSONALIZATION_PREVIEW_APP_PATH}/auth/callback`,
      logout: `${PERSONALIZATION_PREVIEW_APP_PATH}/auth/logout`,
      profile: `${PERSONALIZATION_PREVIEW_APP_PATH}/auth/profile`,
      accessToken: `${PERSONALIZATION_PREVIEW_APP_PATH}/auth/access-token`,
    },
    enableAccessTokenEndpoint: false,
    onCallback: async (error, context) =>
      NextResponse.redirect(
        personalizationPreviewCallbackDestination(
          error,
          context.returnTo,
          configuration.appBaseUrl,
        ),
      ),
    beforeSessionSaved: async (session) =>
      bindPersonalizationPreviewSession(session, configuration),
  });
  configuredKey = key;
  return configuredClient;
}

export interface PersonalizationPreviewSession {
  user: User;
  accessToken: string;
}

/** This is Sitecore's authenticated user session, never a synthetic portal login. */
export async function requirePersonalizationPreviewSession(): Promise<PersonalizationPreviewSession> {
  const auth = getPersonalizationPreviewAuth();
  const configuration = personalizationPreviewAuthConfiguration();
  if (!auth || !configuration) {
    throw new PersonalizationPreviewError(
      "CONFIGURATION_REQUIRED",
      "Personalization preview sign-in is not configured.",
      503,
    );
  }
  const session = await auth.getSession();
  if (!isBoundPersonalizationPreviewSession(session, configuration)) {
    console.warn(
      "Personalization Preview authentication rejected",
      personalizationPreviewTokenDiagnostic(
        { code: session ? "session_binding_mismatch" : "missing_session" },
        session,
      ),
    );
    throw new PersonalizationPreviewError(
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
      "Personalization Preview token refresh rejected",
      personalizationPreviewTokenDiagnostic(error, session),
    );
    throw new PersonalizationPreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI again to continue previewing.",
      401,
    );
  }
}
