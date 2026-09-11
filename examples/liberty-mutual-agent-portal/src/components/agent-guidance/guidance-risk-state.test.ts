import assert from "node:assert/strict";
import test from "node:test";
import { guidanceLinkWithRiskState } from "./guidance-risk-state";

test("product guidance carries risk context while retaining authored metadata and query parameters", () => {
  const field = {
    value: {
      href: "/quote?new=1#account",
      text: "Prepare account",
      target: "_self",
      querystring: "source=guidance&state=TX",
    },
    metadata: { fieldId: "guidance-action" },
  };
  const result = guidanceLinkWithRiskState(field, "IL", false)!;
  assert.equal(result.value.href, "/quote");
  assert.equal(result.value.querystring, "new=1&state=IL&source=guidance");
  assert.equal(result.value.anchor, "account");
  assert.equal(result.value.text, field.value.text);
  assert.deepEqual(result.metadata, field.metadata);
  assert.equal(field.value.href, "/quote?new=1#account");
  const alreadySelected = guidanceLinkWithRiskState(
    { value: { href: "/products?state=IL", querystring: "state=TX" } },
    "IL",
    false,
  )!;
  assert.equal(alreadySelected.value.href, "/products");
  assert.equal(alreadySelected.value.querystring, "state=IL");
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
