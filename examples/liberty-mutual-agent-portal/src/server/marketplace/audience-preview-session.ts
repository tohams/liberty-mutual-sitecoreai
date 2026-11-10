import "server-only";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import { filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";
import {
  AUDIENCE_PREVIEW_ORGANIZATION_ID,
  AUDIENCE_PREVIEW_TENANT_ID,
  type AudiencePreviewAuthConfiguration,
} from "./audience-preview-config";

/** The SDK runs this hook both after login and after refreshing its token set. */
export function bindAudiencePreviewSession(
  session: SessionData,
  configuration: AudiencePreviewAuthConfiguration,
): SessionData {
  return {
    ...session,
    user: filterDefaultIdTokenClaims(session.user),
    audiencePreviewClientId: configuration.clientId,
    audiencePreviewOrganizationId: AUDIENCE_PREVIEW_ORGANIZATION_ID,
    audiencePreviewTenantId: AUDIENCE_PREVIEW_TENANT_ID,
    audiencePreviewMarketplaceAppId: configuration.marketplaceAppId,
  };
}

export function isBoundAudiencePreviewSession(
  session: SessionData | null | undefined,
  configuration: AudiencePreviewAuthConfiguration,
): session is SessionData {
  return Boolean(
    session?.user?.sub &&
    session.audiencePreviewClientId === configuration.clientId &&
    session.audiencePreviewOrganizationId ===
      AUDIENCE_PREVIEW_ORGANIZATION_ID &&
    session.audiencePreviewTenantId === AUDIENCE_PREVIEW_TENANT_ID &&
    session.audiencePreviewMarketplaceAppId === configuration.marketplaceAppId,
  );
}

const diagnosticCodes = new Set([
  "missing_session",
  "missing_refresh_token",
  "failed_to_refresh_token",
  "session_expired",
  "discovery_error",
  "mfa_required",
  "session_binding_mismatch",
]);

/** Bounded operational facts only: no token, raw error, user, or cookie value. */
export function audiencePreviewTokenDiagnostic(
  error: unknown,
  session: SessionData | null | undefined,
  nowSeconds = Date.now() / 1_000,
) {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  const expiresAt = session?.tokenSet?.expiresAt;
  return {
    code:
      typeof code === "string" && diagnosticCodes.has(code)
        ? code
        : "unexpected_token_error",
    hasRefreshToken: Boolean(session?.tokenSet?.refreshToken),
    expiresAtDelta:
      typeof expiresAt === "number" && Number.isFinite(expiresAt)
        ? Math.max(
            -86_400,
            Math.min(86_400, Math.trunc(expiresAt - nowSeconds)),
          )
        : null,
  };
}
