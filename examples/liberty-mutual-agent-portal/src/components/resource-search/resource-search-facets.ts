import type { FacetRequest } from "@sitecore-content-sdk/search";
import type { StateCode } from "@/contracts/portal";
import type { ResourceStateScope } from "@/features/resources/resource-state-scope";

export const RESOURCE_FACET_NAMES = [
  "Resource type",
  "Business family",
  "Distribution channel",
  "Product",
] as const;
export type ResourceFacetSelection = Partial<
  Record<(typeof RESOURCE_FACET_NAMES)[number], string>
>;

/** Native OR filtering happens before pagination, totals and the other facets. */
export function buildResourceSearchFacet(
  scope: ResourceStateScope,
  licensedStates: readonly StateCode[],
  selection: ResourceFacetSelection = {},
): FacetRequest {
  const states =
    scope === "licensed"
      ? [...new Set([...licensedStates, "All"])]
      : scope === "all"
        ? []
        : scope === "All"
          ? ["All"]
          : [scope, "All"];
  return {
    all: true,
    fields: [
      ...(states.length
        ? [
            {
              name: "Risk state",
              filters: [{ operator: "eq" as const, value: states }],
            },
          ]
        : []),
      ...RESOURCE_FACET_NAMES.flatMap((name) =>
        selection[name]
          ? [
              {
                name,
                filters: [{ operator: "eq" as const, value: selection[name]! }],
              },
            ]
          : [],
      ),
    ],
  };
}
