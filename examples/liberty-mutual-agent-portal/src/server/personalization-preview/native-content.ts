import "server-only";
import type { PersonalizeInfo } from "@sitecore-content-sdk/content/personalize";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import { nativePreviewExecutions } from "./native-variants";
import { normalizePreviewId } from "./catalog";
import {
  nativeMetadataReader,
  type NativeMetadataReader,
} from "./native-metadata";
import type { PersonalizationPreviewPage } from "./types";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const plain = normalizePreviewId(value);
  return /^[a-f0-9]{32}$/.test(plain) ? plain : undefined;
};
const label = (value: unknown): string | undefined =>
  typeof value === "string" &&
  value.trim() &&
  value.length <= 300 &&
  !/[\u0000-\u001f]/.test(value)
    ? value.trim()
    : undefined;
function invalid(
  message = "SitecoreAI could not confirm the native content variants for this page.",
): never {
  throw new PersonalizationPreviewError(
    "NATIVE_CONTENT_UNAVAILABLE",
    message,
    502,
  );
}

export interface NativeContentChoice {
  variantId: string;
  dataSourceId?: string;
}
export interface NativeContentGroup {
  componentId: string;
  renderingId: string;
  choices: NativeContentChoice[];
}

/** Read the selected version's authoring layout; condition code is never evaluated. */
export function nativeContentGroups(
  page: PersonalizationPreviewPage,
  info: PersonalizeInfo,
  scope?: string,
  excludedOwners: ReadonlySet<string> = new Set(),
): { groups: NativeContentGroup[]; warnings: string[] } {
  if (normalizePreviewId(info.pageId) !== normalizePreviewId(page.id))
    invalid();
  let layout: unknown = page.nativeFinalLayout;
  if (typeof layout === "string") {
    if (layout.length > 1_048_576) invalid();
    try {
      layout = JSON.parse(layout);
    } catch {
      invalid();
    }
  }
  if (
    !object(layout) ||
    !Array.isArray(layout.devices) ||
    layout.devices.length > 20
  )
    invalid();
  const executions = nativePreviewExecutions(info, page.language, scope);
  const available = new Set(executions.flatMap((entry) => entry.variantIds));
  const groups: NativeContentGroup[] = [];
  const seen = new Set<string>();
  const mapped = new Set<string>();
  let unavailableRows = 0;
  for (const device of layout.devices) {
    if (
      !object(device) ||
      !Array.isArray(device.renderings) ||
      device.renderings.length > 300
    )
      invalid();
    for (const rendering of device.renderings) {
      if (!object(rendering) || !object(rendering.personalization)) continue;
      const componentId = uuid(rendering.instanceId);
      const renderingId = uuid(rendering.id);
      if (componentId && excludedOwners.has(componentId)) continue;
      const ruleSet = rendering.personalization.ruleSet;
      if (
        !componentId ||
        !renderingId ||
        !object(ruleSet) ||
        !Array.isArray(ruleSet.rules) ||
        ruleSet.rules.length > 100
      )
        invalid();
      if (seen.has(componentId))
        invalid(
          "A native component is present more than once in the page layout.",
        );
      seen.add(componentId);
      const choices: NativeContentChoice[] = [];
      for (const rule of ruleSet.rules) {
        if (
          !object(rule) ||
          typeof rule.conditions !== "string" ||
          rule.conditions.length > 65_536
        )
          invalid();
        // This explicit native condition field is an ID contract, not a display label.
        const matches = [
          ...rule.conditions.matchAll(/\bVariantName=(['"])([^'"]+)\1/g),
        ];
        if (matches.length === 0) continue; // Original/default rule.
        if (matches.length !== 1) invalid();
        const variantId = matches[0][2];
        if (!new RegExp(`^${componentId}_[a-f0-9]{32}$`).test(variantId))
          invalid();
        if (!available.has(variantId)) {
          unavailableRows++;
          continue; // Not exposed by this native preview context/version.
        }
        if (mapped.has(variantId)) invalid();
        mapped.add(variantId);
        let dataSourceId: string | undefined;
        if (Array.isArray(rule.actions)) {
          if (rule.actions.length > 20) invalid();
          const dataSources = rule.actions.flatMap((action) => {
            const value = object(action) ? uuid(action.dataSource) : undefined;
            return value ? [value] : [];
          });
          if (new Set(dataSources).size > 1) invalid();
          dataSourceId = dataSources[0];
        }
        choices.push({ variantId, ...(dataSourceId ? { dataSourceId } : {}) });
      }
      if (choices.length) groups.push({ componentId, renderingId, choices });
    }
  }
  if (groups.length > 10 || mapped.size > 40) invalid();
  const relevant = info.variantIds.filter((value) => {
    const owner = /^([a-f0-9]{32})_[a-f0-9]{32}$/i.exec(value)?.[1];
    return owner && !excludedOwners.has(owner);
  });
  const missing = relevant.filter((value) => !mapped.has(value));
  const warnings =
    missing.length || unavailableRows
      ? [
          "Some native variants are not available in this selected page version.",
        ]
      : [];
  if (!groups.length && relevant.length) invalid();
  return { groups, warnings };
}

/** Labels come from actual native content, while IDs remain bound to authoring layout and SDK discovery. */
export async function readNativePersonalizationContentDefinitions(
  page: PersonalizationPreviewPage,
  info: PersonalizeInfo,
  accessToken: string,
  scope?: string,
  reader: NativeMetadataReader = nativeMetadataReader(accessToken),
  excludedOwners: ReadonlySet<string> = new Set(),
): Promise<{ definitions: unknown[]; warnings: string[] }> {
  const { groups, warnings } = nativeContentGroups(
    page,
    info,
    scope,
    excludedOwners,
  );
  if (!groups.length) return { definitions: [], warnings };
  const itemIds = [
    ...new Set(
      groups.flatMap((group) => [
        group.renderingId,
        ...group.choices.flatMap((choice) =>
          choice.dataSourceId ? [choice.dataSourceId] : [],
        ),
      ]),
    ),
  ];
  const items = await reader(itemIds, page.language);
  const definitions = groups.map((group) => {
    const rendering = items.get(group.renderingId);
    const componentName =
      label(rendering?.displayName) || label(rendering?.name);
    if (!componentName) invalid();
    const variants = group.choices.map((choice, index) => {
      const source = choice.dataSourceId
        ? items.get(choice.dataSourceId)
        : undefined;
      const contentName = label(source?.displayName) || label(source?.name);
      if (choice.dataSourceId && !contentName) invalid();
      // A native receipt determines whether a datasource-less variant changes
      // presentation or hides the component; a label never claims an audience match.
      const name = contentName || `${componentName} — Variant ${index + 1}`;
      return {
        name,
        tasks: [
          {
            input: {
              template: JSON.stringify({ variantId: choice.variantId }),
            },
          },
        ],
      };
    });
    const counts = new Map<string, number>();
    for (const variant of variants)
      counts.set(variant.name, (counts.get(variant.name) || 0) + 1);
    variants.forEach((variant, index) => {
      if (counts.get(variant.name)! > 1) variant.name += ` (${index + 1})`;
    });
    return {
      ref: `native_${group.componentId}`,
      name: componentName,
      subtype: "NATIVE_CONTENT",
      transpiledVariants: variants,
    };
  });
  return {
    definitions,
    warnings,
  };
}
