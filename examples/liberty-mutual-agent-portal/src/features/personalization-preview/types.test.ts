import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultPersonalizationSelections,
  isPersonalizationPreviewCatalog,
  isPersonalizationPreviewResult,
  personalizationPreviewPageKey,
} from "./types";

const catalog = {
  page: {
    id: "page-1",
    name: "Home",
    siteName: "agent-portal",
    language: "en",
    version: 3,
  },
  revision: "revision-1",
  flows: [
    {
      id: "flow-1",
      name: "Agency product priorities",
      defaultOptionId: "control-1",
      options: [
        { id: "control-1", label: "Default", control: true },
        { id: "variant-1", label: "agency-growth", control: false },
        { id: "variant-2", label: "producer-priorities", control: false },
      ],
    },
  ],
};

test("catalog accepts configured labels and opaque option IDs", () => {
  assert.equal(isPersonalizationPreviewCatalog(catalog), true);
  assert.deepEqual(defaultPersonalizationSelections(catalog), [
    { flowId: "flow-1", optionId: "control-1" },
  ]);
  assert.equal(
    isPersonalizationPreviewCatalog({ ...catalog, flows: [] }),
    true,
  );
});

test("ambiguous controls, duplicate IDs, and missing default choices are rejected", () => {
  const flow = catalog.flows[0];
  for (const flows of [
    [flow, flow],
    [{ ...flow, defaultOptionId: "missing" }],
    [{ ...flow, options: [...flow.options, flow.options[0]] }],
    [
      {
        ...flow,
        options: flow.options.map((option) => ({ ...option, control: true })),
      },
    ],
  ])
    assert.equal(isPersonalizationPreviewCatalog({ ...catalog, flows }), false);
});

test("catalog guards malformed responses and unavailable page versions", () => {
  for (const value of [
    null,
    [],
    {},
    { ...catalog, revision: "" },
    { ...catalog, page: { ...catalog.page, version: 0 } },
    { ...catalog, warnings: [42] },
  ])
    assert.equal(isPersonalizationPreviewCatalog(value), false);
});

const origin = "https://portal.example";
const preview = {
  status: "ready",
  previewUrl: `/apps/personalization-preview/view/${"a".repeat(43)}`,
  title: "Preview ready",
  selectedExperiences: [
    {
      flowId: "flow-1",
      flowName: "Agency product priorities",
      optionLabel: "agency-growth",
    },
  ],
};

test("preview navigation stays inside the new app’s actor-bound view route", () => {
  assert.equal(isPersonalizationPreviewResult(preview, origin), true);
  assert.equal(
    isPersonalizationPreviewResult(
      { ...preview, previewUrl: `${origin}${preview.previewUrl}` },
      origin,
    ),
    true,
  );
  for (const previewUrl of [
    `https://other.example${preview.previewUrl}`,
    "javascript:alert(1)",
    "/apps/other-preview/view/other",
    `${preview.previewUrl}?token=other`,
    `${preview.previewUrl}#other`,
    "/apps/personalization-preview/view/invalid",
  ])
    assert.equal(
      isPersonalizationPreviewResult({ ...preview, previewUrl }, origin),
      false,
    );
});

test("a new page, language, or version resets the panel context", () => {
  assert.notEqual(
    personalizationPreviewPageKey(catalog.page),
    personalizationPreviewPageKey({ ...catalog.page, version: 4 }),
  );
  assert.notEqual(
    personalizationPreviewPageKey(catalog.page),
    personalizationPreviewPageKey({ ...catalog.page, language: "es" }),
  );
  assert.equal(personalizationPreviewPageKey(null), "");
  assert.equal(
    personalizationPreviewPageKey({
      ...catalog.page,
      id: "{AE9E45CA-F127-4ABE-9CA7-2FF109981998}",
    }),
    personalizationPreviewPageKey({
      ...catalog.page,
      id: "ae9e45caf1274abe9ca72ff109981998",
    }),
  );
});
