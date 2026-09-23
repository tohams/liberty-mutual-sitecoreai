import "server-only";
import type { RouteData } from "@sitecore-content-sdk/nextjs";
import type { ProductCatalogPage } from "@/contracts/portal";
import {
  productPagesForState,
  type ProductCatalogContext,
} from "@/features/products/product-catalog";
import { initialRiskState } from "@/features/portal/risk-state-navigation";
import { PRODUCT_PAGE_TEMPLATE_ID } from "./cms-products";

export function isProductCatalogPage(route: RouteData): boolean {
  return (
    route.templateId?.replace(/[{}-]/g, "").toLowerCase() ===
    PRODUCT_PAGE_TEMPLATE_ID.replace(/[{}-]/g, "").toLowerCase()
  );
}

/** Filter before serialization; hidden cards must not remain readable in the browser payload. */
export function availableProductCatalog(
  catalog: readonly ProductCatalogPage[],
  data: ProductCatalogContext,
  queryState: string | null | undefined,
): ProductCatalogPage[] {
  const state = initialRiskState({
    queryState,
    homeState: data.agent.state,
    licensedStates: data.agent.licensedStates,
  });
  return productPagesForState(catalog, data, state).map((item) => item.page);
}

/** Enforce the same published-page, channel, and licensed-state boundaries on direct URLs. */
export function canAccessProductPage(
  route: RouteData,
  catalog: readonly ProductCatalogPage[] | null | undefined,
  data: ProductCatalogContext,
  queryState: string | null | undefined,
  verifiedEditing: boolean,
): boolean {
  if (verifiedEditing || !isProductCatalogPage(route)) return true;
  const id = route.itemId?.replace(/[{}-]/g, "").toLowerCase();
  const page = catalog?.find(
    (item) => item.id.replace(/[{}-]/g, "").toLowerCase() === id,
  );
  if (!page) return false;
  return availableProductCatalog([page], data, queryState).length === 1;
}
