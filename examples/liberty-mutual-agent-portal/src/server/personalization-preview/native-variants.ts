import "server-only";
import {
  CdpHelper,
  DEFAULT_VARIANT,
  type PersonalizeInfo,
} from "@sitecore-content-sdk/content/personalize";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";

export interface NativePreviewExecution {
  friendlyId: string;
  componentId?: string;
  variantIds: string[];
}
export interface NativePreviewSelection {
  friendlyId: string;
  componentId?: string;
  variantId: string;
  control: boolean;
}
export interface NativePreviewDecisions {
  pageId: string;
  selectedVariantIds: string[];
  pageVariantId?: string;
  componentVariantIds: string[];
  selections: NativePreviewSelection[];
}

const normalizedId = (value: string) =>
  value.replace(/[{}-]/g, "").toLowerCase();
const pageIdPattern = /^(?:\{[a-f0-9-]{36}\}|[a-f0-9-]{36}|[a-f0-9]{32})$/i;

/** Mirrors the SDK grouping and friendly-ID helpers; there are no role-to-variant mappings here. */
export function nativePreviewExecutions(
  info: PersonalizeInfo,
  language: string,
  scope?: string,
): NativePreviewExecution[] {
  if (
    !info ||
    typeof info.pageId !== "string" ||
    !pageIdPattern.test(info.pageId) ||
    !/^[a-f0-9]{32}$/.test(normalizedId(info.pageId)) ||
    !Array.isArray(info.variantIds) ||
    info.variantIds.length > 100 ||
    new Set(info.variantIds).size !== info.variantIds.length ||
    info.variantIds.some(
      (id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(id),
    )
  ) {
    throw new PersonalizationPreviewError(
      "INVALID_NATIVE_DISCOVERY",
      "SitecoreAI could not confirm this page’s personalization variants.",
      502,
    );
  }
  const executions: NativePreviewExecution[] = [];
  for (const variantId of info.variantIds) {
    const componentId = variantId.includes("_")
      ? variantId.split("_")[0]
      : undefined;
    if (componentId === "")
      throw new PersonalizationPreviewError(
        "INVALID_NATIVE_DISCOVERY",
        "SitecoreAI returned an invalid component variant.",
        502,
      );
    const friendlyId = componentId
      ? CdpHelper.getComponentFriendlyId(
          info.pageId,
          componentId,
          language,
          scope,
        )
      : CdpHelper.getPageFriendlyId(info.pageId, language, scope);
    const existing = executions.find(
      (entry) => entry.friendlyId === friendlyId,
    );
    if (existing) existing.variantIds.push(variantId);
    else
      executions.push({
        friendlyId,
        ...(componentId ? { componentId } : {}),
        variantIds: componentId
          ? [...new Set([`${componentId}${DEFAULT_VARIANT}`, variantId])]
          : [variantId],
      });
  }
  return executions;
}
