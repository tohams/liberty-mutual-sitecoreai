import assert from "node:assert/strict";
import test from "node:test";
import { AudiencePreviewError } from "./contracts";
import {
  createPreviewProfileImporter,
  PreviewImportQueueBusyError,
} from "./importer";
import { prepareAudienceProfileImport } from "./profiles";

const createdAt = Date.parse("2026-11-10T21:00:00Z");
const batchId = "11111111-1111-4111-8111-111111111111";
const secondBatchId = "22222222-2222-4222-8222-222222222222";
const profileId = "33333333-3333-4333-8333-333333333333";
const correlationId = "44444444-4444-4444-8444-444444444444";
const plan = prepareAudienceProfileImport(
  {
    role: "principal",
    licensedStates: ["FL"],
    specializesInSmallCommercial: true,
    agencySmallCommercialSharePercent: 15,
    agencyTotalWrittenPremiumUsd: 1_000_000,
    agentSmallCommercialWrittenPremiumUsd: 60_000,
  },
  "preview:test",
  "liberty-mutual-agent-portal",
  correlationId,
);
const configuration = {
  url: "https://profiles.sitecorecloud.io",
  apiKey: "synthetic-key",
};
const submission = {
  batchId,
  checksumMd5: plan.checksumMd5,
  fileSizeBytes: plan.fileSizeBytes,
};

function stats(id = batchId) {
  return {
    ...submission,
    batchId: id,
    status: "COMPLETED",
    totalRecords: 1,
    succeededRecords: 1,
    failedRecords: 0,
    createdRecords: 0,
    updatedRecords: 1,
  };
}
function result(id = profileId, correlation = correlationId) {
  return (
    JSON.stringify({
      recordIndex: 0,
      id: correlation,
      recordType: "profile",
      outcome: "UPDATED",
      profileId: id,
    }) + "\n"
  );
}
function item(id = batchId, offset = 0) {
  return {
    batchId: id,
    status: "COMPLETED",
    totalRecords: 1,
    createdAt: new Date(createdAt + offset).toISOString(),
  };
}

// Real credentials and transport are never used in these tests.
test("native429 remains a confirmed retryable queue rejection through the upload adapter", async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, "info", (...args: unknown[]) => logs.push(args));
  let calls = 0;
  const importer = createPreviewProfileImporter(
    configuration,
    async (_url, init) => {
      calls++;
      const form = init?.body as FormData;
      assert.equal(form.get("operationType"), "UPSERT");
      assert.equal(form.get("md5"), plan.checksumMd5);
      return new Response("private native response", {
        status: 429,
        headers: { "Retry-After": "37" },
      });
    },
  );
  await assert.rejects(
    importer.submit(plan),
    (error: unknown) =>
      error instanceof PreviewImportQueueBusyError &&
      error.code === "IMPORT_QUEUE_BUSY" &&
      error.retryable &&
      !error.uncertain &&
      error.retryAfterSeconds === 37,
  );
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(logs).includes("private native response"), false);
  assert(logs.some((entry) => String(entry[1]).includes('"status":429')));
});

test("unknown transport outcomes and invalid receipts are never mistaken for a queue rejection", async () => {
  for (const transport of [
    async () => {
      throw new Error("transport lost");
    },
    async () => new Response(null, { status: 500 }),
    async () =>
      Response.json(
        { ...submission, checksumMd5: "0".repeat(32), status: "QUEUED" },
        { status: 202 },
      ),
  ]) {
    let calls = 0;
    const importer = createPreviewProfileImporter(configuration, async () => {
      calls++;
      return transport();
    });
    await assert.rejects(
      importer.submit(plan),
      (error: unknown) =>
        error instanceof AudiencePreviewError &&
        error.code === "IMPORT_UPLOAD_UNCONFIRMED" &&
        error.uncertain &&
        !error.retryable,
    );
    assert.equal(calls, 1);
  }
});

test("read-only reconciliation recovers only an exact checksum, size, record correlation, and UPDATED receipt", async () => {
  const requests: string[] = [];
  const importer = createPreviewProfileImporter(
    configuration,
    async (url, init) => {
      assert.equal(init?.method, "GET");
      const parsed = new URL(String(url));
      requests.push(parsed.pathname);
      if (parsed.pathname === "/v1/batches") {
        assert.equal(parsed.search, "?page=1&pageSize=100");
        return Response.json({
          items: [item()],
          page: 1,
          pageSize: 100,
          totalItems: 1,
        });
      }
      if (parsed.pathname.endsWith("/stats")) return Response.json(stats());
      if (parsed.pathname.endsWith("/results")) return new Response(result());
      throw new Error("Unexpected endpoint");
    },
  );
  assert.deepEqual(await importer.reconcile!(plan, createdAt), {
    status: "verified",
    submission,
    profileId,
  });
  assert.equal(requests.length, 3);
});

test("a checksum mismatch cannot recover a receipt, and a wrong correlation fails closed", async () => {
  for (const mismatch of ["checksum", "correlation"] as const) {
    let resultsRead = false;
    const importer = createPreviewProfileImporter(
      configuration,
      async (url) => {
        const path = new URL(String(url)).pathname;
        if (path === "/v1/batches")
          return Response.json({ items: [item()], page: 1, totalItems: 1 });
        if (path.endsWith("/stats"))
          return Response.json({
            ...stats(),
            ...(mismatch === "checksum" ? { checksumMd5: "0".repeat(32) } : {}),
          });
        resultsRead = true;
        return new Response(result(profileId, batchId));
      },
    );
    assert.deepEqual(await importer.reconcile!(plan, createdAt), {
      status: mismatch === "checksum" ? "unconfirmed" : "failed",
    });
    assert.equal(resultsRead, mismatch === "correlation");
  }
});

test("conflicting exact receipts never select an arbitrary profile", async () => {
  const importer = createPreviewProfileImporter(configuration, async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/batches")
      return Response.json({
        items: [item(), item(secondBatchId, 1000)],
        page: 1,
        totalItems: 2,
      });
    if (path.endsWith("/stats"))
      return Response.json(
        stats(path.includes(secondBatchId) ? secondBatchId : batchId),
      );
    return new Response(
      result(path.includes(secondBatchId) ? secondBatchId : profileId),
    );
  });
  assert.deepEqual(await importer.reconcile!(plan, createdAt), {
    status: "failed",
  });
});

test("an active native batch waits without uploads, and an incomplete lookup is bounded", async () => {
  let calls = 0;
  const busy = createPreviewProfileImporter(
    configuration,
    async (_url, init) => {
      calls++;
      assert.equal(init?.method, "GET");
      return Response.json({
        items: [{ ...item(), status: "RUNNING" }],
        page: 1,
        totalItems: 1,
      });
    },
  );
  assert.deepEqual(await busy.reconcile!(plan, createdAt), {
    status: "pending",
  });
  assert.equal(calls, 1);
  let statisticsReads = 0;
  const bounded = createPreviewProfileImporter(configuration, async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/batches")
      return Response.json({
        items: Array.from({ length: 6 }, (_, index) =>
          item(
            `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
            index,
          ),
        ),
        page: 1,
        pageSize: 100,
        totalItems: 500,
      });
    statisticsReads++;
    return Response.json({ ...stats(), checksumMd5: "0".repeat(32) });
  });
  // This is deliberately "unconfirmed", not a claim that all500 batches were absent.
  assert.deepEqual(await bounded.reconcile!(plan, createdAt), {
    status: "unconfirmed",
  });
  assert.equal(statisticsReads, 3);
});

test("identical UPSERT submissions preserve the original bytes, checksum, correlation, and identifier", async () => {
  const bytes: string[] = [];
  const importer = createPreviewProfileImporter(
    configuration,
    async (_url, init) => {
      const form = init?.body as FormData;
      bytes.push(await (form.get("file") as Blob).text());
      assert.equal(form.get("md5"), plan.checksumMd5);
      assert.equal(form.get("operationType"), "UPSERT");
      return Response.json(
        { ...submission, status: "QUEUED" },
        { status: 202 },
      );
    },
  );
  await importer.submit(plan);
  await importer.submit(plan);
  assert.deepEqual(bytes, [plan.payload, plan.payload]);
  for (const payload of bytes) {
    const record = JSON.parse(payload);
    assert.equal(record.id, correlationId);
    assert.equal(record.identifiers[0].id, plan.identity);
  }
});

test("a delayed fallback receipt remains discoverable around the persisted last upload attempt", async () => {
  const lastAttemptAt = createdAt + 3_600_000;
  const importer = createPreviewProfileImporter(configuration, async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/batches")
      return Response.json({
        items: [item(batchId, 3_600_000)],
        page: 1,
        totalItems: 1,
      });
    if (path.endsWith("/stats")) return Response.json(stats());
    return new Response(result());
  });
  assert.deepEqual(await importer.reconcile!(plan, createdAt, lastAttemptAt), {
    status: "verified",
    submission,
    profileId,
  });
});

test("an earlier uncertain receipt remains discoverable after a later fallback attempt", async () => {
  const firstUncertainAt = createdAt + 3_600_000;
  const laterFallbackAt = createdAt + 7_200_000;
  const importer = createPreviewProfileImporter(configuration, async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/batches")
      return Response.json({
        items: [item(batchId, 3_600_000)],
        page: 1,
        totalItems: 1,
      });
    if (path.endsWith("/stats")) return Response.json(stats());
    return new Response(result());
  });
  assert.deepEqual(
    await importer.reconcile!(
      plan,
      createdAt,
      laterFallbackAt,
      firstUncertainAt,
    ),
    { status: "verified", submission, profileId },
  );
});
