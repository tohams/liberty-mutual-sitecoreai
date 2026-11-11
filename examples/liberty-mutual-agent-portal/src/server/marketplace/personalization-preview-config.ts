export const PERSONALIZATION_PREVIEW_ORGANIZATION_ID = "org_XqL3u1MSNVuubOTb";
export const PERSONALIZATION_PREVIEW_TENANT_ID =
  "ba40a477-d452-493b-fb23-08df2a1b4cda";
export const PERSONALIZATION_PREVIEW_AUTH0_DOMAIN =
  "https://auth.sitecorecloud.io";
export const PERSONALIZATION_PREVIEW_AUTH0_AUDIENCE =
  "https://api-webapp.sitecorecloud.io";
export const PERSONALIZATION_PREVIEW_APP_PATH = "/apps/personalization-preview";
export function isPersonalizationPreviewAuthPath(path: string): boolean {
  return (
    path === PERSONALIZATION_PREVIEW_APP_PATH ||
    path.startsWith(`${PERSONALIZATION_PREVIEW_APP_PATH}/`) ||
    path === "/api/personalization-preview" ||
    path.startsWith("/api/personalization-preview/")
  );
}
const APP_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export class PersonalizationPreviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PersonalizationPreviewError";
  }
}

export interface PersonalizationPreviewAuthConfiguration {
  clientId: string;
  clientSecret: string;
  secret: string;
  appBaseUrl: string;
  marketplaceAppId: string;
}

/** The tenant belongs to this installed app, not the Marketplace shell or CDP. */
export function personalizationPreviewAuthorizationParameters(
  configuration: Pick<
    PersonalizationPreviewAuthConfiguration,
    "marketplaceAppId"
  >,
) {
  return {
    scope: "openid profile email offline_access",
    audience: PERSONALIZATION_PREVIEW_AUTH0_AUDIENCE,
    organization_id: PERSONALIZATION_PREVIEW_ORGANIZATION_ID,
    tenant_id: PERSONALIZATION_PREVIEW_TENANT_ID,
    product_codes: `mkp_${configuration.marketplaceAppId}`,
  };
}

/** Read only this app's configuration; never fall back to portal/workshop keys. */
export function personalizationPreviewAuthConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PersonalizationPreviewAuthConfiguration | null {
  const clientId = environment.PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID?.trim();
  const clientSecret =
    environment.PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET?.trim();
  const secret = environment.PERSONALIZATION_PREVIEW_AUTH0_SECRET?.trim();
  const appBaseUrl = environment.PERSONALIZATION_PREVIEW_APP_BASE_URL?.trim();
  const domain = environment.PERSONALIZATION_PREVIEW_AUTH0_DOMAIN?.trim();
  const audience = environment.PERSONALIZATION_PREVIEW_AUTH0_AUDIENCE?.trim();
  const marketplaceAppId =
    environment.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID?.trim();
  if (
    !clientId ||
    !clientSecret ||
    !secret ||
    !/^[a-f0-9]{64}$/i.test(secret) ||
    !appBaseUrl ||
    !marketplaceAppId ||
    !APP_ID.test(marketplaceAppId) ||
    (domain &&
      domain.replace(/\/$/, "") !== PERSONALIZATION_PREVIEW_AUTH0_DOMAIN) ||
    (audience && audience !== PERSONALIZATION_PREVIEW_AUTH0_AUDIENCE)
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

export function personalizationPreviewApiConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): { contextId: string; appId: string } {
  const contextId =
    environment.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID?.trim();
  const appId = environment.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID?.trim();
  if (
    !contextId ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(contextId) ||
    !appId ||
    !APP_ID.test(appId)
  ) {
    throw new PersonalizationPreviewError(
      "CONFIGURATION_REQUIRED",
      "Personalization preview is not configured for this SitecoreAI environment.",
      503,
    );
  }
  return { contextId, appId };
}
import "server-only";
