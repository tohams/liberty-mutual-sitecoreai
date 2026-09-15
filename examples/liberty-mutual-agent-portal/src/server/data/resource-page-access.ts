import "server-only";
import type { RouteData } from "@sitecore-content-sdk/nextjs";
import type { StateCode } from "@/contracts/portal";
import {
  canAccessResourceStates,
  parseResourceStates,
} from "@/domain/resource-access";

const RESOURCE_PAGE_TEMPLATE = "e9573e8d00d65fd990152f0aec4a0b60";

function stateValue(fields: RouteData["fields"]): unknown {
  const state = fields?.state;
  return state && typeof state === "object" && "value" in state
    ? state.value
    : undefined;
}

/** Call before passing native page data to any client component or rendering content. */
export function canAccessResourcePage(
  path: string,
  route: RouteData,
  licensedStates: readonly StateCode[],
  verifiedEditing: boolean,
): boolean {
  // Only the SDK's authenticated Draft Mode handler establishes this value.
  // Page mode, URL parameters, and the synthetic editor profile cannot grant access.
  if (verifiedEditing) return true;
  const isResourcePage =
    route.templateId?.replace(/[{}-]/g, "").toLowerCase() ===
    RESOURCE_PAGE_TEMPLATE;
  if (!isResourcePage && !/^\/resources\/[^/]+/.test(path)) return true;
  if (
    !canAccessResourceStates(
      parseResourceStates(stateValue(route.fields)),
      licensedStates,
    )
  )
    return false;
  const key = Object.hasOwn(route.placeholders, "headless-resource-article")
    ? "headless-resource-article"
    : "headless-main";
  const articles = (route.placeholders[key] ?? []).filter(
    (item) => item.componentName === "ResourceArticle",
  );
  // Validate the actual rendered datasource too, including native content variants.
  return (
    articles.length > 0 &&
    articles.every((article) =>
      canAccessResourceStates(
        parseResourceStates(stateValue(article.fields)),
        licensedStates,
      ),
    )
  );
}
