import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentRendering, Page } from "@sitecore-content-sdk/nextjs";
import type { NativePreviewDecisions } from "./native-variants";
import type { PersonalizationPreviewPage } from "./types";
import { composeNativePersonalizationPreview } from "./native-layout";

const a = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const b = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const c = "cccccccccccccccccccccccccccccccc";
const d = "dddddddddddddddddddddddddddddddd";
const selected: PersonalizationPreviewPage = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Home",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 3,
};
const component = (uid: string, dataSource: string): ComponentRendering => ({
  uid,
  componentName: "AgencyPriorities",
  dataSource,
  fields: { headline: { value: dataSource } },
});
function page(components: ComponentRendering[]): Page {
  return {
    locale: "en",
    siteName: selected.siteName,
    mode: {
      name: "preview",
      isNormal: false,
      isPreview: true,
      isEditing: false,
      isDesignLibrary: false,
      designLibrary: { isVariantGeneration: false },
    },
    layout: {
      sitecore: {
        context: { language: "en", pageEditing: false },
        route: {
          name: "Home",
          itemId: selected.id,
          itemLanguage: "en",
          itemVersion: 3,
          placeholders: { main: components },
        },
      },
    },
  } as Page;
}
function decisions(
  ids: string[],
  controls: string[] = [],
): NativePreviewDecisions {
  return {
    pageId: selected.id,
    selectedVariantIds: ids.map(
      (id) => `${id}_${controls.includes(id) ? "default" : "variant"}`,
    ),
    componentVariantIds: ids.map(
      (id) => `${id}_${controls.includes(id) ? "default" : "variant"}`,
    ),
    selections: ids.map((id) => ({
      componentId: id,
      friendlyId: id,
      variantId: `${id}_${controls.includes(id) ? "default" : "variant"}`,
      control: controls.includes(id),
    })),
  };
}

test("accepts a Hide receipt only when the target alone is absent, preserving immutable native receipts", async () => {
  const baseline = page([component(a, "default-a"), component(b, "untouched")]);
  const hidden = page([component(b, "untouched")]);
  const snapshots = structuredClone([baseline, hidden]);
  const result = await composeNativePersonalizationPreview(
    selected,
    decisions([a]),
    async (variant) => (variant.endsWith("_default") ? baseline : hidden),
  );
  assert.deepEqual(result.layout.sitecore.route!.placeholders.main, [
    component(b, "untouched"),
  ]);
  assert.deepEqual([baseline, hidden], snapshots);
});

test("rejects a target-absent receipt that also mutates, moves, or removes unrelated content", async () => {
  const baseline = page([
    component(a, "default-a"),
    component(b, "untouched"),
    component(c, "also-untouched"),
  ]);
  const changed = page([
    component(b, "changed"),
    component(c, "also-untouched"),
  ]);
  const removedExtra = page([component(b, "untouched")]);
  const moved = page([
    component(c, "also-untouched"),
    component(b, "untouched"),
  ]);
  for (const receipt of [changed, removedExtra, moved])
    await assert.rejects(
      () =>
        composeNativePersonalizationPreview(
          selected,
          decisions([a]),
          async (variant) =>
            variant.endsWith("_default") ? baseline : receipt,
        ),
      { code: "PREVIEW_RECEIPT_MISMATCH" },
    );
});

test("composes replacements before multiple descending-index hides so every original UID remains correctly positioned", async () => {
  const baseline = page([
    component(a, "default-a"),
    component(b, "default-b"),
    component(c, "default-c"),
    component(d, "untouched"),
  ]);
  const hideA = page([
    component(b, "default-b"),
    component(c, "default-c"),
    component(d, "untouched"),
  ]);
  const replaceB = page([
    component(a, "default-a"),
    component(b, "selected-b"),
    component(c, "default-c"),
    component(d, "other-receipt-value"),
  ]);
  const hideC = page([
    component(a, "default-a"),
    component(b, "default-b"),
    component(d, "untouched"),
  ]);
  const receipts = new Map([
    ["_default", baseline],
    [`${a}_variant`, hideA],
    [`${b}_variant`, replaceB],
    [`${c}_variant`, hideC],
    [`${a}_default`, baseline],
    [`${c}_default`, baseline],
  ]);
  const snapshots = structuredClone([...receipts.values()]);
  const result = await composeNativePersonalizationPreview(
    selected,
    decisions([a, b, c]),
    async (variant) => receipts.get(variant)!,
  );
  assert.deepEqual(result.layout.sitecore.route!.placeholders.main, [
    component(b, "selected-b"),
    component(d, "untouched"),
  ]);
  assert.deepEqual([...receipts.values()], snapshots);
});

test("applies a nested hide before an earlier top-level removal shifts its parent", async () => {
  const wrapper = component(c, "wrapper");
  wrapper.placeholders = { child: [component(b, "child")] };
  const baseline = page([
    component(a, "first"),
    component(d, "second"),
    wrapper,
  ]);
  const hideA = page([component(d, "second"), structuredClone(wrapper)]);
  const emptyWrapper = structuredClone(wrapper);
  emptyWrapper.placeholders = { child: [] };
  const hideB = page([
    component(a, "first"),
    component(d, "second"),
    emptyWrapper,
  ]);
  const result = await composeNativePersonalizationPreview(
    selected,
    decisions([a, b]),
    async (variant) =>
      variant.endsWith("_default")
        ? baseline
        : variant === `${a}_variant`
          ? hideA
          : hideB,
  );
  assert.deepEqual(result.layout.sitecore.route!.placeholders.main, [
    component(d, "second"),
    emptyWrapper,
  ]);
});

test("a component Hide is proven against its native control while preserving a simultaneous page variant's other content", async () => {
  const control = page([
    component(a, "default-a"),
    component(b, "default-b"),
    component(c, "unchanged"),
  ]);
  const selectedPageVariant = page([
    component(a, "default-a"),
    component(b, "page-variant-b"),
    component(c, "unchanged"),
  ]);
  const hidden = page([component(b, "default-b"), component(c, "unchanged")]);
  const selection = decisions([a]);
  selection.pageVariantId = "page-variant";
  const calls: string[] = [];
  const result = await composeNativePersonalizationPreview(
    selected,
    selection,
    async (variant) => {
      calls.push(variant);
      if (variant === "page-variant") return selectedPageVariant;
      if (variant === `${a}_default`) return control;
      if (variant === `${a}_variant`) return hidden;
      assert.fail("Unexpected native receipt request");
    },
  );
  assert.deepEqual(calls, ["page-variant", `${a}_variant`, `${a}_default`]);
  assert.deepEqual(result.layout.sitecore.route!.placeholders.main, [
    component(b, "page-variant-b"),
    component(c, "unchanged"),
  ]);
  assert.deepEqual(control.layout.sitecore.route!.placeholders.main, [
    component(a, "default-a"),
    component(b, "default-b"),
    component(c, "unchanged"),
  ]);
});

test("a Hide control receipt must contain the same unique target at the selected baseline's location", async () => {
  const baseline = page([component(a, "default-a"), component(b, "default-b")]);
  const hidden = page([component(b, "default-b")]);
  for (const control of [
    page([component(b, "default-b"), component(a, "default-a")]),
    page([component(a, "one"), component(a, "two"), component(b, "default-b")]),
  ]) {
    await assert.rejects(
      () =>
        composeNativePersonalizationPreview(
          selected,
          decisions([a]),
          async (variant) =>
            variant === "_default"
              ? baseline
              : variant === `${a}_default`
                ? control
                : hidden,
        ),
      { code: "PREVIEW_RECEIPT_MISMATCH" },
    );
  }
});

test("rejects hiding through a default selection or accepting an unchanged non-control receipt", async () => {
  const baseline = page([component(a, "default")]);
  await assert.rejects(
    () =>
      composeNativePersonalizationPreview(
        selected,
        decisions([a], [a]),
        async (variant) => (variant === "_default" ? baseline : page([])),
      ),
    { code: "PREVIEW_RECEIPT_MISMATCH" },
  );
  await assert.rejects(
    () =>
      composeNativePersonalizationPreview(
        selected,
        decisions([a]),
        async () => baseline,
      ),
    { code: "PREVIEW_RECEIPT_MISMATCH" },
  );
});

test("rejects wrong page, version, language, site, or preview mode even when target absence matches", async () => {
  const baseline = page([component(a, "default")]);
  const mutations = [
    (p: Page) => {
      p.layout.sitecore.route!.itemId = "22222222-2222-4222-8222-222222222222";
    },
    (p: Page) => {
      p.layout.sitecore.route!.itemVersion = 4;
    },
    (p: Page) => {
      p.layout.sitecore.route!.itemLanguage = "fr";
    },
    (p: Page) => {
      p.siteName = "other-site";
    },
    (p: Page) => {
      p.mode.isEditing = true;
    },
  ];
  for (const mutate of mutations) {
    const wrong = page([]);
    mutate(wrong);
    await assert.rejects(
      () =>
        composeNativePersonalizationPreview(
          selected,
          decisions([a]),
          async (variant) => (variant === "_default" ? baseline : wrong),
        ),
      { code: "PREVIEW_RECEIPT_MISMATCH" },
    );
  }
});

test("rejects duplicated or overlapping component selections and moved replacement receipts", async () => {
  const wrapper = component(a, "parent");
  wrapper.placeholders = { child: [component(b, "nested")] };
  const nested = page([wrapper]);
  await assert.rejects(
    () =>
      composeNativePersonalizationPreview(
        selected,
        decisions([a, b]),
        async () => nested,
      ),
    { code: "PREVIEW_RECEIPT_MISMATCH" },
  );
  await assert.rejects(
    () =>
      composeNativePersonalizationPreview(
        selected,
        decisions([a, a]),
        async () => nested,
      ),
    { code: "PREVIEW_RECEIPT_MISMATCH" },
  );
  const baseline = page([component(a, "default"), component(b, "other")]);
  const moved = page([component(b, "other"), component(a, "selected")]);
  await assert.rejects(
    () =>
      composeNativePersonalizationPreview(
        selected,
        decisions([a]),
        async (variant) => (variant === "_default" ? baseline : moved),
      ),
    { code: "PREVIEW_RECEIPT_MISMATCH" },
  );
});
