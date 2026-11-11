import "server-only";
import type { ComponentRendering, Page } from "@sitecore-content-sdk/nextjs";
import type { NativePreviewDecisions } from "./native-variants";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import type { PersonalizationPreviewPage } from "./types";

type Path = Array<string | number>;
type Location = { rendering: ComponentRendering; path: Path };
type Receipt =
  | { kind: "replace"; rendering: ComponentRendering; path: Path }
  | { kind: "remove"; path: Path };
export type PersonalizationPreviewLoader = (
  variantId: string,
) => Promise<Page | null>;
const normalize = (id: string) => id.replace(/[{}-]/g, "").toLowerCase();
const fail = (): never => {
  throw new PersonalizationPreviewError(
    "PREVIEW_RECEIPT_MISMATCH",
    "The selected results could not be confirmed for this page and version. Return to Page Builder and try again.",
    409,
  );
};

function verify(page: Page | null, selected: PersonalizationPreviewPage): Page {
  const route = page?.layout?.sitecore?.route;
  if (
    !page ||
    !route?.itemId ||
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
function locations(page: Page, id: string): Location[] {
  const found: Location[] = [];
  const visit = (
    placeholders: Record<string, ComponentRendering[]>,
    path: Path,
  ) => {
    for (const [name, items] of Object.entries(placeholders))
      for (const [index, rendering] of items.entries()) {
        const current = [...path, name, index];
        if (rendering.uid && normalize(rendering.uid) === id)
          found.push({ rendering, path: current });
        if (rendering.placeholders)
          visit(rendering.placeholders, [...current, "placeholders"]);
      }
  };
  visit(page.layout.sitecore.route!.placeholders, []);
  return found;
}
const samePath = (left: Path, right: Path) =>
  left.length === right.length &&
  left.every((part, index) => part === right[index]);
const overlaps = (left: Path, right: Path) =>
  left.every((part, index) => part === right[index]) ||
  right.every((part, index) => part === left[index]);

function parent(
  page: Page,
  path: Path,
): { target: Record<string | number, unknown>; last: string | number } {
  let target: unknown = page.layout.sitecore.route!.placeholders;
  for (const key of path.slice(0, -1))
    target = (target as Record<string | number, unknown>)[key];
  return {
    target: target as Record<string | number, unknown>,
    last: path[path.length - 1],
  };
}
function replace(page: Page, path: Path, rendering: ComponentRendering) {
  const { target, last } = parent(page, path);
  target[last] = structuredClone(rendering);
}
function remove(page: Page, path: Path) {
  const { target, last } = parent(page, path);
  if (
    !Array.isArray(target) ||
    typeof last !== "number" ||
    !Number.isSafeInteger(last) ||
    last < 0 ||
    last >= target.length
  )
    return fail();
  target.splice(last, 1);
}
/** Descending source paths remove later siblings and descendants before an earlier array entry shifts. */
function descendingPath(left: Path, right: Path): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    if (left[index] === right[index]) continue;
    if (typeof left[index] === "number" && typeof right[index] === "number")
      return Number(right[index]) - Number(left[index]);
    return String(right[index]).localeCompare(String(left[index]));
  }
  return right.length - left.length;
}

/**
 * Combine selected native receipts. A Hide receipt is accepted only when its
 * entire placeholder tree equals its independent native component-control
 * receipt with exactly that target removed. This proof remains independent of
 * any simultaneously selected page variant.
 * Unrelated changes, nested selections, and silent default fallbacks are rejected.
 */
export async function composeNativePersonalizationPreview(
  selected: PersonalizationPreviewPage,
  decisions: NativePreviewDecisions,
  load: PersonalizationPreviewLoader,
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
  const baseline = verify(
    await load(decisions.pageVariantId || "_default"),
    selected,
  );
  const bases = ids.map((id) => {
    const matches = locations(baseline, id);
    if (matches.length !== 1) return fail();
    return matches[0];
  });
  for (let i = 0; i < bases.length; i++)
    for (let j = i + 1; j < bases.length; j++)
      if (overlaps(bases[i].path, bases[j].path)) return fail();
  const receipts: Receipt[] = await Promise.all(
    selections.map(async (selection, index): Promise<Receipt> => {
      const native = verify(await load(selection.variantId), selected);
      const matches = locations(native, ids[index]);
      if (matches.length === 0 && !selection.control) {
        const control = verify(await load(`${ids[index]}_default`), selected);
        const controlMatches = locations(control, ids[index]);
        if (
          controlMatches.length !== 1 ||
          !samePath(controlMatches[0].path, bases[index].path)
        )
          return fail();
        const expected = structuredClone(control);
        remove(expected, controlMatches[0].path);
        if (
          JSON.stringify(expected.layout.sitecore.route!.placeholders) !==
          JSON.stringify(native.layout.sitecore.route!.placeholders)
        )
          return fail();
        return { kind: "remove", path: bases[index].path };
      }
      if (matches.length !== 1 || !samePath(matches[0].path, bases[index].path))
        return fail();
      if (
        !selection.control &&
        JSON.stringify(matches[0].rendering) ===
          JSON.stringify(bases[index].rendering)
      )
        return fail();
      return {
        kind: "replace",
        rendering: matches[0].rendering,
        path: bases[index].path,
      };
    }),
  );
  const composed = structuredClone(baseline);
  for (const receipt of receipts)
    if (receipt.kind === "replace")
      replace(composed, receipt.path, receipt.rendering);
  const removals = receipts
    .filter((receipt) => receipt.kind === "remove")
    .sort((left, right) => descendingPath(left.path, right.path));
  for (const receipt of removals) remove(composed, receipt.path);
  return composed;
}
