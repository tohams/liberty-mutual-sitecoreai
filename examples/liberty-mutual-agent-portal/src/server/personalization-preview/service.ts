import "server-only";
import { createGraphQLClientFactory } from "@sitecore-content-sdk/content/client";
import type { PersonalizeInfo } from "@sitecore-content-sdk/content/personalize";
import {
  PersonalizationPreviewError,
  personalizationPreviewAuthConfiguration,
} from "@/server/marketplace/personalization-preview-config";
import { AudiencePreviewError as NativeReceiptError } from "@/server/marketplace/audience-preview-config";
import { AudiencePreviewError as NativeDiscoveryError } from "@/server/audience-preview/contracts";
import { PortalPersonalizeService } from "@/server/personalization/PortalPersonalizeService";
import { PortalError } from "@/server/errors";
import { jsonResponse } from "@/server/http";
import scConfig from "sitecore.config";
import {
  buildPersonalizationCatalog,
  selectPersonalizationOutcomes,
  type PersonalizationCatalog,
} from "./catalog";
import { readPersonalizationFlowDefinitions } from "./upstream";
import { readNativePersonalizationContentDefinitions } from "./native-content";
import { nativePreviewExecutions } from "@/server/audience-preview/decisions";
import {
  createPersonalizationPreviewViewSession,
  type PersonalizationPreviewViewSession,
} from "./preview-sessions";
import { getPersonalizationPreviewLayout } from "./preview-client";
import { personalizationPreviewContentContextId } from "./content-context";
import {
  observePersonalizationPreviewStage,
  type PersonalizationPreviewTimingObserver,
} from "./timing";
import type {
  PersonalizationPreviewPage,
  PersonalizationPreviewPageRequest,
  PersonalizationPreviewRequest,
  PersonalizationPreviewResult,
} from "./types";

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export interface PersonalizationPreviewDependencies {
  readFlows: typeof readPersonalizationFlowDefinitions;
  readNativeContent?: typeof readNativePersonalizationContentDefinitions;
  getInfo(
    page: PersonalizationPreviewPage,
  ): Promise<PersonalizeInfo | undefined>;
  loadLayout: typeof getPersonalizationPreviewLayout;
  createView: typeof createPersonalizationPreviewViewSession;
  origin?: string;
  scope?: string;
  onTiming?: PersonalizationPreviewTimingObserver;
}

export function personalizationPreviewDependencies(): PersonalizationPreviewDependencies {
  const edgeUrl =
    scConfig.api.edge.edgeUrl || "https://edge-platform.sitecorecloud.io";
  const contextId = personalizationPreviewContentContextId();
  const discovery = new PortalPersonalizeService({
    clientFactory: createGraphQLClientFactory({
      api: { edge: { edgeUrl, contextId } },
    }),
    timeout: 8_000,
    cacheEnabled: false,
    scope: scConfig.personalize.scope,
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  });
  return {
    readFlows: readPersonalizationFlowDefinitions,
    readNativeContent: readNativePersonalizationContentDefinitions,
    getInfo: (page) =>
      discovery.getPersonalizeInfo(page.path, page.language, page.siteName),
    loadLayout: getPersonalizationPreviewLayout,
    createView: createPersonalizationPreviewViewSession,
    origin: personalizationPreviewAuthConfiguration()?.appBaseUrl,
    scope: scConfig.personalize.scope,
  };
}

export function parsePersonalizationPageRequest(
  value: unknown,
): PersonalizationPreviewPageRequest {
  if (
    !object(value) ||
    Object.keys(value).some(
      (key) => !["pageId", "language", "version", "siteName"].includes(key),
    ) ||
    typeof value.pageId !== "string" ||
    !/^[a-f0-9-]{32,36}$/i.test(value.pageId) ||
    typeof value.language !== "string" ||
    !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(value.language) ||
    (value.version !== undefined &&
      (!Number.isSafeInteger(value.version) ||
        Number(value.version) < 1 ||
        Number(value.version) > 1_000_000)) ||
    (value.siteName !== undefined &&
      value.siteName !== "liberty-mutual-agent-portal")
  )
    throw new PersonalizationPreviewError(
      "INVALID_PAGE_SELECTION",
      "Select a valid Agent Portal page, language, and version in Page Builder.",
      400,
    );
  return {
    pageId: value.pageId,
    language: value.language,
    ...(value.version === undefined ? {} : { version: Number(value.version) }),
    ...(value.siteName === undefined
      ? {}
      : { siteName: String(value.siteName) }),
  };
}

export function parsePersonalizationPreviewRequest(
  value: unknown,
): PersonalizationPreviewRequest {
  if (
    !object(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          "pageId",
          "language",
          "version",
          "siteName",
          "revision",
          "selections",
        ].includes(key),
    )
  )
    throw new PersonalizationPreviewError(
      "INVALID_INPUT",
      "Select a page and its personalization results.",
      400,
    );
  const { revision, selections, ...page } = value;
  if (
    typeof revision !== "string" ||
    !/^[a-f0-9]{64}$/.test(revision) ||
    !Array.isArray(selections) ||
    selections.length > 10 ||
    selections.some(
      (entry) =>
        !object(entry) ||
        Object.keys(entry).length !== 2 ||
        typeof entry.flowId !== "string" ||
        !/^[A-Za-z0-9_-]{1,200}$/.test(entry.flowId) ||
        typeof entry.optionId !== "string" ||
        !/^[A-Za-z0-9_-]{1,200}$/.test(entry.optionId),
    )
  )
    throw new PersonalizationPreviewError(
      "INVALID_SELECTION",
      "Choose one result for each personalization.",
      400,
    );
  return {
    ...parsePersonalizationPageRequest(page),
    revision,
    selections: selections as PersonalizationPreviewRequest["selections"],
  };
}

export async function loadPersonalizationPreviewCatalog(
  page: PersonalizationPreviewPage,
  accessToken: string,
  dependencies = personalizationPreviewDependencies(),
): Promise<PersonalizationCatalog> {
  const [flows, info] = await Promise.all([
    dependencies.readFlows(page, accessToken),
    dependencies.getInfo(page),
  ]);
  if (!info)
    throw new PersonalizationPreviewError(
      "PERSONALIZATION_DISCOVERY_UNAVAILABLE",
      "SitecoreAI could not confirm this page’s preview variants. Please try again.",
      502,
    );
  const preferred =
    flows.length || !info.variantIds.length
      ? buildPersonalizationCatalog(page, flows, info, dependencies.scope)
      : undefined;
  const coveredOwners = new Set(
    [...(preferred?.choices.values() || [])].flatMap((choices) =>
      [...choices.values()].flatMap((choice) =>
        choice.componentId ? [choice.componentId] : [],
      ),
    ),
  );
  const missingComponents = nativePreviewExecutions(
    info,
    page.language,
    dependencies.scope,
  ).some(
    (execution) =>
      execution.componentId && !coveredOwners.has(execution.componentId),
  );
  if (missingComponents && dependencies.readNativeContent) {
    const native = await dependencies.readNativeContent(
      page,
      info,
      accessToken,
      dependencies.scope,
      undefined,
      coveredOwners,
    );
    const catalog = buildPersonalizationCatalog(
      page,
      [...flows, ...native.definitions],
      info,
      dependencies.scope,
    );
    catalog.context.warnings = [
      ...native.warnings,
      ...(catalog.context.warnings || []),
    ];
    return catalog;
  }
  return (
    preferred ||
    buildPersonalizationCatalog(page, flows, info, dependencies.scope)
  );
}

export async function preparePersonalizationPreview(
  actor: string,
  accessToken: string,
  page: PersonalizationPreviewPage,
  input: PersonalizationPreviewRequest,
  dependencies = personalizationPreviewDependencies(),
): Promise<PersonalizationPreviewResult> {
  const catalog = await observePersonalizationPreviewStage(
    "catalog",
    () => loadPersonalizationPreviewCatalog(page, accessToken, dependencies),
    dependencies.onTiming,
  );
  const { decisions, selectedExperiences } = selectPersonalizationOutcomes(
    catalog,
    input.revision,
    input.selections,
  );
  // Verify native receipts before creating a ready link. Nothing is published or written to CDP.
  await observePersonalizationPreviewStage(
    "render",
    () => dependencies.loadLayout(page, decisions),
    dependencies.onTiming,
  );
  if (!dependencies.origin)
    throw new PersonalizationPreviewError(
      "CONFIGURATION_REQUIRED",
      "Personalization Preview is not configured.",
      503,
    );
  const token = await observePersonalizationPreviewStage(
    "token",
    () =>
      dependencies.createView(actor, {
        page,
        revision: input.revision,
        selections: input.selections,
        decisions,
        selectedExperiences,
      }),
    dependencies.onTiming,
  );
  return {
    status: "ready",
    title: "Your personalization preview is ready",
    description: "View the selected results using the current page content.",
    previewUrl: new URL(
      `/apps/personalization-preview/view/${token}`,
      dependencies.origin,
    ).toString(),
    selectedExperiences,
  };
}

export async function revalidatePersonalizationPreviewSession(
  session: PersonalizationPreviewViewSession,
  page: PersonalizationPreviewPage,
  accessToken: string,
  dependencies = personalizationPreviewDependencies(),
) {
  const catalog = await loadPersonalizationPreviewCatalog(
    page,
    accessToken,
    dependencies,
  );
  return selectPersonalizationOutcomes(
    catalog,
    session.revision,
    session.selections,
  );
}

export function personalizationPreviewErrorResponse(error: unknown) {
  if (
    error instanceof PersonalizationPreviewError ||
    error instanceof PortalError ||
    error instanceof NativeReceiptError
  ) {
    const response = jsonResponse(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
    if (error.status === 429) response.headers.set("Retry-After", "60");
    return response;
  }
  if (error instanceof NativeDiscoveryError)
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: "SitecoreAI could not confirm this page’s preview variants.",
        },
      },
      502,
    );
  console.error(
    "Personalization Preview failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return jsonResponse(
    {
      error: {
        code: "PREVIEW_UNAVAILABLE",
        message: "The preview could not be opened. Please try again.",
      },
    },
    503,
  );
}
