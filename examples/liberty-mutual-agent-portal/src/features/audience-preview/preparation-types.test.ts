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

test("failed audience details allow only a bounded catalog index and fixed diagnostic fields", () => {
  const row = {
    index: 22,
    stage: "profile-preparation",
    code: "PROFILE_LINK_TIMEOUT",
  };
  const failed = {
    status: "failed",
    total: 42,
    readyCount: 21,
    pendingCount: 20,
    failedCount: 1,
    failedRows: [row],
  };
  assert.equal(isAudiencePreparationProgress(failed, 42), true);
  assert.equal(
    isAudiencePreparationProgress(
      { ...failed, failedRows: [{ ...row, status: 503 }] },
      42,
    ),
    true,
  );
  for (const failedRows of [
    [{ ...row, index: -1 }],
    [{ ...row, index: 42 }],
    [{ ...row, index: 1.5 }],
    [{ ...row, stage: "private native response" }],
    [{ ...row, code: "person@example.test" }],
    [{ ...row, status: 200 }],
    [{ ...row, status: 600 }],
    [{ ...row, profileId: "private-profile" }],
    [row, row],
  ])
    assert.equal(
      isAudiencePreparationProgress({ ...failed, failedRows }, 42),
      false,
    );
});

test("retained failure details expose only bounded phase/code/proof flags", () => {
  const row = {
    index: 22,
    stage: "unrecorded",
    code: "UNRECORDED_FAILURE",
    source: "bulk",
    profilePhase: "failed",
    profileCode: "PROFILE_LINK_TIMEOUT",
    identitySent: true,
    hasCatalogProof: true,
    hasSubmissionProof: false,
  };
  const failed = {
    status: "failed",
    total: 42,
    readyCount: 21,
    pendingCount: 20,
    failedCount: 1,
    failedRows: [row],
  };
  assert.equal(isAudiencePreparationProgress(failed, 42), true);
  for (const override of [
    { source: "private-source" },
    { profilePhase: "unknown-state" },
    { profileCode: "private native response" },
    { identitySent: "true" },
    { hasCatalogProof: 1 },
    { hasSubmissionProof: "false" },
  ])
    assert.equal(
      isAudiencePreparationProgress(
        { ...failed, failedRows: [{ ...row, ...override }] },
        42,
      ),
      false,
    );
});
