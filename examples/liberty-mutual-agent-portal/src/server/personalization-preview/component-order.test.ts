import assert from "node:assert/strict";
import test from "node:test";
import { personalizationPreviewComponentOrder } from "./component-order";
import type { PersonalizationPreviewPage } from "./types";

const first = "11111111111111111111111111111111";
const second = "22222222222222222222222222222222";
const third = "33333333333333333333333333333333";
const fourth = "44444444444444444444444444444444";
const fifth = "55555555555555555555555555555555";
function rendering(
  instanceId: string,
  placeholderKey: string,
  dynamicId?: string,
) {
  return {
    instanceId,
    placeholderKey,
    ...(dynamicId ? { parameters: { DynamicPlaceholderId: dynamicId } } : {}),
  };
}
function selected(
  path: string,
  renderings: unknown[],
): PersonalizationPreviewPage {
  return Object.defineProperty(
    {
      id: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
      name: "Authored page",
      path,
      contentPath:
        "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
      siteName: "liberty-mutual-agent-portal",
      language: "en",
      version: 1,
    },
    "nativeFinalLayout",
    { value: JSON.stringify({ devices: [{ renderings }] }) },
  );
}

test("Home uses actual slot order even when the flat native list was created in reverse order", () => {
  const page = selected("/", [
    rendering(first, "headless-agent-guidance"),
    rendering(second, "headless-agency-priorities"),
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(page), [second, first]);
});

test("Products and Support use their native screen content before the trailing editorial slot", () => {
  for (const [path, primary] of [
    ["/products", "headless-products-spotlight"],
    ["/support", "headless-support-form"],
  ]) {
    const page = selected(path, [
      rendering(first, "headless-agent-guidance"),
      rendering(second, primary),
    ]);
    assert.deepEqual(
      personalizationPreviewComponentOrder(page),
      [second, first],
      path,
    );
  }
});

test("a changed native sibling order is read again for each page and refresh", () => {
  const before = selected("/resources", [
    rendering(first, "headless-resource-search"),
    rendering(second, "headless-resource-search"),
  ]);
  const after = selected("/resources", [
    rendering(second, "headless-resource-search"),
    rendering(first, "headless-resource-search"),
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(before), [
    first,
    second,
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(after), [
    second,
    first,
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(before), [
    first,
    second,
  ]);
});

test("nested placeholders follow parent occurrence and the campaign's shared hero/main/sidebar contract", () => {
  const page = selected("/growth/new-page", [
    rendering(fifth, "/headless-campaign-page/headless-campaign-sidebar-1"),
    rendering(fourth, "/headless-campaign-page/headless-campaign-main-1"),
    rendering(second, "headless-campaign-page", "1"),
    rendering(first, "/headless-campaign-page/headless-campaign-hero-1", "2"),
    rendering(
      third,
      "/headless-campaign-page/headless-campaign-hero-1/nested-content-2",
    ),
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(page), [
    second,
    first,
    third,
    fourth,
    fifth,
  ]);
});

test("nested components stay with the correct dynamic parent instead of following global insertion order", () => {
  const page = selected("/unrecognized-layout", [
    rendering(first, "custom-root", "1"),
    rendering(second, "custom-root", "2"),
    rendering(fourth, "/custom-root/custom-content-2"),
    rendering(third, "/custom-root/custom-content-1"),
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(page), [
    first,
    third,
    second,
    fourth,
  ]);
});

test("unrecognized pages and orphaned placeholders retain deterministic native occurrence order", () => {
  const page = selected("/unrecognized-layout", [
    rendering(first, "second-created-root"),
    rendering(second, "first-named-root"),
    rendering(third, "/unresolved-parent/deep-content-9"),
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(page), [
    first,
    second,
    third,
  ]);
});

test("an unfamiliar layout on a known page retains native order instead of moving only its recognized slot", () => {
  const page = selected("/", [
    rendering(first, "new-layout-root"),
    rendering(second, "headless-agent-guidance"),
  ]);
  assert.deepEqual(personalizationPreviewComponentOrder(page), [first, second]);
});

test("a shared-only layout is used when the page has no final-layout overrides", () => {
  const page = selected("/", []);
  const shared = {
    ...page,
    nativeFinalLayout: "",
    nativeSharedLayout: JSON.stringify({
      devices: [
        {
          renderings: [
            rendering(first, "headless-agent-guidance"),
            rendering(second, "headless-agency-priorities"),
          ],
        },
      ],
    }),
  };
  assert.deepEqual(personalizationPreviewComponentOrder(shared), [
    second,
    first,
  ]);
});

test("missing or unfamiliar native layouts leave ordering to native discovery, rather than inventing component positions", () => {
  const page = selected("/", []);
  for (const nativeFinalLayout of [undefined, "not-json", { unexpected: true }])
    assert.deepEqual(
      personalizationPreviewComponentOrder({ ...page, nativeFinalLayout }),
      [],
    );
});
