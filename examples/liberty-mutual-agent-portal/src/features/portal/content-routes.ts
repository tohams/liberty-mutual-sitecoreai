import type { Product, Resource } from "@/contracts/portal";

import { RESOURCE_SLUG_ALIASES } from "@/contracts/resource-routes";

export function resourceHref(resource: Resource | string) {
  if (typeof resource !== "string" && resource.href) return resource.href;
  const resourceId = typeof resource === "string" ? resource : resource.id;
  return `/resources/${RESOURCE_SLUG_ALIASES[resourceId] || resourceId}`;
}

export function productHref(
  product: Product,
  channel: "independent" | "wholesale",
) {
  if (product.id === "farm-ranch") return "/products/farm-ranch";
  if (product.line === "commercial") return "/products/midsize-large";
  if (product.line === "specialty")
    return channel === "wholesale"
      ? "/products/wholesale-specialty"
      : "/products/retail-specialty";
  return `/products/${product.line}`;
}
