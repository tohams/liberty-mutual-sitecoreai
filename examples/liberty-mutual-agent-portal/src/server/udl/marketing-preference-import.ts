import "server-only";
import { PortalError } from "../errors";
import {
  assertMarketingPreferencePlan,
  type PreferencePlan,
} from "./marketing-preference-plan";

const UUID =
  /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const validUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown, expected: number) =>
  Number.isSafeInteger(value) && value === expected;
export interface PreferenceSubmission {
  batchId: string;
  checksumMd5: string;
  fileSizeBytes: number;
}
export interface PreferenceVerification {
  counts: { CREATED: number; UPDATED: number; FAILED: number };
  profiles: Array<{ identifier: string; profileId: string }>;
}
export interface PreferenceInspectionWindow {
  uploadedAfter: number;
  uploadedBefore: number;
}
export class PreferenceImportError extends Error {
  constructor(
    public readonly code:
      | "UPLOAD_UNCERTAIN"
      | "UPLOAD_REJECTED"
      | "READ_UNAVAILABLE"
      | "VERIFICATION_FAILED",
  ) {
    super(code);
    this.name = "PreferenceImportError";
  }
}
export interface PreferenceTransport {
  assertConfigured(): void;
  submit(
    plan: PreferencePlan,
    operationId: string,
  ): Promise<PreferenceSubmission>;
  inspect(
    plan: PreferencePlan,
    submission: PreferenceSubmission,
    recoveryWindow?: PreferenceInspectionWindow,
  ): Promise<
    | { status: "pending" }
    | { status: "verified"; verification: PreferenceVerification }
  >;
}
function configuration() {
  let url: URL;
  try {
    url = new URL(process.env.SITECORE_PROFILE_IMPORT_URL || "");
  } catch {
    throw new PortalError(
      "CONFIGURATION_REQUIRED",
      "The native preference import is not configured.",
      503,
    );
  }
  const apiKey = process.env.SITECORE_PROFILE_IMPORT_API_KEY;
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".sitecorecloud.io") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443") ||
    !apiKey ||
    apiKey !== apiKey.trim() ||
    /[\r\n]/.test(apiKey) ||
    apiKey.length > 4096
  )
    throw new PortalError(
      "CONFIGURATION_REQUIRED",
      "The native preference import is not configured.",
      503,
    );
  const base = url.href.replace(/\/+$/, "");
  return {
    endpoint: base.endsWith("/v1/batches") ? base : `${base}/v1/batches`,
    apiKey,
  };
}
async function text(response: Response): Promise<string> {
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 65536) {
        await reader.cancel();
        throw new Error("Response too large");
      }
      chunks.push(next.value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } finally {
    reader.releaseLock();
  }
}
function json(value: string): Record<string, unknown> {
  const result: unknown = JSON.parse(value);
  if (!object(result)) throw new Error("Invalid object");
  return result;
}
function metadata(
  value: Record<string, unknown>,
  plan: PreferencePlan,
  batchId?: string,
) {
  return (
    validUuid(value.batchId) &&
    (!batchId || value.batchId.toLowerCase() === batchId) &&
    typeof value.checksumMd5 === "string" &&
    value.checksumMd5.toLowerCase() === plan.checksumMd5 &&
    value.fileSizeBytes === plan.fileSizeBytes
  );
}
function failed(): never {
  throw new PreferenceImportError("VERIFICATION_FAILED");
}

/** Native transport performs one POST, then separate bounded GET-only inspection. */
export const marketingPreferenceTransport: PreferenceTransport = {
  assertConfigured() {
    configuration();
  },
  async submit(plan, operationId) {
    assertMarketingPreferencePlan(plan);
    const config = configuration();
    const form = new FormData();
    form.append(
      "file",
      new Blob([plan.payload], { type: "application/x-ndjson" }),
      `marketing-preferences-${plan.action}-${operationId}.jsonl`,
    );
    form.append("md5", plan.checksumMd5);
    form.append("operationType", "UPSERT");
    let response: Response;
    try {
      response = await fetch(config.endpoint, {
        method: "POST",
        body: form,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `ApiKey ${config.apiKey}`,
          Accept: "application/json",
        },
      });
    } catch {
      throw new PreferenceImportError("UPLOAD_UNCERTAIN");
    }
    if (response.status !== 202) {
      void response.body?.cancel();
      throw new PreferenceImportError(
        [400, 401, 403, 429].includes(response.status)
          ? "UPLOAD_REJECTED"
          : "UPLOAD_UNCERTAIN",
      );
    }
    try {
      const result = json(await text(response));
      if (!metadata(result, plan) || result.status !== "QUEUED")
        throw new Error("Invalid acknowledgement");
      return {
        batchId: String(result.batchId).toLowerCase(),
        checksumMd5: plan.checksumMd5,
        fileSizeBytes: plan.fileSizeBytes,
      };
    } catch {
      throw new PreferenceImportError("UPLOAD_UNCERTAIN");
    }
  },
  async inspect(plan, submission, recoveryWindow) {
    assertMarketingPreferencePlan(plan);
    if (
      !validUuid(submission.batchId) ||
      submission.checksumMd5 !== plan.checksumMd5 ||
      submission.fileSizeBytes !== plan.fileSizeBytes
    )
      failed();
    const config = configuration();
    const get = async (suffix: string) => {
      try {
        const response = await fetch(
          `${config.endpoint}/${submission.batchId}/${suffix}`,
          {
            method: "GET",
            redirect: "error",
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
            headers: {
              Authorization: `ApiKey ${config.apiKey}`,
              Accept: "application/json, application/x-ndjson",
            },
          },
        );
        if (response.status !== 200) {
          void response.body?.cancel();
          throw new Error("Read unavailable");
        }
        return await text(response);
      } catch {
        throw new PreferenceImportError("READ_UNAVAILABLE");
      }
    };
    const status = json(await get("status"));
    if (
      typeof status.batchId !== "string" ||
      status.batchId.toLowerCase() !== submission.batchId
    )
      failed();
    if (status.status === "QUEUED" || status.status === "RUNNING")
      return { status: "pending" };
    const total = plan.profiles.length;
    if (
      status.status !== "COMPLETED" ||
      !count(status.totalRecords, total) ||
      !count(status.succeededRecords, total) ||
      !count(status.failedRecords, 0)
    )
      failed();
    const [statsText, resultText] = await Promise.all([
      get("stats"),
      get("results"),
    ]);
    try {
      const stats = json(statsText);
      // Repeated preference files have the same checksum. Recovery must also
      // reject an older completed batch from before this upload checkpoint.
      const createdAt =
        typeof stats.createdAt === "string"
          ? Date.parse(stats.createdAt)
          : Number.NaN;
      if (
        !metadata(stats, plan, submission.batchId) ||
        (recoveryWindow &&
          (!Number.isFinite(createdAt) ||
            !Number.isFinite(recoveryWindow.uploadedAfter) ||
            !Number.isFinite(recoveryWindow.uploadedBefore) ||
            createdAt < recoveryWindow.uploadedAfter ||
            createdAt > recoveryWindow.uploadedBefore)) ||
        stats.status !== "COMPLETED" ||
        !count(stats.totalRecords, total) ||
        !count(stats.succeededRecords, total) ||
        !count(stats.failedRecords, 0) ||
        !Number.isSafeInteger(stats.createdRecords) ||
        !Number.isSafeInteger(stats.updatedRecords) ||
        (stats.createdRecords as number) < 0 ||
        (stats.updatedRecords as number) < 0 ||
        (stats.createdRecords as number) + (stats.updatedRecords as number) !==
          total
      )
        failed();
      const records = resultText.trimEnd().split(/\r?\n/).map(json);
      if (records.length !== total) failed();
      const indices = new Set<number>(),
        ids = new Set<string>();
      const profiles = records.map((record) => {
        const index = record.recordIndex;
        if (
          typeof index !== "number" ||
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= total ||
          indices.has(index)
        )
          failed();
        indices.add(index);
        const profile = plan.profiles[index];
        if (
          typeof record.id !== "string" ||
          record.id.toLowerCase() !== profile.correlationId ||
          !["profile", "PROFILE"].includes(String(record.recordType)) ||
          !["CREATED", "UPDATED"].includes(String(record.outcome)) ||
          !validUuid(record.profileId) ||
          ids.has(record.profileId.toLowerCase()) ||
          record.errorCode ||
          record.errorDescription
        )
          failed();
        ids.add(record.profileId.toLowerCase());
        return {
          identifier: profile.identifier,
          profileId: record.profileId.toLowerCase(),
        };
      });
      if (
        records.filter((record) => record.outcome === "CREATED").length !==
          stats.createdRecords ||
        records.filter((record) => record.outcome === "UPDATED").length !==
          stats.updatedRecords
      )
        failed();
      return {
        status: "verified",
        verification: {
          profiles,
          counts: {
            CREATED: stats.createdRecords as number,
            UPDATED: stats.updatedRecords as number,
            FAILED: 0,
          },
        },
      };
    } catch (error) {
      if (error instanceof PreferenceImportError) throw error;
      return failed();
    }
  },
};
