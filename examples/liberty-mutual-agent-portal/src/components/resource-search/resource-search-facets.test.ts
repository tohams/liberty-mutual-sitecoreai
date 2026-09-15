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

test("legacy and forged state scopes stay licensed, explicit licenses keep nationwide, and missing licenses stay narrow", () => {
  for (const scope of ["all", "FL"] as const)
    assert.deepEqual(
      buildResourceSearchFacet(scope, ["IL", "TX"]),
      buildResourceSearchFacet("licensed", ["IL", "TX"]),
    );
  assert.deepEqual(buildResourceSearchFacet("TX", ["IL", "TX"]).fields, [
    { name: "Risk state", filters: [{ operator: "eq", value: ["TX", "All"] }] },
  ]);
  for (const [scope, expected] of [
    ["FL", ["All"]],
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
