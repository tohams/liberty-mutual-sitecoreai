import assert from "node:assert/strict";
import test from "node:test";
import {
  isMarketingPreferenceStatus,
  preferenceAutomaticCheckAllowed,
  preferenceOptOutAllowed,
  preferenceRecoveryAllowed,
  preferenceSubmissionAllowed,
} from "./preference-state";
import type { MarketingPreferenceStatus } from "./preferences.types";

const verified: MarketingPreferenceStatus = {
  status: "verified",
  action: "baseline",
  operationId: "recorded-operation",
  batchId: "native-batch",
  profiles: [
    {
      identifier: "comparison-a",
      displayName: "Cameron Ellis - Allowed",
      agencyName: "Lakeside Independent Insurance",
      state: "TX",
      role: "producer",
      marketingSuppressed: false,
    },
  ],
  message: "Native records verified.",
  canSubmit: true,
  canInspect: false,
};

test("an unconfirmed upload acknowledgement blocks another submission even when the previous receipt was verified", () => {
  assert.equal(preferenceSubmissionAllowed(verified, false, true), false);
  assert.equal(preferenceOptOutAllowed(verified, false, true), false);
  assert.equal(preferenceSubmissionAllowed(verified, true, false), false);
  assert.equal(preferenceSubmissionAllowed(null, false, false), false);
});

test("opting out requires a verified baseline and cannot repeat the already verified opt-out", () => {
  assert.equal(preferenceOptOutAllowed(verified, false, false), true);
  assert.equal(
    preferenceOptOutAllowed({ ...verified, action: "optout" }, false, false),
    false,
  );
  assert.equal(
    preferenceOptOutAllowed({ ...verified, status: "idle" }, false, false),
    false,
  );
  assert.equal(
    preferenceOptOutAllowed(
      { ...verified, status: "pending", canSubmit: false },
      false,
      false,
    ),
    false,
  );
});

test("automatic polling is bounded, uses only an inspectable pending receipt, and stops after an error", () => {
  const pending = {
    ...verified,
    status: "pending" as const,
    canInspect: true,
    canSubmit: false,
  };
  assert.equal(preferenceAutomaticCheckAllowed(pending, false, "", 0), true);
  assert.equal(preferenceAutomaticCheckAllowed(pending, false, "", 7), true);
  assert.equal(preferenceAutomaticCheckAllowed(pending, false, "", 8), false);
  assert.equal(
    preferenceAutomaticCheckAllowed(pending, false, "Could not confirm", 1),
    false,
  );
  assert.equal(preferenceAutomaticCheckAllowed(pending, true, "", 1), false);
  assert.equal(
    preferenceAutomaticCheckAllowed(
      { ...pending, status: "upload-uncertain" },
      false,
      "",
      1,
    ),
    false,
  );
  assert.equal(preferenceAutomaticCheckAllowed(verified, false, "", 0), false);
});

test("the browser accepts the documented flat status, while incomplete or unexpected responses remain blocked", () => {
  assert.equal(isMarketingPreferenceStatus(verified), true);
  assert.equal(
    isMarketingPreferenceStatus({ ...verified, status: "toString" }),
    false,
  );
  assert.equal(
    isMarketingPreferenceStatus({
      ...verified,
      profiles: [{ marketingSuppressed: false }],
    }),
    false,
  );
  assert.equal(
    isMarketingPreferenceStatus({ error: { message: "Unavailable" } }),
    false,
  );
  assert.equal(isMarketingPreferenceStatus(null), false);
});

test("batch recovery is available only for an uncertain upload and a complete native UUID", () => {
  const uncertain = {
    ...verified,
    status: "upload-uncertain" as const,
    canSubmit: false,
  };
  const batchId = "d1da975c-4cc2-403e-bbd8-c5c6e2c077ab";
  assert.equal(preferenceRecoveryAllowed(uncertain, false, batchId), true);
  assert.equal(preferenceRecoveryAllowed(uncertain, true, batchId), false);
  assert.equal(preferenceRecoveryAllowed(verified, false, batchId), false);
  assert.equal(
    preferenceRecoveryAllowed(
      { ...uncertain, status: "queued" },
      false,
      batchId,
    ),
    false,
  );
  assert.equal(
    preferenceRecoveryAllowed(uncertain, false, "partial-batch"),
    false,
  );
  assert.equal(preferenceRecoveryAllowed(null, false, batchId), false);
});
