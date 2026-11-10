import "server-only";
import { createGraphQLClientFactory } from "@sitecore-content-sdk/content/client";
import type {
  AudiencePreviewInput,
  AudiencePreviewResult,
} from "@/features/audience-preview/types";
import { PortalError } from "@/server/errors";
import { jsonResponse } from "@/server/http";
import {
  AudiencePreviewError as AccessError,
  audiencePreviewAuthConfiguration,
} from "@/server/marketplace/audience-preview-config";
import type {
  AudiencePreviewPage,
  AudiencePreviewPageRequest,
} from "@/server/marketplace/audience-preview-pages";
import { PortalPersonalizeService } from "@/server/personalization/PortalPersonalizeService";
import { getStateStore, stateNamespace } from "@/server/state/store";
import scConfig from "sitecore.config";
import {
  AudiencePreviewError,
  isObject,
  normalizeNativePreviewConfiguration,
  validateAudiencePreviewInput,
} from "./contracts";
import {
  evaluateAudiencePreview,
  type AudienceDecisionDependencies,
} from "./decisions";
import {
  prepareAudiencePreviewProfile,
  type AudienceProfileDependencies,
} from "./profiles";
import { createAudiencePreviewViewSession } from "./preview-sessions";
import { getAudiencePreviewLayout } from "./preview-client";
import { nativePreviewComponentNames } from "./native-layout";

export interface AudiencePreviewRequest extends AudiencePreviewPageRequest {
  input: AudiencePreviewInput;
}

export function parseAudiencePreviewRequest(
  value: unknown,
): AudiencePreviewRequest {
  if (
    !isObject(value) ||
    Object.keys(value).some(
      (key) => !["pageId", "language", "version", "input"].includes(key),
    ) ||
    typeof value.pageId !== "string" ||
    typeof value.language !== "string" ||
    (value.version !== undefined &&
      (!Number.isSafeInteger(value.version) || Number(value.version) < 1))
  ) {
    throw new AccessError(
      "INVALID_INPUT",
      "Select a page, language, and audience to preview.",
      400,
    );
  }
  return {
    pageId: value.pageId,
    language: value.language,
    ...(value.version === undefined ? {} : { version: Number(value.version) }),
    input: validateAudiencePreviewInput(value.input),
  };
}

export function audiencePreviewDependencies(): {
  profiles: AudienceProfileDependencies;
  decisions: AudienceDecisionDependencies;
} {
  const edgeUrl =
    scConfig.api.edge.edgeUrl || "https://edge-platform.sitecorecloud.io";
  const contentContextId =
    process.env.AUDIENCE_PREVIEW_EDGE_CONTEXT_ID ||
    process.env.SITECORE_EDGE_CONTEXT_ID ||
    "";
  const decisionContextId =
    process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID || "";
  const siteName = scConfig.defaultSite;
  const decision = normalizeNativePreviewConfiguration({
    edgeUrl,
    contextId: decisionContextId,
    siteName,
    scope: scConfig.personalize.scope,
  });
  return {
    profiles: {
      ...decision,
      store: getStateStore(),
      namespace: stateNamespace(),
    },
    decisions: {
      ...decision,
      discovery: new PortalPersonalizeService({
        clientFactory: createGraphQLClientFactory({
          api: { edge: { edgeUrl, contextId: contentContextId } },
        }),
        timeout: 8_000,
        scope: decision.scope,
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      }),
    },
  };
}

export interface PreviewServiceDependencies {
  profiles: AudienceProfileDependencies;
  decisions: AudienceDecisionDependencies;
  createView?: typeof createAudiencePreviewViewSession;
  loadLayout?: typeof getAudiencePreviewLayout;
  origin?: string;
}

export async function prepareAudiencePreview(
  actor: string,
  page: AudiencePreviewPage,
  input: AudiencePreviewInput,
  deps: PreviewServiceDependencies = audiencePreviewDependencies(),
): Promise<
  | ({ status: "ready" } & AudiencePreviewResult)
  | { status: "pending"; retryAfterSeconds: number }
> {
  const preparation = await prepareAudiencePreviewProfile(input, deps.profiles);
  if (preparation.status === "pending") return preparation;
  const decisions = await evaluateAudiencePreview(
    page,
    preparation.profile,
    deps.decisions,
  ).catch((error: unknown) => {
    if (
      error instanceof AudiencePreviewError &&
      error.code === "PREVIEW_BINDING_CHANGED" &&
      error.retryable
    )
      return null;
    throw error;
  });
  if (!decisions) return { status: "pending", retryAfterSeconds: 3 };
  const layout = await (deps.loadLayout || getAudiencePreviewLayout)(
    page,
    decisions,
  );
  const names = nativePreviewComponentNames(layout);
  const token = await (deps.createView || createAudiencePreviewViewSession)(
    actor,
    page,
    input,
    decisions,
  );
  const origin = deps.origin || audiencePreviewAuthConfiguration()?.appBaseUrl;
  if (!origin)
    throw new AccessError(
      "CONFIGURATION_REQUIRED",
      "Audience preview is not configured.",
      503,
    );
  return {
    status: "ready",
    title: "Your audience preview is ready",
    description:
      "Open the selected page with the content selected by SitecoreAI for this audience.",
    previewUrl: new URL(
      `/apps/audience-preview/view/${token}`,
      origin,
    ).toString(),
    matchedRules: decisions.selections.map((selection) => ({
      componentName: selection.componentId
        ? names.get(
            selection.componentId.replace(/[{}-]/g, "").toLowerCase(),
          ) || "Component"
        : "Page",
      experienceName: selection.control
        ? "Default content"
        : "Personalized content",
    })),
  };
}

/** Only messages from the app's own typed errors are safe to return to the iframe. */
export function audiencePreviewErrorResponse(error: unknown) {
  if (error instanceof AccessError || error instanceof PortalError) {
    const response = jsonResponse(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
    if (error.status === 429) response.headers.set("Retry-After", "60");
    return response;
  }
  if (error instanceof AudiencePreviewError) {
    const status = error.code.startsWith("INVALID_")
      ? 400
      : error.code.includes("CONFIGURED")
        ? 503
        : 502;
    return jsonResponse(
      { error: { code: error.code, message: error.message } },
      status,
    );
  }
  console.error(
    "Audience preview failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return jsonResponse(
    {
      error: {
        code: "PREVIEW_UNAVAILABLE",
        message: "The preview could not be prepared. Please try again.",
      },
    },
    503,
  );
}
