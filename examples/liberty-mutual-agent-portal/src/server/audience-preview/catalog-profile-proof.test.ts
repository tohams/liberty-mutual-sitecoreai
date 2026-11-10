import assert from "node:assert/strict";
import test from "node:test";
import { AUDIENCE_PREVIEW_SCENARIOS } from "@/features/audience-preview/scenarios";
import {
  prepareAudienceProfileImport,
  type AudienceProfileJob,
} from "./profiles";
import {
  catalogImportPlan,
  verifyCatalogImport,
  type CatalogImporter,
} from "./catalog-importer";
import { createCatalogProfileProofVerifier } from "./catalog-profile-proof";

const uuid = (index: number) =>
  `11111111-1111-4111-8111-${index.toString().padStart(12, "0")}`;
function fixture() {
  const plans = [0, 23].map((index) =>
    prepareAudienceProfileImport(
      AUDIENCE_PREVIEW_SCENARIOS[index],
      "catalog:test",
      "liberty-mutual-agent-portal",
      uuid(index + 1),
    ),
  );
  const importPlan = catalogImportPlan(plans);
  const submission = {
    batchId: uuid(900),
    checksumMd5: importPlan.checksumMd5,
    fileSizeBytes: importPlan.fileSizeBytes,
  };
  const manifest = {
    id: uuid(901),
    rows: [
      {
        index: 0,
        selectorHash: plans[0].selectorHash,
        source: "bulk" as const,
        plan: plans[0],
      },
      { index: 5, selectorHash: "existing", source: "existing" as const },
      {
        index: 23,
        selectorHash: plans[1].selectorHash,
        source: "bulk" as const,
        plan: plans[1],
      },
    ],
    importPlan,
    submission,
    importedProfileIds: [uuid(100), uuid(101)],
  };
  const jobs: AudienceProfileJob[] = plans.map((plan, index) => ({
    schemaVersion: 1,
    phase: "failed",
    code: "PROFILE_LINK_TIMEOUT",
    plan,
    createdAt: 1,
    profileId: uuid(100 + index),
    browserId: uuid(500 + index),
    identitySent: false,
    catalogId: manifest.id,
    catalogProof: { ...submission, recordIndex: index },
  }));
  const stats = {
    ...submission,
    status: "COMPLETED",
    totalRecords: 2,
    succeededRecords: 2,
    failedRecords: 0,
    createdRecords: 2,
    updatedRecords: 0,
  };
  const records = plans.map((plan, index) => ({
    recordIndex: index,
    id: plan.correlationId,
    recordType: "PROFILE",
    outcome: "CREATED",
    profileId: uuid(100 + index),
  }));
  let reads = 0;
  const importer: CatalogImporter = {
    submit: async () => {
      throw new Error("Receipt repair must never upload.");
    },
    reconcile: async () => {
      throw new Error("Known aggregate receipts must not search history.");
    },
    inspect: async (plan, receipt) => {
      reads++;
      assert.deepEqual(plan, importPlan);
      assert.deepEqual(receipt, submission);
      return verifyCatalogImport(
        plan,
        receipt,
        stats,
        records.map((record) => JSON.stringify(record)).join("\n"),
      );
    },
  };
  return { manifest, jobs, stats, records, importer, reads: () => reads };
}

test("bulk recovery verifies the complete current receipt once and uses imported-subset recordIndex", async () => {
  const run = fixture();
  const verify = createCatalogProfileProofVerifier(
    run.manifest,
    () => run.importer,
  );
  assert.deepEqual(await Promise.all(run.jobs.map(verify)), [true, true]);
  assert.equal(run.reads(), 1);
  assert.equal(run.manifest.rows[2].index, 23);
  assert.equal(run.jobs[1].catalogProof?.recordIndex, 1);
});

test("retained bulk proof must match the exact manifest, aggregate bytes, correlation and target before native reads", async () => {
  for (const change of [
    "index",
    "batch",
    "checksum",
    "size",
    "catalog",
    "correlation",
    "target",
    "payload",
  ] as const) {
    const run = fixture();
    const job = run.jobs[1];
    if (change === "index") job.catalogProof!.recordIndex = 23;
    if (change === "batch") job.catalogProof!.batchId = uuid(800);
    if (change === "checksum") job.catalogProof!.checksumMd5 = "0".repeat(32);
    if (change === "size") job.catalogProof!.fileSizeBytes++;
    if (change === "catalog") job.catalogId = uuid(800);
    if (change === "correlation")
      job.plan = { ...job.plan, correlationId: uuid(800) };
    if (change === "target") job.profileId = uuid(800);
    if (change === "payload")
      run.manifest.importPlan = {
        ...run.manifest.importPlan,
        payload: "altered",
      };
    assert.equal(
      await createCatalogProfileProofVerifier(
        run.manifest,
        () => run.importer,
      )(job),
      false,
      change,
    );
    assert.equal(run.reads(), 0, change);
  }
});

test("current native aggregate corruption, changed target, pending or unavailable proof stays closed", async () => {
  for (const change of [
    "correlation",
    "index",
    "counts",
    "checksum",
    "target",
    "pending",
    "unavailable",
  ] as const) {
    const run = fixture();
    if (change === "correlation") run.records[1].id = uuid(800);
    if (change === "index") run.records[1].recordIndex = 0;
    if (change === "counts") run.stats.succeededRecords = 1;
    if (change === "checksum") run.stats.checksumMd5 = "0".repeat(32);
    if (change === "target") run.records[1].profileId = uuid(800);
    if (change === "pending")
      run.importer.inspect = async () => ({ status: "pending" });
    if (change === "unavailable")
      run.importer.inspect = async () => {
        throw new Error("private-native-error");
      };
    assert.equal(
      await createCatalogProfileProofVerifier(
        run.manifest,
        () => run.importer,
      )(run.jobs[1]),
      false,
      change,
    );
  }
});
