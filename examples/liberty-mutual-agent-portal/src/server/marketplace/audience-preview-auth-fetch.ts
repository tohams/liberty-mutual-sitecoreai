import "server-only";
import {
  AUDIENCE_PREVIEW_AUTH0_DOMAIN,
  audiencePreviewAuthorizationParameters,
} from "./audience-preview-config";

/** Bind native refresh to the same fixed organization and installed app context as login. */
export function createAudiencePreviewAuthFetch(
  marketplaceAppId: string,
  transport: typeof fetch = fetch,
): typeof fetch {
  const { organization_id, tenant_id, product_codes } =
    audiencePreviewAuthorizationParameters({ marketplaceAppId });
  return async (input, init) => {
    let url: URL;
    try {
      url = new URL(input instanceof Request ? input.url : String(input));
    } catch {
      return transport(input, init);
    }
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");
    const body = init?.body;
    // oauth4webapi passes a URLSearchParams body to the SDK customFetch hook.
    // Other endpoints, grants, and body types pass through without inspection.
    if (
      url.origin !== AUDIENCE_PREVIEW_AUTH0_DOMAIN ||
      url.pathname !== "/oauth/token" ||
      url.username ||
      url.password ||
      url.hash ||
      method.toUpperCase() !== "POST" ||
      !(body instanceof URLSearchParams) ||
      body.getAll("grant_type").length !== 1 ||
      body.get("grant_type") !== "refresh_token"
    )
      return transport(input, init);
    const parameters = new URLSearchParams(body);
    parameters.set("organization_id", organization_id);
    parameters.set("tenant_id", tenant_id);
    parameters.set("product_codes", product_codes);
    const response = await transport(input, { ...init, body: parameters });
    console.info(
      JSON.stringify({
        operation: "audience_preview_refresh",
        status: response.status,
      }),
    );
    return response;
  };
}
