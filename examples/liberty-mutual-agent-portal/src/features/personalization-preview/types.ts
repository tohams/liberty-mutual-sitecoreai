export interface PersonalizationPreviewPage {
  id: string;
  name: string;
  siteName: string;
  language: string;
  version?: number;
  path?: string;
}

export interface PersonalizationPreviewOption {
  id: string;
  label: string;
  control: boolean;
}

export interface PersonalizationPreviewFlow {
  id: string;
  name: string;
  componentName?: string;
  options: PersonalizationPreviewOption[];
  defaultOptionId: string;
}

export interface PersonalizationPreviewCatalog {
  page: PersonalizationPreviewPage;
  revision: string;
  flows: PersonalizationPreviewFlow[];
  warnings?: string[];
}

export interface PersonalizationPreviewSelection {
  flowId: string;
  optionId: string;
}

export interface PersonalizationPreviewResult {
  status: "ready";
  previewUrl: string;
  title: string;
  description?: string;
  selectedExperiences: {
    flowId: string;
    flowName: string;
    optionLabel: string;
    componentName?: string;
  }[];
}

export function personalizationPreviewPageKey(
  page: PersonalizationPreviewPage | null,
): string {
  return page
    ? JSON.stringify([
        page.id.replace(/[{}-]/g, "").toLowerCase(),
        page.language,
        page.version ?? null,
      ])
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value: unknown, maximum = 500): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maximum
  );
}

function isPage(value: unknown): value is PersonalizationPreviewPage {
  return (
    isRecord(value) &&
    isText(value.id, 100) &&
    isText(value.name) &&
    isText(value.siteName, 200) &&
    isText(value.language, 35) &&
    (value.version === undefined ||
      (Number.isSafeInteger(value.version) && Number(value.version) > 0))
  );
}

/** The server owns labels and IDs; the panel only accepts a complete catalog. */
export function isPersonalizationPreviewCatalog(
  value: unknown,
): value is PersonalizationPreviewCatalog {
  if (
    !isRecord(value) ||
    !isPage(value.page) ||
    !isText(value.revision, 200) ||
    !Array.isArray(value.flows) ||
    value.flows.length > 100 ||
    (value.warnings !== undefined &&
      (!Array.isArray(value.warnings) ||
        value.warnings.length > 100 ||
        !value.warnings.every((warning) => isText(warning, 1_000))))
  )
    return false;
  const flowIds = new Set<string>();
  return value.flows.every((flow: unknown) => {
    if (
      !isRecord(flow) ||
      !isText(flow.id, 300) ||
      flowIds.has(flow.id) ||
      !isText(flow.name) ||
      (flow.componentName !== undefined && !isText(flow.componentName)) ||
      !isText(flow.defaultOptionId, 300) ||
      !Array.isArray(flow.options) ||
      flow.options.length < 1 ||
      flow.options.length > 100
    )
      return false;
    flowIds.add(flow.id);
    const optionIds = new Set<string>();
    let defaultFound = false;
    let controls = 0;
    const valid = flow.options.every((option: unknown) => {
      if (
        !isRecord(option) ||
        !isText(option.id, 300) ||
        optionIds.has(option.id) ||
        !isText(option.label) ||
        typeof option.control !== "boolean"
      )
        return false;
      optionIds.add(option.id);
      if (option.control) controls++;
      if (option.id === flow.defaultOptionId && option.control)
        defaultFound = true;
      return true;
    });
    return valid && defaultFound && controls === 1;
  });
}

/** A preview result may navigate only to this app's actor-bound view route. */
export function isPersonalizationPreviewResult(
  value: unknown,
  origin: string,
): value is PersonalizationPreviewResult {
  if (
    !isRecord(value) ||
    value.status !== "ready" ||
    !isText(value.previewUrl, 2_000) ||
    !isText(value.title) ||
    (value.description !== undefined && !isText(value.description, 1_000)) ||
    !Array.isArray(value.selectedExperiences) ||
    value.selectedExperiences.length > 100 ||
    !value.selectedExperiences.every(
      (selection: unknown) =>
        isRecord(selection) &&
        isText(selection.flowId, 300) &&
        isText(selection.flowName) &&
        isText(selection.optionLabel) &&
        (selection.componentName === undefined ||
          isText(selection.componentName)),
    )
  )
    return false;
  try {
    const url = new URL(value.previewUrl, origin);
    return (
      url.origin === new URL(origin).origin &&
      ["http:", "https:"].includes(url.protocol) &&
      /^\/apps\/personalization-preview\/view\/[A-Za-z0-9_-]{43}$/.test(
        url.pathname,
      ) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function defaultPersonalizationSelections(
  catalog: PersonalizationPreviewCatalog,
): PersonalizationPreviewSelection[] {
  return catalog.flows.map((flow) => ({
    flowId: flow.id,
    optionId: flow.defaultOptionId,
  }));
}
