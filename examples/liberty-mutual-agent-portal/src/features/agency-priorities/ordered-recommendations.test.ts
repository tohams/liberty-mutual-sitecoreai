import assert from "node:assert/strict";
import test from "node:test";
import { orderedRecommendations } from "./ordered-recommendations";

test("curated recommendations retain the author's native order and editable fields", () => {
  const second = {
    id: "second",
    fields: { Heading: { value: "Bundle", metadata: { editable: true } } },
  };
  const first = { id: "first", fields: { Heading: { value: "Business" } } };
  const selected = orderedRecommendations([second, first]);
  assert.deepEqual(
    selected.map((item) => item.id),
    ["second", "first"],
  );
  assert.equal(selected[0], second);
  assert.equal(selected[0].fields.Heading, second.fields.Heading);
});

test("empty native selection and unresolved references do not invent recommendations", () => {
  for (const value of [
    {},
    undefined,
    null,
    "{item-id}",
    [null, { id: "missing" }],
  ]) {
    assert.deepEqual(orderedRecommendations(value), []);
  }
});
