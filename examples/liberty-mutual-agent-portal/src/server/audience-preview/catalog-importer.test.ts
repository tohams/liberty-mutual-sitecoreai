import assert from "node:assert/strict";
import test from "node:test";
import { AUDIENCE_PREVIEW_SCENARIOS } from "@/features/audience-preview/scenarios";
import { prepareAudienceProfileImport } from "./profiles";
import { PreviewImportQueueBusyError } from "./importer";
import {
  catalogImportPlan,
  createCatalogImporter,
  verifyCatalogImport,
} from "./catalog-importer";

const uuid = (index: number) =>
  `11111111-1111-4111-8111-${index.toString().padStart(12, "0")}`;
const plan = catalogImportPlan(
  AUDIENCE_PREVIEW_SCENARIOS.map((input, index) =>
    prepareAudienceProfileImport(
      input,
      "catalog:test",
      "liberty-mutual-agent-portal",
      uuid(index),
    ),
  ),
);
const submission = {
  batchId: uuid(100),
  checksumMd5: plan.checksumMd5,
  fileSizeBytes: plan.fileSizeBytes,
};
const stats = {
  ...submission,
  status: "COMPLETED",
  totalRecords: 42,
  succeededRecords: 42,
  failedRecords: 0,
  createdRecords: 32,
  updatedRecords: 10,
};
const rows = plan.plans.map((entry, index) => ({
  recordIndex: index,
  id: entry.correlationId,
  recordType: "PROFILE",
  outcome: index < 32 ? "CREATED" : "UPDATED",
  profileId: uuid(200 + index),
}));

test("aggregate verification requires all42 exact records and accepts native output in arbitrary order", () => {
  const result = verifyCatalogImport(
    plan,
    submission,
    stats,
    [...rows]
      .reverse()
      .map((row) => JSON.stringify(row))
      .join("\n"),
  );
  assert.equal(result.status, "verified");
  if (result.status !== "verified") throw new Error("Expected exact receipt");
  assert.deepEqual(
    result.profileIds,
    rows.map((row) => row.profileId),
  );
  assert.equal(new Set(plan.plans.map((entry) => entry.identity)).size, 42);
});

test("aggregate counts, checksums, correlations, indices and profile uniqueness all fail closed", () => {
  const raw = rows.map((row) => JSON.stringify(row)).join("\n");
  for (const bad of [
    { ...stats, checksumMd5: "0".repeat(32) },
    { ...stats, fileSizeBytes: plan.fileSizeBytes + 1 },
    { ...stats, succeededRecords: 41 },
    { ...stats, createdRecords: 31 },
    { ...stats, status: "COMPLETED_WITH_ERRORS" },
  ])
    assert.equal(
      verifyCatalogImport(plan, submission, bad, raw).status,
      "failed",
    );
  for (const bad of [
    rows.map((row, index) => (index ? row : { ...row, id: uuid(999) })),
    rows.map((row, index) => (index ? row : { ...row, recordIndex: 1 })),
    rows.map((row, index) =>
      index ? row : { ...row, profileId: rows[1].profileId },
    ),
    rows.map((row, index) => (index ? row : { ...row, outcome: "UNCHANGED" })),
    rows.slice(1),
  ])
    assert.equal(
      verifyCatalogImport(
        plan,
        submission,
        stats,
        bad.map((row) => JSON.stringify(row)).join("\n"),
      ).status,
      "failed",
    );
});

test("bulk upload remains one native UPSERT with only a confirmed429 treated as queue rejection", async () => {
  let calls = 0;
  const importer = createCatalogImporter(
    { url: "https://profiles.sitecorecloud.io", apiKey: "synthetic-key" },
    async (_url, init) => {
      calls++;
      assert.equal(init?.method, "POST");
      const form = init.body as FormData;
      assert.equal(form.get("operationType"), "UPSERT");
      assert.equal(form.get("md5"), plan.checksumMd5);
      assert.equal(await (form.get("file") as Blob).text(), plan.payload);
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": "19" },
      });
    },
  );
  await assert.rejects(
    importer.submit(plan),
    (error: unknown) =>
      error instanceof PreviewImportQueueBusyError &&
      error.retryAfterSeconds === 19 &&
      !error.uncertain,
  );
  assert.equal(calls, 1);
});
