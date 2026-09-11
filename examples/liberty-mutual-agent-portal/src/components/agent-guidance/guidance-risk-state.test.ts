import assert from "node:assert/strict";
import test from "node:test";
import { guidanceLinkWithRiskState } from "./guidance-risk-state";

test("product guidance carries risk context while retaining authored metadata and query parameters", () => {
  const field = {
    value: {
      href: "/quote?new=1#account",
      text: "Prepare account",
      target: "_self",
    },
    metadata: { fieldId: "guidance-action" },
  };
  const result = guidanceLinkWithRiskState(field, "IL", false)!;
  assert.equal(result.value.href, "/quote?new=1&state=IL#account");
  assert.equal(result.value.text, field.value.text);
  assert.deepEqual(result.metadata, field.metadata);
  assert.equal(field.value.href, "/quote?new=1#account");
});

test("editor fields, external sources, authentication links and missing context stay unchanged", () => {
  for (const href of [
    "https://www.tdi.texas.gov/",
    "/login",
    "/api/auth/login",
    "#details",
  ]) {
    const field = { value: { href } };
    assert.equal(guidanceLinkWithRiskState(field, "IL", false), field);
  }
  const field = {
    value: { href: "/products" },
    metadata: { fieldId: "guidance-action" },
  };
  assert.equal(guidanceLinkWithRiskState(field, "IL", true), field);
  assert.equal(guidanceLinkWithRiskState(field, undefined, false), field);
  assert.equal(guidanceLinkWithRiskState(undefined, "IL", false), undefined);
});
