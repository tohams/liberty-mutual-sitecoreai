import { PublicationError } from "./content";
import { LiveContent } from "./live-content";
import { RedisReceiptStore } from "./receipt-store";
import { SearchPush } from "./search-push";
import { PublicationService } from "./publication-service";

export type PublicationEnvironment = Readonly<
  Record<string, string | undefined>
>;

export function publicOrigin(
  environment: PublicationEnvironment = process.env,
): string {
  let url: URL;
  try {
    url = new URL(
      environment.PUBLIC_SITE_URL || environment.NEXT_PUBLIC_SITE_URL || "",
    );
  } catch {
    throw new PublicationError("PUBLIC_ORIGIN_NOT_CONFIGURED");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new PublicationError("PUBLIC_ORIGIN_NOT_CONFIGURED");
  return url.origin;
}

export function liveContent(
  environment: PublicationEnvironment = process.env,
): LiveContent {
  // This explicit server-only setting is never inferred from the authoring host's context.
  return new LiveContent(
    environment.SITECORE_LIVE_EDGE_CONTEXT_ID || "",
    publicOrigin(environment),
  );
}

export function publicationRuntime(
  environment: PublicationEnvironment = process.env,
) {
  const store = new RedisReceiptStore(
    environment.PUBLICATION_REDIS_REST_URL || environment.KV_REST_API_URL || "",
    environment.PUBLICATION_REDIS_REST_TOKEN ||
      environment.KV_REST_API_TOKEN ||
      "",
    environment.SITECORE_SEARCH_SOURCE_ID || "",
  );
  const writer = new SearchPush(
    environment.SITECORE_SEARCH_INGESTION_URL || "",
    environment.SITECORE_SEARCH_SOURCE_ID || "",
    environment.SITECORE_SEARCH_PUSH_API_KEY || "",
  );
  return {
    store,
    service: new PublicationService(liveContent(environment), writer, store),
  };
}
