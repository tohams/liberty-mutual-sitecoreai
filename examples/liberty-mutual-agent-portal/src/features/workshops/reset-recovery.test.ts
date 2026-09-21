import assert from "node:assert/strict";
import test from "node:test";
import manifest from "../../../fixtures/manifest.json";
import { parsePersistedResetIntent, recoverResetState } from "./reset-recovery";
import type {
  WorkshopResetOperation,
  WorkshopResetRequest,
  WorkshopResetStatus,
} from "./reset.types";

const CURRENT = "11111111-1111-4111-8111-111111111111";
const NEW = "22222222-2222-4222-8222-222222222222";
const REQUEST = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const intent: WorkshopResetRequest = {
  reviewerPack: "01",
  mode: "restart",
  requestId: REQUEST,
  expectedRunId: CURRENT,
};
const initial: WorkshopResetStatus = {
  reviewerPack: "01",
  restartAvailable: true,
  runId: CURRENT,
  profileGeneration: 0,
  profiles: [],
  pendingOperation: null,
  operation: null,
};
function operation(
  patch: Partial<WorkshopResetOperation> = {},
): WorkshopResetOperation {
  return {
    ...intent,
    status: "pending",
    phase: "verifying",
    runId: CURRENT,
    profileGeneration: 0,
    targetGeneration: 1,
    canResumeVerification: false,
    requiresPortalSignIn: false,
    ...patch,
  };
}

test("persisted reset references accept only the chosen pack, restart and valid UUIDs", () => {
  for (const reviewerPack of manifest.reviewerPacks) {
    const selected = { ...intent, reviewerPack };
    assert.deepEqual(
      parsePersistedResetIntent(reviewerPack, JSON.stringify(selected)),
      selected,
    );
    assert.deepEqual(
      parsePersistedResetIntent(reviewerPack, {
        ...selected,
        resumeVerification: true,
      }),
      { ...selected, resumeVerification: true },
    );
  }
  assert.deepEqual(
    parsePersistedResetIntent("01", JSON.stringify(intent)),
    intent,
  );
  assert.deepEqual(
    parsePersistedResetIntent("01", { ...intent, ignored: "not forwarded" }),
    intent,
  );
  assert.deepEqual(
    parsePersistedResetIntent("01", { ...intent, resumeVerification: true }),
    { ...intent, resumeVerification: true },
  );
  for (const value of [
    null,
    "not json",
    [],
    { ...intent, mode: "saved-work" },
    { ...intent, reviewerPack: "02" },
    { ...intent, requestId: "bad" },
    { ...intent, expectedRunId: "bad" },
    { ...intent, resumeVerification: "true" },
  ]) {
    assert.equal(parsePersistedResetIntent("01", value), null);
  }
  assert.equal(
    parsePersistedResetIntent("21", { ...intent, reviewerPack: "21" }),
    null,
  );
});

test("a pending server operation wins over an unrelated stored request without starting a mutation", () => {
  const pending = operation({ requestId: OTHER });
  const status = { ...initial, pendingOperation: pending };
  const before = JSON.stringify(status);
  const recovered = recoverResetState(status, intent);
  assert.deepEqual(recovered.intent, { ...intent, requestId: OTHER });
  assert.equal(recovered.success, null);
  assert.equal(recovered.blockNewRequest, false);
  assert.equal(JSON.stringify(status), before);
});

test("an unrecorded request is retained only for the same active run", () => {
  assert.deepEqual(recoverResetState(initial, intent).intent, intent);
  const changed = recoverResetState(
    { ...initial, runId: NEW, profileGeneration: 1 },
    intent,
  );
  assert.equal(changed.intent, null);
  assert.match(changed.notice, /changed/);
  assert.equal(changed.blockNewRequest, false);
});

test("completed recovery clears intent and shows success only for this request's active run", () => {
  const completed = operation({
    status: "completed",
    phase: "completed",
    runId: NEW,
    profileGeneration: 1,
    requiresPortalSignIn: true,
  });
  const current = {
    ...initial,
    runId: NEW,
    profileGeneration: 1,
    operation: completed,
  };
  assert.equal(recoverResetState(current, intent).success, completed);
  assert.equal(recoverResetState(current, intent).intent, null);
  assert.equal(
    recoverResetState(current, null).success,
    null,
    "do not announce an old completed reset merely on opening the page",
  );
  const obsolete = recoverResetState(
    { ...current, runId: OTHER, profileGeneration: 2 },
    intent,
  );
  assert.equal(obsolete.success, null);
  assert.match(obsolete.notice, /changed/);
});

test("failed verification retains its message and recovers the same import", () => {
  const failed = operation({
    status: "failed",
    phase: "failed",
    code: "IMPORT_VERIFICATION_FAILED",
    message: "Verify the existing import.",
    canResumeVerification: true,
  });
  const recovered = recoverResetState(
    { ...initial, operation: failed },
    intent,
  );
  assert.equal(recovered.error, failed.message);
  assert.deepEqual(recovered.intent, { ...intent, resumeVerification: true });
  assert.equal(recovered.blockNewRequest, false);
});

test("an uncertain upload remains visible and blocks a new import after refresh", () => {
  const uncertain = operation({
    status: "failed",
    phase: "failed",
    code: "UPLOAD_UNCERTAIN",
    message: "Check the native import before a new request.",
  });
  for (const stored of [intent, null]) {
    const recovered = recoverResetState(
      { ...initial, operation: uncertain },
      stored,
    );
    assert.equal(recovered.error, uncertain.message);
    assert.equal(recovered.intent, null);
    assert.equal(recovered.blockNewRequest, true);
  }
  const obsolete = recoverResetState(
    { ...initial, runId: NEW, operation: uncertain },
    intent,
  );
  assert.equal(
    obsolete.blockNewRequest,
    false,
    "an old failure must not block the newer active run",
  );
  assert.match(obsolete.notice, /changed/);
});

test("rejected imports retain their explanation without silently resuming or reporting success", () => {
  const failed = operation({
    status: "failed",
    phase: "failed",
    code: "PROFILE_IMPORT_FAILED",
    message: "The import was rejected.",
  });
  const recovered = recoverResetState(
    { ...initial, operation: failed },
    intent,
  );
  assert.equal(recovered.error, failed.message);
  assert.equal(recovered.intent, null);
  assert.equal(recovered.success, null);
});

test("inconsistent reviewer or pending-run receipts never become resumable intents", () => {
  for (const pending of [
    operation({ reviewerPack: "02" }),
    operation({ expectedRunId: NEW }),
  ]) {
    const recovered = recoverResetState(
      { ...initial, pendingOperation: pending },
      intent,
    );
    assert.equal(recovered.intent, null);
    assert.equal(recovered.blockNewRequest, true);
    assert.match(recovered.error, /Refresh status/);
  }
  const wrongPack = recoverResetState(
    {
      ...initial,
      operation: operation({ reviewerPack: "02", status: "failed" }),
    },
    intent,
  );
  assert.equal(wrongPack.blockNewRequest, true);
  assert.equal(wrongPack.intent, null);
});
