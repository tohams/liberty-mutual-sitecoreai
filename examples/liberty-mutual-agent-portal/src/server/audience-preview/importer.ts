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
import { recordAudiencePreviewStage } from "./telemetry";

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
export type PreviewImportReconciliation =
  | { status: "pending" }
  | { status: "unconfirmed" }
  | { status: "failed" }
  | {
      status: "verified";
      submission: PreviewImportSubmission;
      profileId: string;
    };

/** A native429 confirms rejection before acceptance, so the same plan may wait and retry. */
export class PreviewImportQueueBusyError extends AudiencePreviewError {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      "IMPORT_QUEUE_BUSY",
      "Another audience is being prepared. Your preview will continue automatically.",
      true,
      false,
    );
  }
}

function retryAfter(response: Response): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = /^\d+$/.test(header)
      ? Number(header)
      : Math.ceil((Date.parse(header) - Date.now()) / 1000);
    if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 3600)
      return Math.max(3, seconds);
  }
  return 10;
}

export interface PreviewProfileImporter {
  submit(plan: PreviewImportPlan): Promise<PreviewImportSubmission>;
  reconcile?(
    plan: PreviewImportPlan,
    createdAt: number,
    lastAttemptAt?: number,
    firstUncertainAttemptAt?: number,
  ): Promise<PreviewImportReconciliation>;
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

function completedImport(
  plan: PreviewImportPlan,
  submission: PreviewImportSubmission,
  stats: Record<string, unknown>,
  raw: string,
): PreviewImportInspection {
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
}

/** One-record native import adapter; retries are controlled by the durable caller. */
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
  const request = async (
    suffix: string,
    form?: FormData,
    deadline?: AbortSignal,
  ) => {
    const upload = form !== undefined;
    try {
      const response = await transport(endpoint + suffix, {
        method: upload ? "POST" : "GET",
        body: form,
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
        signal: deadline
          ? AbortSignal.any([AbortSignal.timeout(8_000), deadline])
          : AbortSignal.timeout(8_000),
        headers: {
          Authorization: `ApiKey ${configuration.apiKey}`,
          Accept: "application/json, application/x-ndjson",
        },
      });
      if (upload) {
        recordAudiencePreviewStage(
          "profile-import",
          response.status === 202
            ? "accepted"
            : response.status === 429
              ? "pending"
              : "unconfirmed",
          {
            status: response.status,
            ...(response.status === 429 ? { code: "IMPORT_QUEUE_BUSY" } : {}),
          },
        );
      }
      if (upload && response.status === 429) {
        void response.body?.cancel().catch(() => undefined);
        throw new PreviewImportQueueBusyError(retryAfter(response));
      }
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
      if (upload)
        recordAudiencePreviewStage("profile-import", "unconfirmed", {
          code: "IMPORT_TRANSPORT_UNCONFIRMED",
        });
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
      form.append("operationType", "UPSERT");
      try {
        const response = await request("", form);
        const acknowledgement = await responseObject(response).catch(
          (error: unknown) => {
            recordAudiencePreviewStage("profile-import", "unconfirmed", {
              code: "IMPORT_ACKNOWLEDGEMENT_INVALID",
              reason: "invalid-body",
            });
            throw error;
          },
        );
        if (
          !metadata(acknowledgement, plan) ||
          acknowledgement.status !== "QUEUED"
        ) {
          recordAudiencePreviewStage("profile-import", "unconfirmed", {
            code: "IMPORT_ACKNOWLEDGEMENT_INVALID",
            reason:
              typeof acknowledgement.batchId !== "string" ||
              !UUID.test(acknowledgement.batchId)
                ? "invalid-batch-id"
                : typeof acknowledgement.checksumMd5 !== "string" ||
                    acknowledgement.checksumMd5.toLowerCase() !==
                      plan.checksumMd5
                  ? "checksum-mismatch"
                  : acknowledgement.fileSizeBytes !== plan.fileSizeBytes
                    ? "file-size-mismatch"
                    : "unexpected-status",
          });
          throw new Error("Invalid acknowledgement");
        }
        return {
          batchId: String(acknowledgement.batchId).toLowerCase(),
          checksumMd5: plan.checksumMd5,
          fileSizeBytes: plan.fileSizeBytes,
        };
      } catch (error) {
        if (error instanceof PreviewImportQueueBusyError) throw error;
        throw new AudiencePreviewError(
          "IMPORT_UPLOAD_UNCONFIRMED",
          "The preview profile upload could not be confirmed. It will not be submitted again automatically.",
          false,
          true,
        );
      }
    },
    async reconcile(plan, createdAt, lastAttemptAt, firstUncertainAttemptAt) {
      assertPlan(plan);
      const deadline = AbortSignal.timeout(18_000);
      const read = (suffix: string) => request(suffix, undefined, deadline);
      const listed = await responseObject(await read("?page=1&pageSize=100"));
      if (
        !Array.isArray(listed.items) ||
        listed.items.length > 100 ||
        listed.page !== 1 ||
        !Number.isSafeInteger(listed.totalItems) ||
        Number(listed.totalItems) < listed.items.length ||
        listed.items.some(
          (item: unknown) =>
            !isObject(item) ||
            typeof item.batchId !== "string" ||
            !UUID.test(item.batchId),
        )
      ) {
        throw new AudiencePreviewError(
          "IMPORT_READ_UNAVAILABLE",
          "The audience preparation is still being checked.",
          true,
        );
      }
      const items = listed.items as Array<Record<string, unknown>>;
      if (
        items.some(
          (item) => item.status === "QUEUED" || item.status === "RUNNING",
        )
      )
        return { status: "pending" };
      // The list is not ordered by contract. This bounded search can recover an exact
      // receipt; absence is never treated as proof that an earlier upload was rejected.
      const attemptTimes = [
        createdAt,
        lastAttemptAt,
        firstUncertainAttemptAt,
      ].filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );
      const distance = (value: unknown) => {
        const uploadedAt = typeof value === "string" ? Date.parse(value) : NaN;
        return Number.isFinite(uploadedAt)
          ? Math.min(
              ...attemptTimes.map((attempt) => Math.abs(uploadedAt - attempt)),
            )
          : Infinity;
      };
      const candidates = items
        .filter((item) => {
          return (
            item.totalRecords === 1 &&
            item.status === "COMPLETED" &&
            distance(item.createdAt) <= 120_000
          );
        })
        .sort(
          (left, right) => distance(left.createdAt) - distance(right.createdAt),
        )
        .slice(0, 3);
      const statistics = await Promise.all(
        candidates.map(async (item) => ({
          batchId: String(item.batchId).toLowerCase(),
          stats: await responseObject(await read(`/${item.batchId}/stats`)),
        })),
      );
      const matches = statistics.filter((entry) =>
        metadata(entry.stats, plan, entry.batchId),
      );
      if (matches.length) {
        const outcomes = await Promise.all(
          matches.map(async (entry) => {
            const submission = {
              batchId: entry.batchId,
              checksumMd5: plan.checksumMd5,
              fileSizeBytes: plan.fileSizeBytes,
            };
            const result = completedImport(
              plan,
              submission,
              entry.stats,
              await responseText(await read(`/${entry.batchId}/results`)),
            );
            return { submission, result };
          }),
        );
        if (outcomes.some((entry) => entry.result.status !== "verified"))
          return { status: "failed" };
        const profileIds = outcomes.map((entry) =>
          entry.result.status === "verified" ? entry.result.profileId : "",
        );
        if (new Set(profileIds).size !== 1) return { status: "failed" };
        return {
          status: "verified",
          submission: outcomes[0].submission,
          profileId: profileIds[0],
        };
      }
      return { status: "unconfirmed" };
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
      return completedImport(plan, submission, stats, raw);
    },
  };
}
