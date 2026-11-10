import "server-only";
import { createHash } from "node:crypto";
import {
  AudiencePreviewError,
  isObject,
  responseObject,
  responseText,
  UUID,
} from "./contracts";
import {
  PreviewImportQueueBusyError,
  type PreviewImportPlan,
} from "./importer";
import { recordAudiencePreviewStage } from "./telemetry";

export interface CatalogImportPlan {
  plans: PreviewImportPlan[];
  payload: string;
  checksumMd5: string;
  fileSizeBytes: number;
}
export interface CatalogImportSubmission {
  batchId: string;
  checksumMd5: string;
  fileSizeBytes: number;
}
export type CatalogImportInspection =
  | { status: "pending" | "unconfirmed" | "failed" }
  | {
      status: "verified";
      submission: CatalogImportSubmission;
      profileIds: string[];
    };
export interface CatalogImporter {
  submit(plan: CatalogImportPlan): Promise<CatalogImportSubmission>;
  inspect(
    plan: CatalogImportPlan,
    submission: CatalogImportSubmission,
  ): Promise<CatalogImportInspection>;
  reconcile(
    plan: CatalogImportPlan,
    attemptTimes: number[],
  ): Promise<CatalogImportInspection>;
}

export function catalogImportPlan(
  plans: PreviewImportPlan[],
): CatalogImportPlan {
  if (
    !plans.length ||
    plans.length > 42 ||
    new Set(plans.map((plan) => plan.correlationId)).size !== plans.length ||
    new Set(plans.map((plan) => plan.identity)).size !== plans.length
  )
    throw new AudiencePreviewError(
      "INVALID_IMPORT_PLAN",
      "The audience preparation plan is invalid.",
    );
  for (const plan of plans) {
    if (
      !UUID.test(plan.correlationId) ||
      Buffer.byteLength(plan.payload) !== plan.fileSizeBytes ||
      createHash("md5").update(plan.payload).digest("hex") !== plan.checksumMd5
    )
      throw new AudiencePreviewError(
        "INVALID_IMPORT_PLAN",
        "The audience preparation plan is invalid.",
      );
  }
  const payload = plans.map((plan) => plan.payload).join("");
  return {
    plans,
    payload,
    checksumMd5: createHash("md5").update(payload).digest("hex"),
    fileSizeBytes: Buffer.byteLength(payload),
  };
}

function metadata(
  value: Record<string, unknown>,
  plan: CatalogImportPlan,
  batchId?: string,
): boolean {
  return (
    typeof value.batchId === "string" &&
    UUID.test(value.batchId) &&
    (!batchId || value.batchId.toLowerCase() === batchId.toLowerCase()) &&
    typeof value.checksumMd5 === "string" &&
    value.checksumMd5.toLowerCase() === plan.checksumMd5 &&
    value.fileSizeBytes === plan.fileSizeBytes
  );
}

/** Aggregate metadata and every original record correlation are independently verified. */
export function verifyCatalogImport(
  plan: CatalogImportPlan,
  submission: CatalogImportSubmission,
  stats: Record<string, unknown>,
  raw: string,
): CatalogImportInspection {
  const count = plan.plans.length;
  if (
    !metadata(submission as unknown as Record<string, unknown>, plan) ||
    !metadata(stats, plan, submission.batchId) ||
    stats.status !== "COMPLETED" ||
    stats.totalRecords !== count ||
    stats.succeededRecords !== count ||
    stats.failedRecords !== 0 ||
    !Number.isSafeInteger(stats.createdRecords) ||
    !Number.isSafeInteger(stats.updatedRecords) ||
    Number(stats.createdRecords) < 0 ||
    Number(stats.updatedRecords) < 0 ||
    Number(stats.createdRecords) + Number(stats.updatedRecords) !== count
  )
    return { status: "failed" };
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length !== count) return { status: "failed" };
  const profileIds: string[] = new Array(count);
  let created = 0,
    updated = 0;
  try {
    for (const line of lines) {
      const row: unknown = JSON.parse(line);
      if (
        !isObject(row) ||
        !Number.isInteger(row.recordIndex) ||
        Number(row.recordIndex) < 0 ||
        Number(row.recordIndex) >= count
      )
        return { status: "failed" };
      const index = Number(row.recordIndex);
      if (
        profileIds[index] ||
        typeof row.id !== "string" ||
        row.id.toLowerCase() !== plan.plans[index].correlationId ||
        typeof row.recordType !== "string" ||
        row.recordType.toLowerCase() !== "profile" ||
        !["CREATED", "UPDATED"].includes(String(row.outcome)) ||
        typeof row.profileId !== "string" ||
        !UUID.test(row.profileId)
      )
        return { status: "failed" };
      profileIds[index] = row.profileId.toLowerCase();
      if (row.outcome === "CREATED") created++;
      else updated++;
    }
  } catch {
    return { status: "failed" };
  }
  if (
    new Set(profileIds).size !== count ||
    created !== stats.createdRecords ||
    updated !== stats.updatedRecords
  )
    return { status: "failed" };
  return { status: "verified", submission, profileIds };
}

export function createCatalogImporter(
  configuration = {
    url: process.env.SITECORE_PROFILE_IMPORT_URL || "",
    apiKey: process.env.SITECORE_PROFILE_IMPORT_API_KEY || "",
  },
  transport: typeof fetch = fetch,
): CatalogImporter {
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
    configuration.apiKey.length > 4096 ||
    configuration.apiKey.trim() !== configuration.apiKey ||
    /[\r\n]/.test(configuration.apiKey)
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
    try {
      const response = await transport(endpoint + suffix, {
        method: form ? "POST" : "GET",
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
      if (form)
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
      if (form && response.status === 429) {
        void response.body?.cancel().catch(() => undefined);
        const seconds = Number(response.headers.get("retry-after"));
        throw new PreviewImportQueueBusyError(
          Number.isFinite(seconds) && seconds >= 3 && seconds <= 3600
            ? seconds
            : 10,
        );
      }
      if (response.status !== (form ? 202 : 200)) {
        void response.body?.cancel().catch(() => undefined);
        throw new AudiencePreviewError(
          form ? "IMPORT_UPLOAD_UNCONFIRMED" : "IMPORT_READ_UNAVAILABLE",
          "Audience preparation could not be confirmed.",
          !form,
          Boolean(form),
        );
      }
      return response;
    } catch (error) {
      if (error instanceof AudiencePreviewError) throw error;
      if (form)
        recordAudiencePreviewStage("profile-import", "unconfirmed", {
          code: "IMPORT_TRANSPORT_UNCONFIRMED",
        });
      throw new AudiencePreviewError(
        form ? "IMPORT_UPLOAD_UNCONFIRMED" : "IMPORT_READ_UNAVAILABLE",
        "Audience preparation could not be confirmed.",
        !form,
        Boolean(form),
      );
    }
  };
  return {
    async submit(plan) {
      const form = new FormData();
      form.append(
        "file",
        new Blob([plan.payload], { type: "application/x-ndjson" }),
        "audience-catalog.jsonl",
      );
      form.append("md5", plan.checksumMd5);
      form.append("operationType", "UPSERT");
      try {
        const value = await responseObject(await request("", form));
        if (!metadata(value, plan) || value.status !== "QUEUED")
          throw new AudiencePreviewError(
            "IMPORT_ACKNOWLEDGEMENT_INVALID",
            "The aggregate import receipt could not be verified.",
          );
        return {
          batchId: String(value.batchId).toLowerCase(),
          checksumMd5: plan.checksumMd5,
          fileSizeBytes: plan.fileSizeBytes,
        };
      } catch (error) {
        if (error instanceof PreviewImportQueueBusyError) throw error;
        if (
          error instanceof AudiencePreviewError &&
          [
            "IMPORT_ACKNOWLEDGEMENT_INVALID",
            "INVALID_NATIVE_RESPONSE",
          ].includes(error.code)
        )
          recordAudiencePreviewStage("profile-import", "unconfirmed", {
            code: "IMPORT_ACKNOWLEDGEMENT_INVALID",
          });
        throw new AudiencePreviewError(
          "IMPORT_UPLOAD_UNCONFIRMED",
          "The audience import receipt could not be confirmed.",
          false,
          true,
        );
      }
    },
    async inspect(plan, submission) {
      const deadline = AbortSignal.timeout(18_000);
      const status = await responseObject(
        await request(`/${submission.batchId}/status`, undefined, deadline),
      );
      if (
        typeof status.batchId !== "string" ||
        status.batchId.toLowerCase() !== submission.batchId
      )
        return { status: "failed" };
      if (["QUEUED", "RUNNING"].includes(String(status.status)))
        return { status: "pending" };
      const [stats, results] = await Promise.all([
        request(`/${submission.batchId}/stats`, undefined, deadline).then(
          responseObject,
        ),
        request(`/${submission.batchId}/results`, undefined, deadline).then(
          responseText,
        ),
      ]);
      return verifyCatalogImport(plan, submission, stats, results);
    },
    async reconcile(plan, attemptTimes) {
      const deadline = AbortSignal.timeout(18_000);
      const listed = await responseObject(
        await request("?page=1&pageSize=100", undefined, deadline),
      );
      if (
        !Array.isArray(listed.items) ||
        listed.items.length > 100 ||
        listed.page !== 1 ||
        !Number.isSafeInteger(listed.totalItems)
      )
        throw new AudiencePreviewError(
          "IMPORT_READ_UNAVAILABLE",
          "Audience import history is not available.",
          true,
        );
      if (
        listed.items.some(
          (item) =>
            isObject(item) &&
            ["QUEUED", "RUNNING"].includes(String(item.status)),
        )
      )
        return { status: "pending" };
      const candidates = listed.items
        .filter(
          (item): item is Record<string, unknown> =>
            isObject(item) &&
            typeof item.batchId === "string" &&
            UUID.test(item.batchId) &&
            item.status === "COMPLETED" &&
            item.totalRecords === plan.plans.length &&
            typeof item.createdAt === "string" &&
            attemptTimes.some(
              (time) =>
                Math.abs(Date.parse(String(item.createdAt)) - time) <= 120_000,
            ),
        )
        .slice(0, 3);
      const verified: Extract<
        CatalogImportInspection,
        { status: "verified" }
      >[] = [];
      for (const item of candidates) {
        const batchId = String(item.batchId).toLowerCase();
        const stats = await responseObject(
          await request(`/${batchId}/stats`, undefined, deadline),
        );
        if (!metadata(stats, plan, batchId)) continue;
        const submission = {
          batchId,
          checksumMd5: plan.checksumMd5,
          fileSizeBytes: plan.fileSizeBytes,
        };
        const result = verifyCatalogImport(
          plan,
          submission,
          stats,
          await responseText(
            await request(`/${batchId}/results`, undefined, deadline),
          ),
        );
        if (result.status !== "verified") return { status: "failed" };
        verified.push(result);
      }
      if (!verified.length) return { status: "unconfirmed" };
      if (
        verified.some(
          (entry) =>
            JSON.stringify(entry.profileIds) !==
            JSON.stringify(verified[0].profileIds),
        )
      )
        return { status: "failed" };
      return verified[0];
    },
  };
}
