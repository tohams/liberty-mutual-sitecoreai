import "server-only";
import { createHash } from "node:crypto";
import type { PersonalizeInfo } from "@sitecore-content-sdk/content/personalize";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import {
  nativePreviewExecutions,
  type NativePreviewDecisions,
} from "./native-variants";
import type {
  PersonalizationPreviewContext,
  PersonalizationPreviewPage,
  PersonalizationPreviewSelection,
  SelectedPersonalizationExperience,
} from "./types";
import { personalizationPreviewComponentOrder } from "./component-order";

type RecordValue = Record<string, unknown>;
type NativeChoice = {
  variantId: string;
  componentId?: string;
  friendlyId: string;
  control: boolean;
};
export interface PersonalizationCatalog {
  context: PersonalizationPreviewContext;
  choices: Map<string, Map<string, NativeChoice>>;
}

export const normalizePreviewId = (value: string) =>
  value.replace(/[{}-]/g, "").toLowerCase();
const object = (value: unknown): value is RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const boundedLabel = (value: unknown): string | undefined =>
  typeof value === "string" &&
  value.trim() &&
  value.length <= 300 &&
  !/[\u0000-\u001f]/.test(value)
    ? value.trim()
    : undefined;
const id = (value: unknown): string | undefined =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value)
    ? value
    : undefined;

/** Only parse bounded JSON definitions. No template or condition code is executed. */
function definitionObject(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.length > 262_144 || !/^[\s]*[\[{]/.test(value)) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function walk(
  value: unknown,
  visit: (value: RecordValue) => void,
  depth = 0,
  budget = { remaining: 10_000 },
): void {
  if (depth > 15 || --budget.remaining < 0)
    throw new PersonalizationPreviewError(
      "INVALID_FLOW_CONFIGURATION",
      "This page’s personalization configuration could not be read.",
      502,
    );
  const decoded = definitionObject(value);
  if (Array.isArray(decoded)) {
    if (decoded.length > 500)
      throw new PersonalizationPreviewError(
        "INVALID_FLOW_CONFIGURATION",
        "This page’s personalization configuration is too large to preview.",
        502,
      );
    for (const child of decoded) walk(child, visit, depth + 1, budget);
  } else if (object(decoded)) {
    visit(decoded);
    for (const child of Object.values(decoded)) {
      if (
        object(child) ||
        Array.isArray(child) ||
        (typeof child === "string" && /^[\s]*[\[{]/.test(child))
      )
        walk(child, visit, depth + 1, budget);
    }
  }
}

/** Runtime variant IDs are validated against native SDK discovery, never inferred from names or management refs. */
function nativeIds(value: unknown, available: Set<string>): Set<string> {
  const found = new Set<string>();
  if (!object(value) || !Array.isArray(value.tasks)) return found;
  if (value.tasks.length > 100)
    throw new PersonalizationPreviewError(
      "INVALID_FLOW_CONFIGURATION",
      "This page’s personalization configuration is too large to preview.",
      502,
    );
  // The Agent API documents this path as the runtime response template. Other
  // fields contain author-facing labels, management refs, or targeting inputs.
  for (const task of value.tasks) {
    if (
      !object(task) ||
      !object(task.input) ||
      !Object.hasOwn(task.input, "template")
    )
      continue;
    walk(task.input.template, (entry) => {
      for (const key of [
        "variantId",
        "variantID",
        "variant_id",
        "sc_variant",
      ]) {
        const candidate = id(entry[key]);
        if (candidate && available.has(candidate)) found.add(candidate);
      }
    });
  }
  return found;
}

function variantGroups(flow: RecordValue): RecordValue[] {
  for (const key of ["transpiledVariants", "variants"]) {
    if (Array.isArray(flow[key]) && flow[key].length) {
      if (flow[key].length > 100 || flow[key].some((entry) => !object(entry)))
        throw new PersonalizationPreviewError(
          "INVALID_FLOW_CONFIGURATION",
          "SitecoreAI returned an invalid personalization row.",
          502,
        );
      return flow[key] as RecordValue[];
    }
  }
  return [];
}

function optionLabel(entry: RecordValue, fallback: string): string {
  for (const key of [
    "name",
    "label",
    "variant_name",
    "variantName",
    "description",
  ]) {
    const label = boundedLabel(entry[key]);
    if (label && !/^[a-f0-9]{32}_[a-f0-9]{32}$/i.test(label)) return label;
  }
  return fallback;
}

export function buildPersonalizationCatalog(
  page: PersonalizationPreviewPage,
  rawFlows: unknown,
  info: PersonalizeInfo,
  scope?: string,
): PersonalizationCatalog {
  if (
    !Array.isArray(rawFlows) ||
    rawFlows.length > 50 ||
    normalizePreviewId(info.pageId) !== normalizePreviewId(page.id)
  )
    throw new PersonalizationPreviewError(
      "INVALID_FLOW_CONFIGURATION",
      "SitecoreAI could not confirm personalization for this page.",
      502,
    );
  const executions = nativePreviewExecutions(info, page.language, scope);
  if (rawFlows.length === 0 && info.variantIds.length > 0)
    throw new PersonalizationPreviewError(
      "PERSONALIZATION_DISCOVERY_INCOMPLETE",
      "SitecoreAI could not load this page’s configured personalizations. Refresh the choices and try again.",
      502,
    );
  const available = new Set([
    "_default",
    ...executions.flatMap((execution) => execution.variantIds),
  ]);
  const choices = new Map<string, Map<string, NativeChoice>>();
  const flows: PersonalizationPreviewContext["flows"] = [];
  const flowOwners = new Map<string, string | undefined>();
  const owners = new Set<string>();
  const warnings: string[] = [];
  for (const raw of rawFlows) {
    if (!object(raw))
      throw new PersonalizationPreviewError(
        "INVALID_FLOW_CONFIGURATION",
        "SitecoreAI returned an invalid personalization.",
        502,
      );
    if (raw.archived === true || raw.subtype === "EXPERIMENT") continue;
    const flowId = id(raw.ref) || id(raw.id);
    const flowName = boundedLabel(raw.name);
    if (!flowId || !flowName)
      throw new PersonalizationPreviewError(
        "INVALID_FLOW_CONFIGURATION",
        "SitecoreAI returned an incomplete personalization.",
        502,
      );
    if (choices.has(flowId))
      throw new PersonalizationPreviewError(
        "INVALID_FLOW_CONFIGURATION",
        "SitecoreAI returned duplicate personalizations.",
        502,
      );
    const groups = variantGroups(raw);
    const mapped: Array<{ variantId: string; label: string }> = [];
    for (const [index, group] of groups.entries()) {
      const ids = [...nativeIds(group, available)];
      if (ids.length > 1)
        throw new PersonalizationPreviewError(
          "AMBIGUOUS_VARIANT_MAPPING",
          "A personalization choice could not be mapped to one native preview variant.",
          409,
        );
      if (
        ids.length === 1 &&
        !ids[0].endsWith("_default") &&
        ids[0] !== "_default"
      )
        mapped.push({
          variantId: ids[0],
          label: optionLabel(group, `Variant ${index + 1}`),
        });
      else if (
        ids.length === 0 &&
        group.control !== true &&
        group.isControl !== true
      )
        warnings.push(
          `“${flowName}” → “${optionLabel(group, `Variant ${index + 1}`)}” is unavailable in this page version.`,
        );
    }
    if (!mapped.length) {
      warnings.push(
        `“${flowName}” has no previewable variants for this page version.`,
      );
      continue;
    }
    if (new Set(mapped.map((entry) => entry.variantId)).size !== mapped.length)
      throw new PersonalizationPreviewError(
        "AMBIGUOUS_VARIANT_MAPPING",
        "SitecoreAI returned duplicate preview choices.",
        409,
      );
    const matchingExecutions = executions.filter((execution) =>
      mapped.every((entry) => execution.variantIds.includes(entry.variantId)),
    );
    if (matchingExecutions.length !== 1)
      throw new PersonalizationPreviewError(
        "AMBIGUOUS_VARIANT_MAPPING",
        "A personalization choice could not be mapped to this page’s component.",
        409,
      );
    const execution = matchingExecutions[0];
    const owner = execution.componentId || "page";
    if (owners.has(owner))
      throw new PersonalizationPreviewError(
        "AMBIGUOUS_VARIANT_MAPPING",
        "More than one personalization targets the same preview component.",
        409,
      );
    owners.add(owner);
    const defaultId = execution.componentId
      ? `${execution.componentId}_default`
      : "_default";
    const flowChoices = new Map<string, NativeChoice>();
    const options = [
      { id: defaultId, label: "Default", control: true },
      ...mapped.map((entry) => ({
        id: entry.variantId,
        label: entry.label,
        control: false,
      })),
    ];
    for (const option of options)
      flowChoices.set(option.id, {
        variantId: option.id,
        componentId: execution.componentId,
        friendlyId: execution.friendlyId,
        control: option.control,
      });
    choices.set(flowId, flowChoices);
    flowOwners.set(flowId, execution.componentId);
    flows.push({
      id: flowId,
      name: flowName,
      options,
      defaultOptionId: defaultId,
    });
  }
  if (flows.length > 10)
    throw new PersonalizationPreviewError(
      "TOO_MANY_PERSONALIZATIONS",
      "This page has more personalizations than can be combined in one preview.",
      409,
    );
  const componentOrder = personalizationPreviewComponentOrder(page);
  const positions = new Map(
    componentOrder.map((componentId, index) => [componentId, index]),
  );
  const discoveryPositions = new Map(
    executions.map((execution, index) => [execution.componentId, index]),
  );
  const position = (flowId: string) => {
    const owner = flowOwners.get(flowId);
    // A whole-page choice establishes the baseline before component choices.
    if (!owner) return -1;
    return (
      positions.get(normalizePreviewId(owner)) ??
      componentOrder.length +
        (discoveryPositions.get(owner) ?? executions.length)
    );
  };
  flows.sort((left, right) => position(left.id) - position(right.id));
  const revision = createHash("sha256")
    .update(
      JSON.stringify({
        page,
        rawFlows,
        variants: info.variantIds,
        scope,
        componentOrder,
      }),
    )
    .digest("hex");
  return {
    context: {
      page,
      revision,
      flows,
      ...(warnings.length ? { warnings } : {}),
    },
    choices,
  };
}

export function selectPersonalizationOutcomes(
  catalog: PersonalizationCatalog,
  revision: string,
  selections: PersonalizationPreviewSelection[],
): {
  decisions: NativePreviewDecisions;
  selectedExperiences: SelectedPersonalizationExperience[];
} {
  if (revision !== catalog.context.revision)
    throw new PersonalizationPreviewError(
      "CONFIGURATION_CHANGED",
      "Personalization has changed. Refresh the choices and select your preview again.",
      409,
    );
  if (
    selections.length !== catalog.context.flows.length ||
    new Set(selections.map((selection) => selection.flowId)).size !==
      selections.length
  )
    throw new PersonalizationPreviewError(
      "INVALID_SELECTION",
      "Choose one result for each personalization.",
      400,
    );
  const decisions: NativePreviewDecisions = {
    pageId: catalog.context.page.id,
    selectedVariantIds: [],
    componentVariantIds: [],
    selections: [],
  };
  const selectedExperiences: SelectedPersonalizationExperience[] = [];
  for (const flow of catalog.context.flows) {
    const selected = selections.find(
      (selection) => selection.flowId === flow.id,
    );
    const choice =
      selected && catalog.choices.get(flow.id)?.get(selected.optionId);
    const option =
      selected && flow.options.find((entry) => entry.id === selected.optionId);
    if (!choice || !option)
      throw new PersonalizationPreviewError(
        "INVALID_SELECTION",
        "A selected result is no longer available. Refresh the choices and try again.",
        400,
      );
    decisions.selections.push(choice);
    decisions.selectedVariantIds.push(choice.variantId);
    if (choice.componentId)
      decisions.componentVariantIds.push(choice.variantId);
    else decisions.pageVariantId = choice.variantId;
    selectedExperiences.push({
      flowId: flow.id,
      flowName: flow.name,
      optionLabel: option.label,
      ...(flow.componentName ? { componentName: flow.componentName } : {}),
    });
  }
  return { decisions, selectedExperiences };
}
