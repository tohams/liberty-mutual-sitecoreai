import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalizeInfo } from "@sitecore-content-sdk/content/personalize";
import {
  nativeContentGroups,
  readNativePersonalizationContentDefinitions,
} from "./native-content";
import { buildPersonalizationCatalog } from "./catalog";
import type { PersonalizationPreviewPage } from "./types";

const component = "c293373f7f755cfea495f62ed2a70920";
const rendering = "a2e85f2d7dbc564080400b688d7912a6";
const agency = `${component}_6c922be5e7d849358e4f405b8d4051a5`;
const producer = `${component}_f3767f2c987d44b5ae3c8e08cd956bb6`;
const source = "3127968e4b2150c3ad79b6bbbe5303b8";
const source2 = "077bbcf9ce805f76ae6a8a8b5580f1c0";
const page: PersonalizationPreviewPage = {
  id: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  name: "Home",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 1,
};
const info = {
  pageId: page.id,
  variantIds: [agency, producer],
} as PersonalizeInfo;
function selectedPage(): PersonalizationPreviewPage {
  return Object.defineProperty({ ...page }, "nativeFinalLayout", {
    value: JSON.stringify({
      devices: [
        {
          renderings: [
            {
              id: rendering,
              instanceId: component,
              personalization: {
                ruleSet: {
                  rules: [
                    {
                      name: "An author-visible label is not the ID",
                      conditions: `<conditions><condition VariantName="${agency}" /></conditions>`,
                      actions: [{ dataSource: source }],
                    },
                    {
                      name: "Producer",
                      conditions: `<conditions><condition VariantName="${producer}" /></conditions>`,
                      actions: [{ dataSource: source2 }],
                    },
                    {
                      name: "Default",
                      conditions:
                        '<conditions><condition id="default" /></conditions>',
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    }),
  });
}
const metadata = new Map([
  [
    rendering,
    {
      id: rendering,
      name: "AgencyPriorities",
      displayName: "Agency priorities",
    },
  ],
  [source, { id: source, name: "Agency growth priorities" }],
  [source2, { id: source2, name: "Producer priorities" }],
]);

test("selected-version final layout explicitly binds each SDK variant to its component", () => {
  const result = nativeContentGroups(selectedPage(), info);
  assert.deepEqual(result.groups, [
    {
      componentId: component,
      renderingId: rendering,
      choices: [
        { variantId: agency, dataSourceId: source },
        { variantId: producer, dataSourceId: source2 },
      ],
    },
  ]);
  assert.deepEqual(result.warnings, []);
  assert.equal(
    JSON.stringify(selectedPage()).includes("nativeFinalLayout"),
    false,
  );
});

test("native content labels come from resolved datasource names, while exact native IDs remain unchanged", async () => {
  let calls = 0;
  const result = await readNativePersonalizationContentDefinitions(
    selectedPage(),
    info,
    "unused",
    undefined,
    async (ids, language) => {
      calls++;
      assert.deepEqual(ids, [rendering, source, source2]);
      assert.equal(language, "en");
      return metadata;
    },
  );
  const catalog = buildPersonalizationCatalog(
    selectedPage(),
    result.definitions,
    info,
  );
  assert.equal(calls, 1);
  assert.equal(catalog.context.flows[0].name, "Agency priorities");
  assert.deepEqual(
    catalog.context.flows[0].options.map((option) => [option.label, option.id]),
    [
      ["Default", `${component}_default`],
      ["Agency growth priorities", agency],
      ["Producer priorities", producer],
    ],
  );
  assert.match(result.warnings[0], /native content variants/);
});

test("never infers a preview ID from a rule label or an unrelated SDK component", () => {
  const selected = selectedPage();
  const layout = JSON.parse(String(selected.nativeFinalLayout));
  layout.devices[0].renderings[0].personalization.ruleSet.rules[0].conditions =
    '<conditions><condition VariantName="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" /></conditions>';
  const changed = { ...page, nativeFinalLayout: JSON.stringify(layout) };
  assert.throws(() => nativeContentGroups(changed, info), {
    code: "NATIVE_CONTENT_UNAVAILABLE",
  });
  assert.throws(() => nativeContentGroups(page, info), {
    code: "NATIVE_CONTENT_UNAVAILABLE",
  });
});

test("stale/missing current-version variants are disclosed rather than silently relabeled", () => {
  const selected = selectedPage();
  const layout = JSON.parse(String(selected.nativeFinalLayout));
  layout.devices[0].renderings[0].personalization.ruleSet.rules.splice(1, 1);
  const result = nativeContentGroups(
    { ...page, nativeFinalLayout: JSON.stringify(layout) },
    info,
  );
  assert.equal(result.groups[0].choices.length, 1);
  assert.match(result.warnings[0], /selected page version/);
  const unpublished = nativeContentGroups(selectedPage(), {
    ...info,
    variantIds: [agency],
  });
  assert.equal(unpublished.groups[0].choices.length, 1);
  assert.match(unpublished.warnings[0], /selected page version/);
});

test("rejects missing native metadata instead of inventing content labels", async () => {
  const partial = new Map(metadata);
  partial.delete(source);
  await assert.rejects(
    readNativePersonalizationContentDefinitions(
      selectedPage(),
      info,
      "unused",
      undefined,
      async () => partial,
    ),
    { code: "NATIVE_CONTENT_UNAVAILABLE" },
  );
});

test("datasource-less outcomes are named as native variants without inventing an audience or a Hide claim", async () => {
  const selected = selectedPage();
  const layout = JSON.parse(String(selected.nativeFinalLayout));
  delete layout.devices[0].renderings[0].personalization.ruleSet.rules[1]
    .actions;
  const changed = { ...page, nativeFinalLayout: JSON.stringify(layout) };
  const result = await readNativePersonalizationContentDefinitions(
    changed,
    info,
    "unused",
    undefined,
    async () => metadata,
  );
  const catalog = buildPersonalizationCatalog(
    changed,
    result.definitions,
    info,
  );
  assert.equal(
    catalog.context.flows[0].options[2].label,
    "Agency priorities — Variant 2",
  );
  assert.equal(catalog.context.flows[0].options[2].id, producer);
});
