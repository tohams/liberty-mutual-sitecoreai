import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentRendering, Page } from "@sitecore-content-sdk/nextjs";
import type { AudiencePreviewPage } from "../marketplace/audience-preview-pages";
import type { AudiencePreviewDecisions } from "./decisions";
import { composeNativeAudiencePreview } from "./native-layout";

const idA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const idB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const idC = "cccccccccccccccccccccccccccccccc";
const selected: AudiencePreviewPage = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Home",
  siteName: "liberty-mutual-agent-portal",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  language: "en",
  version: 3,
};
const component = (uid: string, dataSource: string): ComponentRendering => ({
  uid,
  componentName: "AgentGuidance",
  dataSource,
  fields: { headline: { value: dataSource } },
});
function receipt(components: ComponentRendering[]): Page {
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
function decisions(ids = [idA, idB]): AudiencePreviewDecisions {
  return {
    pageId: selected.id,
    componentVariantIds: ids.map((id) => `${id}_variant`),
    selectedVariantIds: ids.map((id) => `${id}_variant`),
    selections: ids.map((id) => ({
      componentId: id,
      friendlyId: id,
      variantId: `${id}_variant`,
      control: false,
    })),
  };
}

test("composes complete native selected components while preserving unrelated baseline content and immutable receipts", async () => {
  const baseline = receipt([
    component(idA, "default-a"),
    component(idB, "default-b"),
    component(idC, "untouched"),
  ]);
  const a = receipt([
    component(idA, "native-a"),
    component(idB, "default-b"),
    component(idC, "other-copy-c"),
  ]);
  a.layout.sitecore.route!.placeholders.main[0].params = {
    styles: "native-style",
  };
  const b = receipt([
    component(idA, "default-a"),
    component(idB, "native-b"),
    component(idC, "other-copy-c"),
  ]);
  const originals = structuredClone([baseline, a, b]);
  const requests: string[] = [];
  const composed = await composeNativeAudiencePreview(
    selected,
    decisions(),
    async (variant) => {
      requests.push(variant);
      return variant === "_default"
        ? baseline
        : variant === `${idA}_variant`
          ? a
          : b;
    },
  );
  assert.deepEqual(requests, ["_default", `${idA}_variant`, `${idB}_variant`]);
  const contents = composed.layout.sitecore.route!.placeholders.main;
  assert.deepEqual(contents[0], a.layout.sitecore.route!.placeholders.main[0]);
  assert.deepEqual(contents[1], b.layout.sitecore.route!.placeholders.main[1]);
  assert.deepEqual(
    contents[2],
    baseline.layout.sitecore.route!.placeholders.main[2],
  );
  assert.deepEqual([baseline, a, b], originals);
});

test("native control selections retain a confirmed default component", async () => {
  const baseline = receipt([component(idA, "default")]);
  const selection = decisions([idA]);
  selection.selections[0].control = true;
  selection.selections[0].variantId = `${idA}_default`;
  const result = await composeNativeAudiencePreview(
    selected,
    selection,
    async () => structuredClone(baseline),
  );
  assert.equal(
    result.layout.sitecore.route!.placeholders.main[0].dataSource,
    "default",
  );
});

test("rejects unchanged non-control responses rather than presenting a silent default", async () => {
  const baseline = receipt([component(idA, "default")]);
  await assert.rejects(
    () =>
      composeNativeAudiencePreview(
        selected,
        decisions([idA]),
        async () => baseline,
      ),
    /could not be confirmed/,
  );
});

test("rejects mismatched native page, language, version, site, or preview mode receipts", async () => {
  const baseline = receipt([component(idA, "default")]);
  const changes = [
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
      p.siteName = "another-site";
    },
    (p: Page) => {
      p.mode.isEditing = true;
    },
  ];
  for (const change of changes) {
    const wrong = receipt([component(idA, "native")]);
    change(wrong);
    await assert.rejects(
      () =>
        composeNativeAudiencePreview(
          selected,
          decisions([idA]),
          async (variant) => (variant === "_default" ? baseline : wrong),
        ),
      /could not be confirmed/,
    );
  }
});

test("rejects missing or ambiguous component UIDs and moved placeholders", async () => {
  const baseline = receipt([component(idA, "default")]);
  for (const wrong of [
    receipt([]),
    receipt([component(idA, "one"), component(idA, "two")]),
  ]) {
    await assert.rejects(
      () =>
        composeNativeAudiencePreview(
          selected,
          decisions([idA]),
          async (variant) => (variant === "_default" ? baseline : wrong),
        ),
      /could not be confirmed/,
    );
  }
  const moved = receipt([]);
  moved.layout.sitecore.route!.placeholders.secondary = [
    component(idA, "native"),
  ];
  await assert.rejects(
    () =>
      composeNativeAudiencePreview(
        selected,
        decisions([idA]),
        async (variant) => (variant === "_default" ? baseline : moved),
      ),
    /could not be confirmed/,
  );
});

test("rejects duplicate and nested selections before replacing native payloads", async () => {
  const parent = component(idA, "parent");
  parent.placeholders = { child: [component(idB, "child")] };
  const baseline = receipt([parent]);
  await assert.rejects(
    () =>
      composeNativeAudiencePreview(selected, decisions(), async () => baseline),
    /could not be confirmed/,
  );
  await assert.rejects(
    () =>
      composeNativeAudiencePreview(
        selected,
        decisions([idA, idA]),
        async () => baseline,
      ),
    /could not be confirmed/,
  );
  await assert.rejects(
    () =>
      composeNativeAudiencePreview(
        selected,
        decisions(
          Array.from({ length: 11 }, (_, i) =>
            i.toString(16).padStart(32, "0"),
          ),
        ),
        async () => baseline,
      ),
    /could not be confirmed/,
  );
});
