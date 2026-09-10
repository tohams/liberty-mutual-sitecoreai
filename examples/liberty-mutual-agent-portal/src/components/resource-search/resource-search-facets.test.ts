import assert from "node:assert/strict";
import test from "node:test";
import { buildResourceSearchFacet } from "./resource-search-facets";

test("native Search combines licenses and nationwide in one OR filter, independently of other facets", () => {
  assert.deepEqual(
    buildResourceSearchFacet("licensed", ["IL", "TX", "IL"], {
      "Resource type": "State guidance",
      Product: "workers-compensation",
      "Business family": "",
    }),
    {
      all: true,
      fields: [
        {
          name: "Risk state",
          filters: [{ operator: "eq", value: ["IL", "TX", "All"] }],
        },
        {
          name: "Resource type",
          filters: [{ operator: "eq", value: "State guidance" }],
        },
        {
          name: "Product",
          filters: [{ operator: "eq", value: "workers-compensation" }],
        },
      ],
    },
  );
});

test("All states removes the native state restriction, explicit states keep nationwide, and missing licenses stay narrow", () => {
  assert.deepEqual(buildResourceSearchFacet("all", ["IL", "TX"]), {
    all: true,
    fields: [],
  });
  for (const [scope, expected] of [
    ["FL", ["FL", "All"]],
    ["All", ["All"]],
    ["licensed", ["All"]],
  ] as const) {
    assert.deepEqual(buildResourceSearchFacet(scope, []).fields, [
      {
        name: "Risk state",
        filters: [{ operator: "eq", value: [...expected] }],
      },
    ]);
  }
});
