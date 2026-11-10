import "server-only";
import type { Page, ComponentRendering } from "@sitecore-content-sdk/nextjs";
import type { AudiencePreviewPage } from "@/server/marketplace/audience-preview-pages";
import { AudiencePreviewError } from "@/server/marketplace/audience-preview-config";
import type { AudiencePreviewDecisions } from "./decisions";

type ComponentLocation = {
  rendering: ComponentRendering;
  path: Array<string | number>;
};
export type NativePreviewLoader = (variantId: string) => Promise<Page | null>;

const normalize = (id: string) => id.replace(/[{}-]/g, "").toLowerCase();
const fail = (): never => {
  throw new AudiencePreviewError(
    "PREVIEW_RECEIPT_MISMATCH",
    "The selected experiences could not be confirmed for this page and version. Return to Page Builder and try again.",
    409,
  );
};

/** Verify every native response against the already-authorized page and version. */
function verifyReceipt(page: Page | null, selected: AudiencePreviewPage): Page {
  const route = page?.layout.sitecore.route;
  if (
    !page ||
    !route ||
    !route.itemId ||
    normalize(route.itemId) !== normalize(selected.id) ||
    route.itemLanguage !== selected.language ||
    route.itemVersion !== selected.version ||
    page.locale !== selected.language ||
    page.siteName !== selected.siteName ||
    page.mode.name !== "preview" ||
    !page.mode.isPreview ||
    page.mode.isEditing ||
    page.mode.isDesignLibrary
  )
    return fail();
  return page;
}

function locations(page: Page, id: string): ComponentLocation[] {
  const found: ComponentLocation[] = [];
  const visit = (
    placeholders: Record<string, ComponentRendering[]>,
    path: Array<string | number>,
  ) => {
    for (const [name, items] of Object.entries(placeholders)) {
      for (const [index, rendering] of items.entries()) {
        const current = [...path, name, index];
        if (rendering.uid && normalize(rendering.uid) === id)
          found.push({ rendering, path: current });
        if (rendering.placeholders)
          visit(rendering.placeholders, [...current, "placeholders"]);
      }
    }
  };
  visit(page.layout.sitecore.route!.placeholders, []);
  return found;
}

function samePath(a: Array<string | number>, b: Array<string | number>) {
  return a.length === b.length && a.every((part, index) => part === b[index]);
}

function overlaps(a: Array<string | number>, b: Array<string | number>) {
  return (
    a.every((part, index) => part === b[index]) ||
    b.every((part, index) => part === a[index])
  );
}

function replace(
  page: Page,
  path: Array<string | number>,
  rendering: ComponentRendering,
) {
  // The path is obtained exclusively from the verified native layout traversal.
  let target: unknown = page.layout.sitecore.route!.placeholders;
  for (const key of path.slice(0, -1))
    target = (target as Record<string | number, unknown>)[key];
  (target as Record<string | number, unknown>)[path[path.length - 1]] =
    structuredClone(rendering);
}

/**
 * The native editing service accepts one sc_variant per request. Compose only
 * complete native component receipts selected by native decisioning; do not
 * calculate rules, fabricate fields, or reinterpret audience attributes here.
 */
export async function composeNativeAudiencePreview(
  selected: AudiencePreviewPage,
  decisions: AudiencePreviewDecisions,
  load: NativePreviewLoader,
): Promise<Page> {
  if (normalize(decisions.pageId) !== normalize(selected.id)) return fail();
  const selections = decisions.selections.filter(
    (selection) => selection.componentId,
  );
  if (selections.length > 10) return fail();
  const ids = selections.map((selection) => normalize(selection.componentId!));
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !/^[a-f0-9]{32}$/.test(id))
  )
    return fail();
  const baseline = verifyReceipt(
    await load(decisions.pageVariantId || "_default"),
    selected,
  );
  const baseLocations = ids.map((id) => {
    const candidates = locations(baseline, id);
    if (candidates.length !== 1) return fail();
    return candidates[0];
  });
  for (let i = 0; i < baseLocations.length; i++) {
    for (let j = i + 1; j < baseLocations.length; j++) {
      if (overlaps(baseLocations[i].path, baseLocations[j].path)) return fail();
    }
  }
  const receipts = await Promise.all(
    selections.map(async (selection, index) => {
      const native = verifyReceipt(await load(selection.variantId), selected);
      const matches = locations(native, ids[index]);
      if (
        matches.length !== 1 ||
        !samePath(matches[0].path, baseLocations[index].path)
      )
        return fail();
      // A non-control response that simply repeats the baseline is not evidence
      // that the editing service recognized the selected experience.
      if (
        !selection.control &&
        JSON.stringify(matches[0].rendering) ===
          JSON.stringify(baseLocations[index].rendering)
      )
        return fail();
      return matches[0].rendering;
    }),
  );
  const composed = structuredClone(baseline);
  receipts.forEach((rendering, index) =>
    replace(composed, baseLocations[index].path, rendering),
  );
  return composed;
}

export function nativePreviewComponentNames(page: Page): Map<string, string> {
  const names = new Map<string, string>();
  const visit = (placeholders: Record<string, ComponentRendering[]>) => {
    for (const rendering of Object.values(placeholders).flat()) {
      if (rendering.uid)
        names.set(
          normalize(rendering.uid),
          rendering.componentName.replace(/([a-z])([A-Z])/g, "$1 $2"),
        );
      if (rendering.placeholders) visit(rendering.placeholders);
    }
  };
  visit(page.layout.sitecore.route!.placeholders);
  return names;
}
