import type {
  BusinessLine,
  PortalBootstrap,
  Product,
  ProductCatalogPage,
  StateCode,
} from "@/contracts/portal";
import {
  evaluateProductAvailability,
  evaluateProductEligibility,
} from "@/domain/eligibility";

export type ProductCatalogContext = Pick<
  PortalBootstrap,
  "agent" | "agency" | "products" | "eligibility"
>;

export interface AvailableProductPage {
  page: ProductCatalogPage;
  products: Product[];
  eligibleProducts: Product[];
}

/** CMS references select content; current operational rules still decide availability and authority. */
export function productPagesForState(
  pages: readonly ProductCatalogPage[],
  data: ProductCatalogContext,
  state: StateCode | "" | undefined,
  line: BusinessLine | "all" = "all",
  at?: string | Date,
): AvailableProductPage[] {
  if (!state || !data.agent.licensedStates.includes(state)) return [];
  const byId = new Map(data.products.map((product) => [product.id, product]));
  return pages.flatMap((page) => {
    if (page.channel !== "all" && page.channel !== data.agency.channel)
      return [];
    const references = [...new Set(page.productIds)].map((id) => byId.get(id));
    if (!references.length || references.some((product) => !product)) return [];
    const products = (references as Product[]).filter(
      (product) =>
        (line === "all" || product.line === line) &&
        evaluateProductAvailability({
          product,
          state,
          eligibility: data.eligibility,
          at,
        }).allowed,
    );
    if (!products.length) return [];
    return [
      {
        page,
        products,
        eligibleProducts: products.filter(
          (product) =>
            product.line !== "surety" &&
            evaluateProductEligibility({
              agent: data.agent,
              agency: data.agency,
              product,
              state,
              eligibility: data.eligibility,
              at,
            }).allowed,
        ),
      },
    ];
  });
}
