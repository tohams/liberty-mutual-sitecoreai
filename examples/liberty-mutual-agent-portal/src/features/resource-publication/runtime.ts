import { identifier, PublicationError } from "./content";
import { LiveResources } from "./live-content";
import { RedisReceiptStore } from "./receipt-store";
import { SearchPush } from "./search-push";
import { PublicationService } from "./publication-service";

export type PublicationEnvironment = Readonly<
  Record<string, string | undefined>
>;

export function resourceOrigin(
  environment: PublicationEnvironment = process.env,
): string {
  let origin: URL;
  try {
    origin = new URL(environment.PORTAL_RESOURCE_PUBLIC_ORIGIN || "");
  } catch {
    throw new PublicationError("RESOURCE_ORIGIN_NOT_CONFIGURED");
  }
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new PublicationError("RESOURCE_ORIGIN_NOT_CONFIGURED");
  return origin.origin;
}

export function publicationRuntime(
  environment: PublicationEnvironment = process.env,
) {
  const sourceId = environment.PORTAL_RESOURCE_SEARCH_SOURCE_ID || "";
  let normalizedSource: string;
  try {
    normalizedSource = identifier(sourceId);
  } catch {
    throw new PublicationError("RESOURCE_SOURCE_NOT_CONFIGURED");
  }
  // A dedicated source protects both the prior Portal index and the public site.
  if (
    [
      "b5e24aff-8b5b-4653-bf66-deef52c1241a",
      "f527245d-98c7-4978-8802-237d7717ca43",
    ].includes(normalizedSource)
  )
    throw new PublicationError("RESOURCE_SOURCE_NOT_DEDICATED");
  const store = new RedisReceiptStore(
    environment.PORTAL_RESOURCE_REDIS_REST_URL ||
      environment.KV_REST_API_URL ||
      "",
    environment.PORTAL_RESOURCE_REDIS_REST_TOKEN ||
      environment.KV_REST_API_TOKEN ||
      "",
    sourceId,
  );
  return {
    store,
    service: new PublicationService(
      new LiveResources(
        environment.PORTAL_RESOURCE_LIVE_EDGE_CONTEXT_ID || "",
        resourceOrigin(environment),
      ),
      new SearchPush(
        environment.PORTAL_RESOURCE_SEARCH_INGESTION_URL || "",
        sourceId,
        environment.PORTAL_RESOURCE_SEARCH_PUSH_API_KEY || "",
      ),
      store,
    ),
  };
}
