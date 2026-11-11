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
