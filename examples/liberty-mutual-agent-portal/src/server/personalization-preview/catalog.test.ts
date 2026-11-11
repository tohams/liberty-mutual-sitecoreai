import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalizeInfo } from "@sitecore-content-sdk/content/personalize";
import {
  buildPersonalizationCatalog,
  selectPersonalizationOutcomes,
} from "./catalog";
import type { PersonalizationPreviewPage } from "./types";

const componentA = "c293373f7f755cfea495f62ed2a70920";
const componentB = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const agency = `${componentA}_6c922be5e7d849358e4f405b8d4051a5`;
const producer = `${componentA}_f3767f2c987d44b5ae3c8e08cd956bb6`;
const guidance = `${componentB}_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`;
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
  variantIds: [agency, producer, guidance],
} as PersonalizeInfo;
function variant(name: string, variantId: string, ref: string) {
  return {
    ref,
    name,
    tasks: [{ input: { template: JSON.stringify({ variantId }) } }],
  };
}
const flows = [
  {
    ref: "11111111-1111-4111-8111-111111111111",
    name: "Liberty Mutual - Agency product priorities",
    subtype: "EXPERIENCE",
    revision: 1,
    transpiledVariants: [
      variant("agency-growth", agency, "22222222-2222-4222-8222-222222222222"),
      variant(
        "producer-priorities",
        producer,
        "33333333-3333-4333-8333-333333333333",
      ),
    ],
  },
  {
    ref: "44444444-4444-4444-8444-444444444444",
    name: "Agency growth guidance",
    subtype: "EXPERIENCE",
    revision: 2,
    transpiledVariants: [
      variant(
        "Small-business guidance",
        guidance,
        "55555555-5555-4555-8555-555555555555",
      ),
    ],
  },
];

test("selectors follow current native component occurrence across two pages, preserving their labels and IDs", () => {
  const authored = (renderings: unknown[], path: string) =>
    Object.defineProperty({ ...page, path }, "nativeFinalLayout", {
      value: JSON.stringify({ devices: [{ renderings }] }),
    });
  const firstPage = authored(
    [
      { instanceId: componentB, placeholderKey: "headless-agent-guidance" },
      { instanceId: componentA, placeholderKey: "headless-agency-priorities" },
    ],
    "/",
  );
  const secondPage = authored(
    [
      { instanceId: componentB, placeholderKey: "custom-root" },
      { instanceId: componentA, placeholderKey: "custom-root" },
    ],
    "/another-page",
  );
  const reversedDefinitions = [...flows].reverse();
  const home = buildPersonalizationCatalog(
    firstPage,
    reversedDefinitions,
    info,
  );
  const other = buildPersonalizationCatalog(secondPage, flows, info);
  assert.deepEqual(
    home.context.flows.map((flow) => flow.id),
    flows.map((flow) => flow.ref),
  );
  assert.deepEqual(
    other.context.flows.map((flow) => flow.id),
    reversedDefinitions.map((flow) => flow.ref),
  );
  assert.deepEqual(
    home.context.flows[0].options.map((option) => option.label),
    ["Default", "agency-growth", "producer-priorities"],
  );
  assert.equal(home.context.flows[0].options[1].id, agency);
  const changedOrder = authored(
    [
      { instanceId: componentA, placeholderKey: "custom-root" },
      { instanceId: componentB, placeholderKey: "custom-root" },
    ],
    "/another-page",
  );
  const refreshed = buildPersonalizationCatalog(changedOrder, flows, info);
  assert.notEqual(refreshed.context.revision, other.context.revision);
  assert.deepEqual(
    refreshed.context.flows.map((flow) => flow.id),
    flows.map((flow) => flow.ref),
  );
});

test("a page-level personalization is first even when native discovery and definitions list components first", () => {
  const pageVariant = "ed1ff2801b9b4f71946885ff88584fdf";
  const pageFlow = {
    ref: "page-flow",
    name: "Whole page",
    subtype: "EXPERIENCE",
    transpiledVariants: [
      variant("A named page variant", pageVariant, "page-row"),
    ],
  };
  const result = buildPersonalizationCatalog(page, [...flows, pageFlow], {
    ...info,
    variantIds: [...info.variantIds, pageVariant],
  });
  assert.deepEqual(
    result.context.flows.map((flow) => flow.id),
    [pageFlow.ref, ...flows.map((flow) => flow.ref)],
  );
});

test("discovers named table outputs using actual native IDs, without treating management refs or labels as preview IDs", () => {
  const result = buildPersonalizationCatalog(page, flows, info);
  assert.deepEqual(
    result.context.flows[0].options.map((entry) => [entry.label, entry.id]),
    [
      ["Default", `${componentA}_default`],
      ["agency-growth", agency],
      ["producer-priorities", producer],
    ],
  );
  assert.equal(result.context.flows[0].name, flows[0].name);
  assert.equal(
    result.context.flows[0].options.some(
      (entry) => entry.id === flows[0].transpiledVariants[0].ref,
    ),
    false,
  );
  assert.equal(
    result.context.flows[0].options.some(
      (entry) => entry.id === "agency-growth",
    ),
    false,
  );
});

test("parses the live page-level flow contract, using native template output IDs rather than management refs", () => {
  const avery = "ed1ff2801b9b4f71946885ff88584fdf";
  const daniel = "d57b13d4ee02493f8fcd6f254f8dc699";
  const selected = {
    ...page,
    id: "cfe0e86f-dd93-4b8e-84cd-a2a46e8c1947",
    path: "/growth/agent-audience-preview",
    version: 6,
  };
  const fixture = [
    {
      ref: "7936d1d2-4f16-4ec8-ac63-a87a14a73e80",
      name: "agent-audience-preview en",
      type: "EMBEDDED",
      subtype: "EXPERIENCE",
      revision: 6,
      transpiledVariants: [
        {
          ref: "477bd16a-3dcf-4f6e-9945-cc0c2a50f6ee",
          name: "Avery agency principal",
          tasks: [
            {
              implementation: "templateRenderTask",
              input: {
                inputType: "templateRenderTaskInput",
                type: "application/json",
                template: JSON.stringify({ variantId: avery }),
              },
            },
          ],
        },
        {
          ref: "a9bb18c7-5fa4-4ec9-8471-25d0f23f17dc",
          name: "Daniel producer",
          tasks: [
            {
              implementation: "templateRenderTask",
              input: {
                inputType: "templateRenderTaskInput",
                type: "application/json",
                template: JSON.stringify({ variantId: daniel }),
              },
            },
          ],
        },
      ],
    },
  ];
  const catalog = buildPersonalizationCatalog(selected, fixture, {
    pageId: selected.id,
    variantIds: [avery, daniel],
  } as PersonalizeInfo);
  assert.deepEqual(catalog.context.flows[0].options, [
    { id: "_default", label: "Default", control: true },
    { id: avery, label: "Avery agency principal", control: false },
    { id: daniel, label: "Daniel producer", control: false },
  ]);
  const choice = selectPersonalizationOutcomes(
    catalog,
    catalog.context.revision,
    [{ flowId: fixture[0].ref, optionId: daniel }],
  );
  assert.equal(choice.decisions.pageVariantId, daniel);
  assert.equal(choice.decisions.componentVariantIds.length, 0);
});

test("supports multiple component outcomes while preserving each component's default", () => {
  const result = buildPersonalizationCatalog(page, flows, info);
  const selection = selectPersonalizationOutcomes(
    result,
    result.context.revision,
    [
      { flowId: flows[0].ref, optionId: agency },
      { flowId: flows[1].ref, optionId: `${componentB}_default` },
    ],
  );
  assert.deepEqual(selection.decisions.componentVariantIds, [
    agency,
    `${componentB}_default`,
  ]);
  assert.equal(selection.decisions.selections[0].control, false);
  assert.equal(selection.decisions.selections[1].control, true);
  assert.equal(selection.selectedExperiences[0].optionLabel, "agency-growth");
});

test("renames and rule revisions invalidate old choices without changing variant identity", () => {
  const before = buildPersonalizationCatalog(page, flows, info);
  const changed = structuredClone(flows);
  changed[0].revision++;
  changed[0].transpiledVariants[0].name = "Agency opportunities";
  const after = buildPersonalizationCatalog(page, changed, info);
  assert.notEqual(before.context.revision, after.context.revision);
  assert.equal(after.context.flows[0].options[1].id, agency);
  assert.throws(
    () => selectPersonalizationOutcomes(after, before.context.revision, []),
    { code: "CONFIGURATION_CHANGED" },
  );
});

test("rejects forged, duplicate, missing, and cross-flow selections", () => {
  const result = buildPersonalizationCatalog(page, flows, info);
  for (const selections of [
    [
      { flowId: flows[0].ref, optionId: "agency-growth" },
      { flowId: flows[1].ref, optionId: guidance },
    ],
    [
      { flowId: flows[0].ref, optionId: agency },
      { flowId: flows[0].ref, optionId: producer },
    ],
    [{ flowId: flows[0].ref, optionId: agency }],
    [
      { flowId: flows[0].ref, optionId: guidance },
      { flowId: flows[1].ref, optionId: agency },
    ],
  ])
    assert.throws(
      () =>
        selectPersonalizationOutcomes(
          result,
          result.context.revision,
          selections,
        ),
      { code: "INVALID_SELECTION" },
    );
});

test("does not expose A/B experiments as personalized table choices", () => {
  const result = buildPersonalizationCatalog(
    page,
    [...flows, { ...flows[0], ref: "experiment", subtype: "EXPERIMENT" }],
    info,
  );
  assert.equal(result.context.flows.length, 2);
});

test("never substitutes unknown or ambiguous native variant IDs", () => {
  const wrong = structuredClone(flows);
  wrong[0].transpiledVariants[0].tasks[0].input.template = JSON.stringify({
    variantId: "unrelated_variant",
  });
  const result = buildPersonalizationCatalog(page, wrong, info);
  assert.equal(
    result.context.flows[0].options.some(
      (entry) => entry.id === "unrelated_variant",
    ),
    false,
  );
  assert.match(
    result.context.warnings?.join(" ") || "",
    /agency-growth.*unavailable/,
  );
  const ambiguous = structuredClone(flows);
  ambiguous[0].transpiledVariants[0].tasks[0].input.template = JSON.stringify({
    first: { variantId: agency },
    second: { variantId: producer },
  });
  assert.throws(() => buildPersonalizationCatalog(page, ambiguous, info), {
    code: "AMBIGUOUS_VARIANT_MAPPING",
  });
});

test("labels, management refs, arbitrary keys, and targeting metadata never authorize a native variant", () => {
  for (const forged of [
    { ref: agency, name: agency, variantName: agency, variant_name: agency },
    {
      ref: "management-reference",
      name: "Friendly name",
      [agency]: { name: "anything" },
    },
    { name: "Friendly name", condition: { variantId: agency } },
  ]) {
    const untrusted = [{ ...flows[0], transpiledVariants: [forged] }];
    const result = buildPersonalizationCatalog(page, untrusted, info);
    assert.equal(result.context.flows.length, 0);
    assert.ok(result.context.warnings?.length);
  }
});

test("rejects multiple definitions targeting the same component and mismatched page discovery", () => {
  assert.throws(
    () =>
      buildPersonalizationCatalog(
        page,
        [flows[0], { ...flows[0], ref: "other-flow" }],
        info,
      ),
    { code: "AMBIGUOUS_VARIANT_MAPPING" },
  );
  assert.throws(
    () =>
      buildPersonalizationCatalog(page, flows, {
        ...info,
        pageId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      }),
    { code: "INVALID_FLOW_CONFIGURATION" },
  );
});

test("a page with no personalization can preview its original content", () => {
  const result = buildPersonalizationCatalog(page, [], {
    pageId: page.id,
    variantIds: [],
  } as PersonalizeInfo);
  assert.deepEqual(result.context.flows, []);
  assert.deepEqual(
    selectPersonalizationOutcomes(result, result.context.revision, []).decisions
      .componentVariantIds,
    [],
  );
});

test("an empty management list cannot masquerade as default-only when native variants exist", () => {
  assert.throws(() => buildPersonalizationCatalog(page, [], info), {
    code: "PERSONALIZATION_DISCOVERY_INCOMPLETE",
  });
});
