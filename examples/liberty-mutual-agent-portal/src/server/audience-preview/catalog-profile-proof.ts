import "server-only";
import type { AudienceProfileJob } from "./profiles";
import type { PreviewImportPlan } from "./importer";
import {
  catalogImportPlan,
  type CatalogImporter,
  type CatalogImportPlan,
  type CatalogImportSubmission,
} from "./catalog-importer";
import { UUID } from "./contracts";

interface RetainedCatalogManifest {
  id: string;
  rows: {
    index: number;
    selectorHash: string;
    source: "existing" | "bulk";
    plan?: PreviewImportPlan;
  }[];
  importPlan?: CatalogImportPlan;
  submission?: CatalogImportSubmission;
  importedProfileIds?: string[];
}

function samePlan(left: PreviewImportPlan, right: PreviewImportPlan): boolean {
  return (
    left.selectorHash === right.selectorHash &&
    left.identity === right.identity &&
    left.correlationId === right.correlationId &&
    left.payload === right.payload &&
    left.checksumMd5 === right.checksumMd5 &&
    left.fileSizeBytes === right.fileSizeBytes
  );
}

/** Current native proof is shared only within this one bounded catalog-worker call. */
export function createCatalogProfileProofVerifier(
  manifest: RetainedCatalogManifest,
  importer: () => CatalogImporter,
): (job: AudienceProfileJob) => Promise<boolean> {
  let inspection: ReturnType<CatalogImporter["inspect"]> | undefined;
  return async (job) => {
    try {
      const proof = job.catalogProof;
      const submission = manifest.submission;
      const retained = manifest.importPlan;
      const rows = manifest.rows.filter((row) => row.source === "bulk");
      const index = rows.findIndex(
        (row) => row.selectorHash === job.plan.selectorHash,
      );
      if (
        !proof ||
        !submission ||
        !retained ||
        job.catalogId !== manifest.id ||
        index < 0 ||
        proof.recordIndex !== index ||
        !Number.isInteger(proof.recordIndex) ||
        !UUID.test(proof.batchId) ||
        proof.batchId !== submission.batchId ||
        proof.checksumMd5 !== submission.checksumMd5 ||
        proof.fileSizeBytes !== submission.fileSizeBytes ||
        !job.profileId ||
        !UUID.test(job.profileId) ||
        !rows[index].plan ||
        !samePlan(rows[index].plan, job.plan) ||
        manifest.importedProfileIds?.[index]?.toLowerCase() !==
          job.profileId.toLowerCase() ||
        rows.some((row) => !row.plan)
      )
        return false;
      const rebuilt = catalogImportPlan(rows.map((row) => row.plan!));
      if (
        retained.payload !== rebuilt.payload ||
        retained.checksumMd5 !== rebuilt.checksumMd5 ||
        retained.fileSizeBytes !== rebuilt.fileSizeBytes ||
        retained.plans.length !== rebuilt.plans.length ||
        retained.plans.some(
          (plan, recordIndex) => !samePlan(plan, rebuilt.plans[recordIndex]),
        ) ||
        proof.checksumMd5 !== rebuilt.checksumMd5 ||
        proof.fileSizeBytes !== rebuilt.fileSizeBytes
      )
        return false;
      const result = await (inspection ??= importer().inspect(
        rebuilt,
        submission,
      ));
      return (
        result.status === "verified" &&
        result.submission.batchId === submission.batchId &&
        result.submission.checksumMd5 === submission.checksumMd5 &&
        result.submission.fileSizeBytes === submission.fileSizeBytes &&
        result.profileIds.length === rows.length &&
        manifest.importedProfileIds?.length === rows.length &&
        result.profileIds.every(
          (id, recordIndex) =>
            UUID.test(id) &&
            id.toLowerCase() ===
              manifest.importedProfileIds![recordIndex].toLowerCase(),
        ) &&
        new Set(result.profileIds.map((id) => id.toLowerCase())).size ===
          rows.length &&
        result.profileIds[index].toLowerCase() === job.profileId.toLowerCase()
      );
    } catch {
      return false;
    }
  };
}
