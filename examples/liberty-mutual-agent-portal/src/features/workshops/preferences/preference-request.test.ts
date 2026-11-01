import assert from "node:assert/strict";
import test from "node:test";
import { recoverPreferenceImport } from "./preference-request";
import type { MarketingPreferenceStatus } from "./preferences.types";

const batchId = "d1da975c-4cc2-403e-bbd8-c5c6e2c077ab";
const pending: MarketingPreferenceStatus = {
  status: "upload-uncertain",
  action: "baseline",
  operationId: "existing-operation",
  message: "The native batch is still processing.",
  profiles: [],
  canSubmit: false,
  canInspect: false,
};

test("recovering an import sends one PATCH for the existing batch and never uploads a preference file", async () => {
  let calls = 0;
  const fetcher = (async (url, options) => {
    calls++;
    assert.equal(url, "/api/workshops/preferences");
    assert.equal(options?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(options?.body)), { batchId });
    return Response.json(pending, { status: 202 });
  }) as typeof fetch;
  const result = await recoverPreferenceImport(
    ` ${batchId} `,
    new AbortController().signal,
    fetcher,
  );
  assert.equal(calls, 1);
  assert.equal(result.status, "upload-uncertain");
  assert.equal(result.canSubmit, false);
});

test("an unrelated or rejected native batch remains an error without a retry", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return Response.json(
      { error: { code: "IMPORT_BATCH_MISMATCH" } },
      { status: 409 },
    );
  }) as typeof fetch;
  await assert.rejects(
    recoverPreferenceImport(batchId, new AbortController().signal, fetcher),
    /could not be matched/,
  );
  assert.equal(calls, 1);
});
