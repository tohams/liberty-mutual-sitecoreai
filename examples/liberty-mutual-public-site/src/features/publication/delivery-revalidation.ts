/** This deployment serves only the public site. Match its actual rewritten route,
 * rather than browser URLs, so shared partials and every public page are refreshed.
 * The SDK's sitemap/robots handlers use these tags; its dictionary convention is
 * scoped to the single site and language supported by this head.
 */
export const PUBLIC_DELIVERY_PATH = "/[site]/[locale]/[[...path]]";
export const PUBLIC_DELIVERY_TAGS = Object.freeze([
  "sitemap",
  "robots",
  "sc:dict:liberty-mutual-public-site:en",
]);

export interface DeliveryRevalidation {
  revalidated: true;
  site: "liberty-mutual-public-site";
  pagePatterns: number;
  tags: number;
}
export type DeliveryInvalidator = () => DeliveryRevalidation;
export interface DeliveryCache {
  path(path: string, type: "page"): void;
  tag(tag: string, profile: { expire: 0 }): void;
}

/** Edge OnEnd is the completion signal. Expire immediately, without serving one
 * stale response through the usual stale-while-revalidate `max` profile.
 */
export function revalidatePublicDelivery(
  cache: DeliveryCache,
): DeliveryRevalidation {
  cache.path(PUBLIC_DELIVERY_PATH, "page");
  for (const tag of PUBLIC_DELIVERY_TAGS) cache.tag(tag, { expire: 0 });
  return {
    revalidated: true,
    site: "liberty-mutual-public-site",
    pagePatterns: 1,
    tags: PUBLIC_DELIVERY_TAGS.length,
  };
}
