import "server-only";
import { createHash } from "node:crypto";
import {
  AudiencePreviewError,
  HASH,
  isObject,
  PREVIEW_IDENTITY_PREFIX,
  responseObject,
  responseText,
  UUID,
} from "./contracts";

export interface PreviewImportPlan {
  selectorHash: string;
  identity: string;
  correlationId: string;
  payload: string;
  checksumMd5: string;
  fileSizeBytes: number;
}
export interface PreviewImportSubmission {
  batchId: string;
  checksumMd5: string;
  fileSizeBytes: number;
}
export type PreviewImportInspection =
  | { status: "pending" }
  | { status: "verified"; profileId: string }
  | { status: "failed" };
export interface PreviewProfileImporter {
  submit(plan: PreviewImportPlan): Promise<PreviewImportSubmission>;
  inspect(
    plan: PreviewImportPlan,
    submission: PreviewImportSubmission,
  ): Promise<PreviewImportInspection>;
}

function assertPlan(plan: PreviewImportPlan) {
  if (
    !HASH.test(plan.selectorHash) ||
    plan.identity !== PREVIEW_IDENTITY_PREFIX + plan.selectorHash ||
    !UUID.test(plan.correlationId) ||
    Buffer.byteLength(plan.payload, "utf8") !== plan.fileSizeBytes ||
    plan.fileSizeBytes > 16_384 ||
    createHash("md5").update(plan.payload).digest("hex") !== plan.checksumMd5
  )
    invalid();
  let record: unknown;
  try {
    record = JSON.parse(plan.payload);
  } catch {
    return invalid();
  }
  if (
    !isObject(record) ||
    record.id !== plan.correlationId ||
    record.recordType !== "profile" ||
    !Array.isArray(record.identifiers) ||
    record.identifiers.length !== 1 ||
    !isObject(record.identifiers[0]) ||
    record.identifiers[0].provider !== "liberty-mutual-agent" ||
    record.identifiers[0].id !== plan.identity ||
    !isObject(record.extensions) ||
    record.extensions.previewOnly !== true ||
    record.extensions.previewSelectorHash !== plan.selectorHash
  )
    invalid();
}
function invalid(): never {
  throw new AudiencePreviewError(
    "INVALID_IMPORT_PLAN",
    "The audience preview import is invalid.",
  );
}
function metadata(
  value: Record<string, unknown>,
  plan: PreviewImportPlan,
  batchId?: string,
) {
  return (
    typeof value.batchId === "string" &&
    UUID.test(value.batchId) &&
    (!batchId || value.batchId.toLowerCase() === batchId.toLowerCase()) &&
    typeof value.checksumMd5 === "string" &&
    value.checksumMd5.toLowerCase() === plan.checksumMd5 &&
    value.fileSizeBytes === plan.fileSizeBytes
  );
}

/** One-record import adapter; no retry or background work is hidden inside an HTTP request. */
export function createPreviewProfileImporter(
  configuration: { url: string; apiKey: string } = {
    url: process.env.SITECORE_PROFILE_IMPORT_URL || "",
    apiKey: process.env.SITECORE_PROFILE_IMPORT_API_KEY || "",
  },
  transport: typeof fetch = fetch,
): PreviewProfileImporter {
  let base: URL;
  try {
    base = new URL(configuration.url);
  } catch {
    throw new AudiencePreviewError(
      "IMPORT_NOT_CONFIGURED",
      "Native profile import is not configured.",
    );
  }
  if (
    base.protocol !== "https:" ||
    !base.hostname.endsWith(".sitecorecloud.io") ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.port && base.port !== "443") ||
    !configuration.apiKey ||
    configuration.apiKey.trim() !== configuration.apiKey ||
    /[\r\n]/.test(configuration.apiKey) ||
    configuration.apiKey.length > 4096
  )
    throw new AudiencePreviewError(
      "IMPORT_NOT_CONFIGURED",
      "Native profile import is not configured.",
    );
  const endpoint = base.href
    .replace(/\/+$/, "")
    .replace(/(?:\/v1\/batches)?$/, "/v1/batches");
  const request = async (suffix: string, form?: FormData) => {
    const upload = form !== undefined;
    try {
      const response = await transport(endpoint + suffix, {
        method: upload ? "POST" : "GET",
        body: form,
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
        signal: AbortSignal.timeout(8_000),
        headers: {
          Authorization: `ApiKey ${configuration.apiKey}`,
          Accept: "application/json, application/x-ndjson",
        },
      });
      if (response.status !== (upload ? 202 : 200)) {
        void response.body?.cancel().catch(() => undefined);
        throw new AudiencePreviewError(
          upload ? "IMPORT_UPLOAD_UNCONFIRMED" : "IMPORT_READ_UNAVAILABLE",
          upload
            ? "The preview profile upload could not be confirmed."
            : "The preview profile is still being prepared.",
          !upload,
          upload,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof AudiencePreviewError) throw error;
      throw new AudiencePreviewError(
        upload ? "IMPORT_UPLOAD_UNCONFIRMED" : "IMPORT_READ_UNAVAILABLE",
        upload
          ? "The preview profile upload could not be confirmed."
          : "The preview profile is still being prepared.",
        !upload,
        upload,
      );
    }
  };
  return {
    async submit(plan) {
      assertPlan(plan);
      const form = new FormData();
      form.append(
        "file",
        new Blob([plan.payload], { type: "application/x-ndjson" }),
        "audience-preview.jsonl",
      );
      form.append("md5", plan.checksumMd5);
      try {
        const acknowledgement = await responseObject(await request("", form));
        if (
          !metadata(acknowledgement, plan) ||
          acknowledgement.status !== "QUEUED"
        )
          throw new Error("Invalid acknowledgement");
        return {
          batchId: String(acknowledgement.batchId).toLowerCase(),
          checksumMd5: plan.checksumMd5,
          fileSizeBytes: plan.fileSizeBytes,
        };
      } catch {
        throw new AudiencePreviewError(
          "IMPORT_UPLOAD_UNCONFIRMED",
          "The preview profile upload could not be confirmed. It will not be submitted again automatically.",
          false,
          true,
        );
      }
    },
    async inspect(plan, submission) {
      assertPlan(plan);
      if (!metadata(submission as unknown as Record<string, unknown>, plan))
        invalid();
      const status = await responseObject(
        await request(`/${submission.batchId}/status`),
      );
      if (
        typeof status.batchId !== "string" ||
        status.batchId.toLowerCase() !== submission.batchId
      )
        return { status: "failed" };
      if (status.status === "QUEUED" || status.status === "RUNNING")
        return { status: "pending" };
      if (
        status.status !== "COMPLETED" ||
        status.totalRecords !== 1 ||
        status.succeededRecords !== 1 ||
        status.failedRecords !== 0
      )
        return { status: "failed" };
      const [stats, raw] = await Promise.all([
        request(`/${submission.batchId}/stats`).then(responseObject),
        request(`/${submission.batchId}/results`).then(responseText),
      ]);
      if (
        !metadata(stats, plan, submission.batchId) ||
        stats.status !== "COMPLETED" ||
        stats.totalRecords !== 1 ||
        stats.succeededRecords !== 1 ||
        stats.failedRecords !== 0 ||
        !Number.isSafeInteger(stats.createdRecords) ||
        !Number.isSafeInteger(stats.updatedRecords) ||
        Number(stats.createdRecords) + Number(stats.updatedRecords) !== 1 ||
        Number(stats.createdRecords) < 0 ||
        Number(stats.updatedRecords) < 0
      )
        return { status: "failed" };
      const lines = raw.trim().split(/\r?\n/);
      if (lines.length !== 1) return { status: "failed" };
      let result: unknown;
      try {
        result = JSON.parse(lines[0]);
      } catch {
        return { status: "failed" };
      }
      if (
        !isObject(result) ||
        result.recordIndex !== 0 ||
        typeof result.id !== "string" ||
        result.id.toLowerCase() !== plan.correlationId ||
        (result.recordType !== "profile" && result.recordType !== "PROFILE") ||
        !["CREATED", "UPDATED"].includes(String(result.outcome)) ||
        typeof result.profileId !== "string" ||
        !UUID.test(result.profileId) ||
        stats.createdRecords !== (result.outcome === "CREATED" ? 1 : 0) ||
        stats.updatedRecords !== (result.outcome === "UPDATED" ? 1 : 0)
      )
        return { status: "failed" };
      return { status: "verified", profileId: result.profileId.toLowerCase() };
    },
  };
}
