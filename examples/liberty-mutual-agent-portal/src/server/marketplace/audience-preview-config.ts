export const AUDIENCE_PREVIEW_ORGANIZATION_ID = "org_XqL3u1MSNVuubOTb";
export const AUDIENCE_PREVIEW_TENANT_ID =
  "ba40a477-d452-493b-fb23-08df2a1b4cda";
export const AUDIENCE_PREVIEW_AUTH0_DOMAIN = "https://auth.sitecorecloud.io";
export const AUDIENCE_PREVIEW_AUTH0_AUDIENCE =
  "https://api-webapp.sitecorecloud.io";
export const AUDIENCE_PREVIEW_APP_PATH = "/apps/audience-preview";
const APP_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export class AudiencePreviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AudiencePreviewError";
  }
}

export interface AudiencePreviewAuthConfiguration {
  clientId: string;
  clientSecret: string;
  secret: string;
  appBaseUrl: string;
  marketplaceAppId: string;
}

/** The tenant belongs to this installed app, not the Marketplace shell or CDP. */
export function audiencePreviewAuthorizationParameters(
  configuration: AudiencePreviewAuthConfiguration,
) {
  return {
    scope: "openid profile email offline_access",
    audience: AUDIENCE_PREVIEW_AUTH0_AUDIENCE,
    organization_id: AUDIENCE_PREVIEW_ORGANIZATION_ID,
    tenant_id: AUDIENCE_PREVIEW_TENANT_ID,
    product_codes: `mkp_${configuration.marketplaceAppId}`,
  };
}

/** Read only this app's configuration; never fall back to portal/workshop keys. */
export function audiencePreviewAuthConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AudiencePreviewAuthConfiguration | null {
  const clientId = environment.AUDIENCE_PREVIEW_AUTH0_CLIENT_ID?.trim();
  const clientSecret = environment.AUDIENCE_PREVIEW_AUTH0_CLIENT_SECRET?.trim();
  const secret = environment.AUDIENCE_PREVIEW_AUTH0_SECRET?.trim();
  const appBaseUrl = environment.AUDIENCE_PREVIEW_APP_BASE_URL?.trim();
  const domain = environment.AUDIENCE_PREVIEW_AUTH0_DOMAIN?.trim();
  const audience = environment.AUDIENCE_PREVIEW_AUTH0_AUDIENCE?.trim();
  const marketplaceAppId =
    environment.AUDIENCE_PREVIEW_MARKETPLACE_APP_ID?.trim();
  if (
    !clientId ||
    !clientSecret ||
    !secret ||
    !/^[a-f0-9]{64}$/i.test(secret) ||
    !appBaseUrl ||
    !marketplaceAppId ||
    !APP_ID.test(marketplaceAppId) ||
    (domain && domain.replace(/\/$/, "") !== AUDIENCE_PREVIEW_AUTH0_DOMAIN) ||
    (audience && audience !== AUDIENCE_PREVIEW_AUTH0_AUDIENCE)
  ) {
    return null;
  }
  try {
    const base = new URL(appBaseUrl);
    if (
      base.protocol !== "https:" ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== "/"
    ) {
      return null;
    }
    return {
      clientId,
      clientSecret,
      secret,
      appBaseUrl: base.origin,
      marketplaceAppId: marketplaceAppId.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function audiencePreviewApiConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): { contextId: string; appId: string } {
  const contextId = environment.AUDIENCE_PREVIEW_SITECORE_CONTEXT_ID?.trim();
  const appId = environment.AUDIENCE_PREVIEW_MARKETPLACE_APP_ID?.trim();
  if (
    !contextId ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(contextId) ||
    !appId ||
    !APP_ID.test(appId)
  ) {
    throw new AudiencePreviewError(
      "CONFIGURATION_REQUIRED",
      "Audience preview is not configured for this SitecoreAI environment.",
      503,
    );
  }
  return { contextId, appId };
}
import "server-only";
