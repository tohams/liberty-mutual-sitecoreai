import assert from "node:assert/strict";
import test from "node:test";
import { safePersonalizationServerTiming } from "./performance";

test("DOM timing metadata retains only known numeric stages", () => {
  assert.equal(
    safePersonalizationServerTiming(
      "auth;dur=1, page;dur=20.15, total;dur=25.1",
    ),
    "auth;dur=1.0, page;dur=20.1, total;dur=25.1",
  );
  assert.equal(
    safePersonalizationServerTiming(
      "private-id;dur=5, auth;dur=1;desc=private-token, total;dur=5",
    ),
    "total;dur=5.0",
  );
});

test("malformed or unbounded timing values never enter the observable DOM", () => {
  for (const value of [
    null,
    "",
    "x".repeat(2_049),
    "auth;dur=-1",
    "auth;dur=NaN",
    "auth;dur=Infinity",
    "total;dur=300001",
  ])
    assert.equal(safePersonalizationServerTiming(value), "");
});
