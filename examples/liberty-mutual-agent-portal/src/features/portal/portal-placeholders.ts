import { HIDDEN_RENDERING_NAME } from "@sitecore-content-sdk/content";
import type { Page, RouteData } from "@sitecore-content-sdk/nextjs";

/** These keys match the owned Sitecore placeholder settings and layout definitions. */
export const PORTAL_PLACEHOLDERS = {
  campaignPage: {
    name: "headless-campaign-page",
    componentName: "CampaignPage",
  },
  guidance: {
    name: "headless-agent-guidance",
    componentName: "AgentGuidance",
  },
  resourceSearch: {
    name: "headless-resource-search",
    componentName: "ResourceSearch",
  },
  resourceArticle: {
    name: "headless-resource-article",
    componentName: "ResourceArticle",
  },
  productSpotlight: {
    name: "headless-products-spotlight",
    componentName: "ProductSpotlight",
  },
  supportForm: {
    name: "headless-support-form",
    componentName: "Form",
  },
} as const;

type PortalPlaceholder = keyof typeof PORTAL_PLACEHOLDERS;
export type PortalPlaceholderPlacement = {
  name: string;
  rendering: RouteData;
};

/** Operational aliases use the same authored composition as their owning page. */
function placeholdersForRoute(route: string): PortalPlaceholder[] {
  const [section, child] = route.split("/").filter(Boolean);
  if (section === "growth" && child) return ["campaignPage"];
  if (
    (section === "resources" && child) ||
    /^\/workshop-practice(?:\/pair-0[1-9])?\/?$/.test(route)
  )
    return ["resourceArticle"];
  if (section === "resources" || section === "learning")
    return ["resourceSearch", "guidance"];
  if (section === "products" && !child) return ["guidance", "productSpotlight"];
  if (section === "support" && !child) return ["guidance", "supportForm"];
  return ["guidance"];
}

/**
 * Select the named slots for this page without changing native component instances.
 * Sitecore's layout and placeholder settings control what authors can insert;
 * this boundary also prevents a misplaced component from rendering in another slot.
 */
export function getPortalPlaceholders(
  route: string,
  rendering: RouteData,
  mode: Pick<Page["mode"], "isEditing" | "isPreview">,
): Partial<Record<PortalPlaceholder, PortalPlaceholderPlacement>> {
  const placements: Partial<
    Record<PortalPlaceholder, PortalPlaceholderPlacement>
  > = {};
  for (const slot of placeholdersForRoute(route)) {
    const setting = PORTAL_PLACEHOLDERS[slot];
    const hasCanonicalKey = Object.hasOwn(rendering.placeholders, setting.name);
    // Delivery stays compatible while the earlier published layout is replaced.
    // Page Builder and preview only expose the restricted, canonical placeholders.
    const useLegacy =
      !mode.isEditing &&
      !mode.isPreview &&
      !hasCanonicalKey &&
      slot !== "productSpotlight" &&
      slot !== "supportForm" &&
      slot !== "campaignPage";
    const name = useLegacy ? "headless-main" : setting.name;
    const candidates = rendering.placeholders[name] ?? [];
    const contents = candidates.filter(
      (component) =>
        component.componentName === setting.componentName ||
        (mode.isEditing && component.componentName === HIDDEN_RENDERING_NAME),
    );
    if (
      (slot === "productSpotlight" || slot === "supportForm") &&
      !mode.isEditing &&
      contents.length === 0
    )
      continue;
    placements[slot] = {
      name,
      rendering: {
        ...rendering,
        // The SDK requires an explicit empty key to emit a valid editing chrome ID.
        // Retain the component objects, UIDs, datasources, fields and native variants.
        placeholders: { [name]: contents },
      },
    };
  }
  return placements;
}
