import "server-only";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { User } from "@auth0/nextjs-auth0/types";
import { NextResponse } from "next/server";
import { audiencePreviewCallbackDestination } from "./audience-preview-sso";
import {
  AUDIENCE_PREVIEW_APP_PATH,
  AUDIENCE_PREVIEW_AUTH0_AUDIENCE,
  AUDIENCE_PREVIEW_AUTH0_DOMAIN,
  AUDIENCE_PREVIEW_ORGANIZATION_ID,
  AUDIENCE_PREVIEW_TENANT_ID,
  AudiencePreviewError,
  audiencePreviewAuthConfiguration,
  audiencePreviewAuthorizationParameters,
} from "./audience-preview-config";

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
    beforeSessionSaved: async (session) => ({
      ...session,
      audiencePreviewClientId: configuration.clientId,
      audiencePreviewOrganizationId: AUDIENCE_PREVIEW_ORGANIZATION_ID,
      audiencePreviewTenantId: AUDIENCE_PREVIEW_TENANT_ID,
      audiencePreviewMarketplaceAppId: configuration.marketplaceAppId,
    }),
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
  if (
    !session?.user?.sub ||
    session.audiencePreviewClientId !== configuration.clientId ||
    session.audiencePreviewOrganizationId !==
      AUDIENCE_PREVIEW_ORGANIZATION_ID ||
    session.audiencePreviewTenantId !== AUDIENCE_PREVIEW_TENANT_ID ||
    session.audiencePreviewMarketplaceAppId !== configuration.marketplaceAppId
  ) {
    throw new AudiencePreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI to preview this page.",
      401,
    );
  }
  try {
    const { token } = await auth.getAccessToken({
      audience: AUDIENCE_PREVIEW_AUTH0_AUDIENCE,
    });
    if (!token) throw new Error("No delegated access token.");
    return { user: session.user, accessToken: token };
  } catch {
    throw new AudiencePreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI again to continue previewing.",
      401,
    );
  }
}
