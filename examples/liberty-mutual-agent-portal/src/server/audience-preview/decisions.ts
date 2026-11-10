import "server-only";
import {
  CdpHelper,
  DEFAULT_VARIANT,
  type PersonalizeInfo,
} from "@sitecore-content-sdk/content/personalize";
import type { AudiencePreviewPage } from "@/features/audience-preview/types";
import { readPortalBrowserProfileRef } from "@/lib/portal-identity-link";
import {
  AudiencePreviewError,
  responseObject,
  validateNativePreviewConfiguration,
  type NativePreviewConfiguration,
} from "./contracts";
import {
  assertVerifiedPreviewProfile,
  type VerifiedPreviewProfile,
} from "./profiles";

export interface NativePreviewDiscovery {
  getPersonalizeInfo(
    path: string,
    language: string,
    siteName: string,
  ): Promise<PersonalizeInfo | undefined>;
}
export interface AudienceDecisionDependencies extends NativePreviewConfiguration {
  /** Inject PortalPersonalizeService configured with the server's content-scoped context. */
  discovery: NativePreviewDiscovery;
  transport?: typeof fetch;
  readProfileRef?: typeof readPortalBrowserProfileRef;
}
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
export interface AudiencePreviewDecisions {
  pageId: string;
  selectedVariantIds: string[];
  pageVariantId?: string;
  componentVariantIds: string[];
  selections: NativePreviewSelection[];
}

const normalizedId = (value: string) =>
  value.replace(/[{}-]/g, "").toLowerCase();
const pageIdPattern = /^(?:\{[a-f0-9-]{36}\}|[a-f0-9-]{36}|[a-f0-9]{32})$/i;

function invalidPage(): never {
  throw new AudiencePreviewError(
    "INVALID_PREVIEW_PAGE",
    "Select a valid page in Page Builder.",
  );
}

export function validateAudiencePreviewPage(
  page: AudiencePreviewPage,
  siteName: string,
): void {
  if (
    !page ||
    typeof page.id !== "string" ||
    !pageIdPattern.test(page.id) ||
    !/^[a-f0-9]{32}$/.test(normalizedId(page.id)) ||
    page.siteName !== siteName ||
    typeof page.language !== "string" ||
    !/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,2}$/.test(page.language) ||
    typeof page.path !== "string" ||
    !page.path.startsWith("/") ||
    page.path.startsWith("//") ||
    page.path.length > 1024 ||
    /[?#\\\x00-\x20]/.test(page.path) ||
    page.path
      .split("/")
      .some((segment) => segment === "." || segment === "..") ||
    /%(?:2e|2f|5c)/i.test(page.path) ||
    (page.version !== undefined &&
      (!Number.isSafeInteger(page.version) ||
        page.version < 1 ||
        page.version > 1_000_000))
  )
    invalidPage();
}

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
    throw new AudiencePreviewError(
      "INVALID_NATIVE_DISCOVERY",
      "SitecoreAI could not confirm this page’s personalization variants.",
    );
  }
  const executions: NativePreviewExecution[] = [];
  for (const variantId of info.variantIds) {
    const componentId = variantId.includes("_")
      ? variantId.split("_")[0]
      : undefined;
    if (componentId === "")
      throw new AudiencePreviewError(
        "INVALID_NATIVE_DISCOVERY",
        "SitecoreAI returned an invalid component variant.",
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

/** Native runtime evaluation of published targeting, against an isolated, verified synthetic profile. */
export async function evaluateAudiencePreview(
  page: AudiencePreviewPage,
  profile: VerifiedPreviewProfile,
  dependencies: AudienceDecisionDependencies,
): Promise<AudiencePreviewDecisions> {
  validateNativePreviewConfiguration(dependencies);
  validateAudiencePreviewPage(page, dependencies.siteName);
  assertVerifiedPreviewProfile(profile);
  const transport = dependencies.transport || fetch;
  const readRef = dependencies.readProfileRef || readPortalBrowserProfileRef;
  const currentRef = await readRef(
    {
      edgeUrl: dependencies.edgeUrl,
      contextId: dependencies.contextId,
      browserId: profile.browserId,
    },
    AbortSignal.timeout(8_000),
    transport,
  );
  if (currentRef?.toLowerCase() !== profile.profileId.toLowerCase()) {
    throw new AudiencePreviewError(
      "PREVIEW_BINDING_CHANGED",
      "The preview profile’s browser binding could not be confirmed.",
      true,
    );
  }
  const info = await dependencies.discovery.getPersonalizeInfo(
    page.path!,
    page.language,
    page.siteName,
  );
  if (!info || normalizedId(info.pageId) !== normalizedId(page.id)) {
    throw new AudiencePreviewError(
      "PREVIEW_DISCOVERY_UNAVAILABLE",
      "SitecoreAI could not confirm personalization for the selected page.",
      true,
    );
  }
  const executions = nativePreviewExecutions(
    info,
    page.language,
    dependencies.scope,
  );
  const endpoint = new URL("/v1/personalize", dependencies.edgeUrl);
  endpoint.searchParams.set("siteId", dependencies.siteName);
  const selections = await Promise.all(
    executions.map(async (execution): Promise<NativePreviewSelection> => {
      let response: Response;
      try {
        response = await transport(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-sitecore-contextid": dependencies.contextId,
          },
          body: JSON.stringify({
            channel: "WEB",
            clientKey: "",
            currencyCode: "USD",
            friendlyId: execution.friendlyId,
            language: page.language,
            pointOfSale: "",
            variants: execution.variantIds,
            browserId: profile.browserId,
            guestRef: profile.profileId,
          }),
          signal: AbortSignal.timeout(8_000),
          cache: "no-store",
          redirect: "error",
          credentials: "omit",
        });
      } catch {
        throw new AudiencePreviewError(
          "NATIVE_DECISION_UNAVAILABLE",
          "SitecoreAI could not evaluate this audience. Please try again.",
          true,
        );
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        throw new AudiencePreviewError(
          "NATIVE_DECISION_UNAVAILABLE",
          "SitecoreAI could not evaluate this audience. Please try again.",
          true,
        );
      }
      const receipt = await responseObject(response);
      if (
        typeof receipt.variantId !== "string" ||
        !execution.variantIds.includes(receipt.variantId)
      ) {
        throw new AudiencePreviewError(
          "INVALID_NATIVE_DECISION",
          "SitecoreAI did not return a valid variant for this component.",
        );
      }
      return {
        friendlyId: execution.friendlyId,
        ...(execution.componentId
          ? { componentId: execution.componentId }
          : {}),
        variantId: receipt.variantId,
        control:
          receipt.variantId === DEFAULT_VARIANT ||
          receipt.variantId.endsWith(DEFAULT_VARIANT),
      };
    }),
  );
  return {
    pageId: info.pageId,
    selectedVariantIds: selections.map((selection) => selection.variantId),
    pageVariantId: selections.find((selection) => !selection.componentId)
      ?.variantId,
    componentVariantIds: selections
      .filter((selection) => selection.componentId)
      .map((selection) => selection.variantId),
    selections,
  };
}
