import type { Product, Resource } from "@/contracts/portal";

import { RESOURCE_SLUG_ALIASES } from "@/contracts/resource-routes";

/** The root navigation item is active only on Home, not every absolute path. */
export function isPortalNavigationActive(route: string, href: string) {
  return route === href || (href !== "/" && route.startsWith(`${href}/`));
}

/** Select an authored page for operational routes without interpreting SDK rewrite segments. */
export function portalContentPath(route: string, originalPath: string[]) {
  const segments = route.split('/').filter(Boolean);
  const section = segments[0];
  if (['submissions', 'surety', 'appetite'].includes(section)) return ['quote'];
  if (['policies', 'renewals'].includes(section) || (section === 'clients' && segments.length > 1)) return ['clients'];
  if (section === 'learning') return ['resources'];
  return originalPath;
}

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
