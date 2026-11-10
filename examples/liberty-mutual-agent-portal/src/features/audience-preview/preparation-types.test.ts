import assert from "node:assert/strict";
import test from "node:test";
import { isAudiencePreparationProgress } from "./preparation-types";

test("preparation progress accepts only bounded, complete scenario counts", () => {
  const pending = {
    status: "pending",
    total: 42,
    readyCount: 17,
    pendingCount: 25,
    failedCount: 0,
    retryAfterSeconds: 3,
  };
  assert.equal(isAudiencePreparationProgress(pending, 42), true);
  assert.equal(
    isAudiencePreparationProgress({ ...pending, status: "idle" }, 42),
    true,
  );
  for (const invalid of [
    null,
    { ...pending, total: 41 },
    { ...pending, status: "ready" },
    { ...pending, readyCount: 43 },
    { ...pending, pendingCount: 24 },
    { ...pending, failedCount: -1 },
    { ...pending, readyCount: 17.5 },
    { ...pending, retryAfterSeconds: Infinity },
    { ...pending, message: "x".repeat(301) },
    { ...pending, status: "unexpected" },
  ])
    assert.equal(isAudiencePreparationProgress(invalid, 42), false);
});
