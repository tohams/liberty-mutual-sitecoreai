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
const oauthDiagnosticCodes = new Set([
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
  "access_denied",
  "server_error",
  "temporarily_unavailable",
  "login_required",
  "consent_required",
  "interaction_required",
  "mfa_required",
  "unknown_error",
]);

function diagnosticRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Bounded operational facts only: no token, raw error, user, or cookie value. */
export function audiencePreviewTokenDiagnostic(
  error: unknown,
  session: SessionData | null | undefined,
  nowSeconds = Date.now() / 1_000,
) {
  const outer = diagnosticRecord(error);
  const code = outer?.code;
  // Installed Auth0 SDK: AccessTokenError.cause is an OAuth2Error. The SDK
  // normally drops the provider status; report one only if actually present.
  const cause = diagnosticRecord(outer?.cause);
  const oauthCode =
    typeof cause?.code === "string" && oauthDiagnosticCodes.has(cause.code)
      ? cause.code
      : undefined;
  const oauthStatus = [
    cause?.status,
    cause?.statusCode,
    outer?.status,
    outer?.statusCode,
  ].find(
    (value): value is number =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 400 &&
      value <= 599,
  );
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
    ...(oauthCode ? { oauthCode } : {}),
    ...(oauthStatus !== undefined ? { oauthStatus } : {}),
  };
}
