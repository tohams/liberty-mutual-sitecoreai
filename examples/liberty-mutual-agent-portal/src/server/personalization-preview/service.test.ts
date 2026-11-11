import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalizeInfo } from "@sitecore-content-sdk/content/personalize";
import type { PersonalizationPreviewDependencies } from "./service";
process.env.SITECORE_EDGE_CONTEXT_ID ||= "unit-test-personalization-preview";

const page = {
  pageId: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  language: "en",
  version: 1,
};
test("accepts bounded Page Builder page selections and rejects unrecognized sites or query parameters", async () => {
  const { parsePersonalizationPageRequest } = await import("./service");
  assert.deepEqual(parsePersonalizationPageRequest(page), page);
  for (const extra of [
    { siteName: "other-site" },
    { path: "https://attacker.invalid" },
    { version: 0 },
    { language: "../en" },
    { pageId: "not-a-page" },
  ])
    assert.throws(
      () => parsePersonalizationPageRequest({ ...page, ...extra }),
      { code: "INVALID_PAGE_SELECTION" },
    );
});
test("preview requests accept selectors only, with no profiles, custom expressions, or target URLs", async () => {
  const { parsePersonalizationPreviewRequest } = await import("./service");
  const input = {
    ...page,
    revision: "a".repeat(64),
    selections: [{ flowId: "flow-one", optionId: "native-variant" }],
  };
  assert.deepEqual(parsePersonalizationPreviewRequest(input), input);
  for (const extra of [
    { profileId: "any" },
    { previewUrl: "https://attacker.invalid" },
    {
      selections: [
        { flowId: "flow-one", optionId: "native-variant", code: "return true" },
      ],
    },
    { revision: "old" },
  ])
    assert.throws(() =>
      parsePersonalizationPreviewRequest({ ...input, ...extra }),
    );
});

test("prefers real flow labels and uses native content names only for a successfully empty component discovery", async () => {
  const { loadPersonalizationPreviewCatalog } = await import("./service");
  const selected = {
    id: page.pageId,
    name: "Home",
    path: "/",
    contentPath:
      "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
    siteName: "liberty-mutual-agent-portal",
    language: "en",
    version: 1,
  };
  const component = "c293373f7f755cfea495f62ed2a70920";
  const native = `${component}_6c922be5e7d849358e4f405b8d4051a5`;
  const definition = {
    ref: "real-flow",
    name: "Product priorities",
    subtype: "EXPERIENCE",
    transpiledVariants: [
      {
        name: "agency-growth",
        tasks: [{ input: { template: JSON.stringify({ variantId: native }) } }],
      },
    ],
  };
  let fallbackCalls = 0;
  const dependencies: PersonalizationPreviewDependencies = {
    readFlows: async () => [definition],
    getInfo: async () =>
      ({ pageId: selected.id, variantIds: [native] }) as PersonalizeInfo,
    loadLayout: async () => {
      throw new Error("Not used in discovery");
    },
    createView: async () => "not-used",
    readNativeContent: async () => {
      fallbackCalls++;
      return {
        definitions: [
          {
            ...definition,
            ref: `native_${component}`,
            name: "Agency priorities",
          },
        ],
        warnings: ["Native content variants"],
      };
    },
  };
  const exact = await loadPersonalizationPreviewCatalog(
    selected,
    "author-token",
    dependencies,
  );
  assert.equal(exact.context.flows[0].name, "Product priorities");
  assert.equal(fallbackCalls, 0);
  const fallback = await loadPersonalizationPreviewCatalog(
    selected,
    "author-token",
    { ...dependencies, readFlows: async () => [] },
  );
  assert.equal(fallback.context.flows[0].name, "Agency priorities");
  assert.equal(fallbackCalls, 1);
  assert.deepEqual(fallback.context.warnings, ["Native content variants"]);
  await assert.rejects(
    loadPersonalizationPreviewCatalog(selected, "author-token", {
      ...dependencies,
      readFlows: async () => {
        throw new Error("Permission denied");
      },
    }),
  );
  assert.equal(fallbackCalls, 1);

  const anotherComponent = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const anotherNative = `${anotherComponent}_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`;
  const pageNative = "ed1ff2801b9b4f71946885ff88584fdf";
  const pageDefinition = {
    ...definition,
    ref: "page-flow",
    name: "Principal page",
    transpiledVariants: [
      {
        name: "Principal",
        tasks: [
          { input: { template: JSON.stringify({ variantId: pageNative }) } },
        ],
      },
    ],
  };
  const mixed = await loadPersonalizationPreviewCatalog(
    selected,
    "author-token",
    {
      ...dependencies,
      readFlows: async () => [definition, pageDefinition],
      getInfo: async () =>
        ({
          pageId: selected.id,
          variantIds: [native, pageNative, anotherNative],
        }) as PersonalizeInfo,
      readNativeContent: async (
        _page,
        _info,
        _token,
        _scope,
        _reader,
        excludedOwners,
      ) => {
        assert.deepEqual(excludedOwners, new Set([component]));
        return {
          definitions: [
            {
              ...definition,
              ref: `native_${anotherComponent}`,
              name: "Growth guidance",
              transpiledVariants: [
                {
                  name: "Growth content",
                  tasks: [
                    {
                      input: {
                        template: JSON.stringify({ variantId: anotherNative }),
                      },
                    },
                  ],
                },
              ],
            },
          ],
          warnings: ["Native content variants"],
        };
      },
    },
  );
  assert.deepEqual(
    mixed.context.flows.map((flow) => flow.name),
    ["Product priorities", "Principal page", "Growth guidance"],
  );
});
