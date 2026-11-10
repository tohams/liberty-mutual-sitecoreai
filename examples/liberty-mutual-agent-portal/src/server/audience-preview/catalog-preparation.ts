import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { AUDIENCE_PREVIEW_SCENARIOS } from "@/features/audience-preview/scenarios";
import type { AudiencePreviewInput } from "@/features/audience-preview/types";
import type { AudiencePreviewPage } from "@/server/marketplace/audience-preview-pages";
import type { StoredValue } from "../state/store";
import { AudiencePreviewError, PREVIEW_SCHEMA_VERSION } from "./contracts";
import {
  assertVerifiedPreviewProfile,
  audiencePreviewProfileKey,
  audienceSelectorHash,
  prepareAudienceProfileImport,
  prepareAudiencePreviewProfile,
  type AudienceProfileDependencies,
  type AudienceProfileJob,
  type VerifiedPreviewProfile,
} from "./profiles";
import { PreviewImportQueueBusyError } from "./importer";
import {
  catalogImportPlan,
  createCatalogImporter,
  type CatalogImporter,
  type CatalogImportPlan,
  type CatalogImportSubmission,
} from "./catalog-importer";
import {
  evaluateAudiencePreview,
  type AudienceDecisionDependencies,
} from "./decisions";
import { getAudiencePreviewLayout } from "./preview-client";
import { createCatalogProfileProofVerifier } from "./catalog-profile-proof";
import {
  catalogRowFailure,
  recordCatalogRowFailure,
  storedCatalogRowFailure,
  type CatalogFailureStage,
  type CatalogRowFailure,
} from "./catalog-diagnostics";

const TOTAL = 42;
const WORKERS = 3;
const LEASE_MS = 120_000;
type Phase =
  | "planning"
  | "upload"
  | "uploading"
  | "waiting-upload"
  | "reconciling"
  | "verifying"
  | "preparing"
  | "failed";
interface CatalogRow {
  index: number;
  selectorHash: string;
  source: "existing" | "bulk";
  plan?: ReturnType<typeof prepareAudienceProfileImport>;
  verifiedFor?: string;
  profileId?: string;
  failureFor?: string;
  failure?: CatalogRowFailure;
}
interface CatalogJob {
  id: string;
  phase: Phase;
  rows: CatalogRow[];
  cursor: number;
  createdAt: number;
  leaseUntil?: number;
  nextAttemptAt?: number;
  importPlan?: CatalogImportPlan;
  submission?: CatalogImportSubmission;
  importedProfileIds?: string[];
  attemptTimes: number[];
  firstUncertainAttemptAt?: number;
  uncertainRetryUsed?: boolean;
  failureCode?: string;
}
export interface CatalogPreparationStatus {
  status: "idle" | "pending" | "ready" | "failed";
  total: 42;
  readyCount: number;
  pendingCount: number;
  failedCount: number;
  phase:
    "planning" | "importing" | "verifying" | "preparing" | "ready" | "failed";
  retryAfterSeconds: 3;
  message: string;
  failedRows?: CatalogRowFailure[];
}
export interface CatalogPreparationDependencies {
  profiles: AudienceProfileDependencies;
  decisions: AudienceDecisionDependencies;
  importer?: CatalogImporter;
  now?: () => number;
  uuid?: () => string;
  prepareProfile?: typeof prepareAudiencePreviewProfile;
  verifyProfile?: (
    page: AudiencePreviewPage,
    profile: VerifiedPreviewProfile,
  ) => Promise<void>;
}

function catalogKey(deps: CatalogPreparationDependencies): string {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        schema: PREVIEW_SCHEMA_VERSION,
        site: deps.profiles.siteName,
        scenarios: AUDIENCE_PREVIEW_SCENARIOS,
      }),
    )
    .digest("hex");
  return `${deps.profiles.namespace}:audience-preview:catalog:v1:${hash}`;
}
function pageKey(page: AudiencePreviewPage): string {
  return `${page.id.toLowerCase()}:${page.language}:${page.version}`;
}
function status(
  job: CatalogJob | null,
  page: AudiencePreviewPage,
): CatalogPreparationStatus {
  const readyCount =
    job?.rows.filter((row) => row.verifiedFor === pageKey(page)).length || 0;
  const failedCount =
    job?.phase === "failed"
      ? TOTAL - readyCount
      : job?.rows.filter((row) => row.failureFor === pageKey(page)).length || 0;
  const state = !job
    ? "idle"
    : job.phase === "failed" || failedCount
      ? "failed"
      : readyCount === TOTAL
        ? "ready"
        : "pending";
  const phase =
    state === "ready"
      ? "ready"
      : state === "failed"
        ? "failed"
        : !job || job.phase === "planning"
          ? "planning"
          : job.phase === "verifying"
            ? "verifying"
            : job.phase === "preparing"
              ? "preparing"
              : "importing";
  return {
    status: state,
    total: 42,
    readyCount,
    pendingCount: TOTAL - readyCount - failedCount,
    failedCount,
    phase,
    retryAfterSeconds: 3,
    ...(job && failedCount
      ? {
          failedRows: job.rows
            .filter(
              (row) =>
                row.failureFor === pageKey(page) &&
                Number.isInteger(row.index) &&
                row.index >= 0 &&
                row.index < TOTAL,
            )
            .map((row) =>
              storedCatalogRowFailure(row.index, {
                ...storedCatalogRowFailure(row.index, row.failure),
                source: row.source,
              }),
            ),
        }
      : {}),
    message:
      state === "ready"
        ? "All 42 audiences are prepared and verified."
        : state === "failed"
          ? "Some audiences could not be verified. Retry preparation or contact your Sitecore administrator."
          : state === "idle"
            ? "Prepare all 42 audiences before your demonstration."
            : "Preparing all audience previews. Keep this page open; progress is saved.",
  };
}
export async function readCatalogPreparation(
  page: AudiencePreviewPage,
  deps: CatalogPreparationDependencies,
): Promise<CatalogPreparationStatus> {
  const job =
    (await deps.profiles.store.read<CatalogJob>(catalogKey(deps)))?.value ||
    null;
  // Diagnose retained legacy failures with state reads only. This GET neither advances
  // preparation nor changes the saved manifest or any native profile.
  if (job)
    await Promise.all(
      job.rows
        .filter(
          (row) =>
            row.failureFor === pageKey(page) &&
            Number.isInteger(row.index) &&
            row.index >= 0 &&
            row.index < TOTAL,
        )
        .map(async (row) => {
          const profile = await deps.profiles.store.read<AudienceProfileJob>(
            audiencePreviewProfileKey(
              row.selectorHash,
              deps.profiles.namespace,
            ),
          );
          const failure =
            !row.failure &&
            profile?.value.phase === "failed" &&
            profile.value.code
              ? catalogRowFailure(row.index, "profile-preparation", {
                  code: profile.value.code,
                })
              : storedCatalogRowFailure(row.index, row.failure);
          row.failure = storedCatalogRowFailure(row.index, {
            ...failure,
            source: row.source,
            ...(profile
              ? {
                  profilePhase: profile.value.phase,
                  profileCode: profile.value.code,
                  identitySent: profile.value.identitySent === true,
                  hasCatalogProof: !!profile.value.catalogProof,
                  hasSubmissionProof: !!profile.value.submission,
                }
              : {}),
          });
        }),
    );
  return status(job, page);
}

function exactRetainedPlan(
  input: AudiencePreviewInput,
  job: AudienceProfileJob,
  deps: CatalogPreparationDependencies,
) {
  const expected = prepareAudienceProfileImport(
    input,
    deps.profiles.namespace,
    deps.profiles.siteName,
    job.plan.correlationId,
  );
  if (
    expected.payload !== job.plan.payload ||
    expected.checksumMd5 !== job.plan.checksumMd5 ||
    expected.fileSizeBytes !== job.plan.fileSizeBytes ||
    expected.selectorHash !== job.plan.selectorHash ||
    expected.identity !== job.plan.identity
  )
    throw new AudiencePreviewError(
      "INVALID_PREVIEW_STATE",
      "A retained audience preparation could not be verified.",
    );
  return job.plan;
}

/** One bounded durable stage per authenticated request. No background tasks or view URLs are created. */
export async function advanceCatalogPreparation(
  page: AudiencePreviewPage,
  deps: CatalogPreparationDependencies,
): Promise<CatalogPreparationStatus> {
  if (AUDIENCE_PREVIEW_SCENARIOS.length !== TOTAL)
    throw new AudiencePreviewError(
      "INVALID_PREVIEW_STATE",
      "The audience catalog is not configured.",
    );
  const { store, namespace, siteName } = deps.profiles;
  const now = deps.now || Date.now;
  const uuid = deps.uuid || randomUUID;
  const key = catalogKey(deps);
  let current = await store.read<CatalogJob>(key);
  if (!current) {
    current = await store.compareAndSet(
      key,
      null,
      {
        id: uuid(),
        phase: "planning",
        rows: [],
        cursor: 0,
        createdAt: now(),
        attemptTimes: [],
      } satisfies CatalogJob,
      null,
    );
    if (!current) return readCatalogPreparation(page, deps);
  }
  if (
    (current.value.leaseUntil || 0) > now() ||
    (current.value.nextAttemptAt || 0) > now()
  )
    return status(current.value, page);
  if (
    current.value.rows.every((row) => row.verifiedFor === pageKey(page)) &&
    current.value.rows.length === TOTAL
  )
    return status(current.value, page);
  const claimed = await store.compareAndSet(
    key,
    current.version,
    { ...current.value, leaseUntil: now() + LEASE_MS },
    null,
  );
  if (!claimed) return readCatalogPreparation(page, deps);
  let owner: StoredValue<CatalogJob> = claimed;
  const job: CatalogJob = structuredClone(claimed.value);
  const persist = async (
    next: CatalogJob,
  ): Promise<CatalogPreparationStatus> => {
    delete next.leaseUntil;
    const saved = await store.compareAndSet(key, owner.version, next, null);
    return saved
      ? status(saved.value, page)
      : readCatalogPreparation(page, deps);
  };
  const importer = () =>
    deps.importer || createCatalogImporter(undefined, deps.profiles.transport);
  try {
    if (job.phase === "planning") {
      const indices = Array.from(
        { length: Math.min(WORKERS, TOTAL - job.cursor) },
        (_, offset) => job.cursor + offset,
      );
      const results = await Promise.allSettled(
        indices.map(async (index): Promise<CatalogRow> => {
          const input = AUDIENCE_PREVIEW_SCENARIOS[index];
          const selectorHash = audienceSelectorHash(input, namespace, siteName);
          const profileKey = audiencePreviewProfileKey(selectorHash, namespace);
          const existing = await store.read<AudienceProfileJob>(profileKey);
          if (
            existing?.value.phase === "catalog" &&
            existing.value.catalogId === job.id
          )
            return {
              index,
              selectorHash,
              source: "bulk",
              plan: exactRetainedPlan(input, existing.value, deps),
            };
          const canReserve =
            !existing ||
            (!(
              existing.value.lease && existing.value.lease.expiresAt > now()
            ) &&
              (existing.value.phase === "waiting-upload" ||
                (existing.value.phase === "failed" &&
                  existing.value.code === "IMPORT_UPLOAD_UNCONFIRMED")));
          if (!canReserve) return { index, selectorHash, source: "existing" };
          const plan = existing
            ? exactRetainedPlan(input, existing.value, deps)
            : prepareAudienceProfileImport(input, namespace, siteName, uuid());
          const reserved: AudienceProfileJob = {
            ...(existing?.value || {}),
            schemaVersion: PREVIEW_SCHEMA_VERSION,
            phase: "catalog",
            plan,
            createdAt: existing?.value.createdAt || now(),
            catalogId: job.id,
          };
          delete reserved.lease;
          delete reserved.nextAttemptAt;
          const saved = await store.compareAndSet(
            profileKey,
            existing?.version ?? null,
            reserved,
            null,
          );
          if (!saved)
            throw new AudiencePreviewError(
              "PREVIEW_STATE_UNAVAILABLE",
              "Audience preparation is continuing.",
              true,
            );
          return { index, selectorHash, source: "bulk", plan };
        }),
      );
      const rejected = results.find((entry) => entry.status === "rejected");
      if (rejected?.status === "rejected") throw rejected.reason;
      const rows = results.map((entry) => {
        if (entry.status !== "fulfilled")
          throw new Error("Incomplete reservation");
        return entry.value;
      });
      for (const row of rows) job.rows[row.index] = row;
      job.cursor += rows.length;
      if (job.cursor === TOTAL) {
        const plans = job.rows
          .filter((row) => row.source === "bulk")
          .map((row) => row.plan!);
        if (plans.length) {
          job.importPlan = catalogImportPlan(plans);
          job.phase = "upload";
        } else job.phase = "preparing";
      }
      return persist(job);
    }
    if (job.phase === "upload" || job.phase === "waiting-upload") {
      if (!job.importPlan)
        throw new AudiencePreviewError(
          "INVALID_PREVIEW_STATE",
          "The audience import plan is unavailable.",
        );
      job.phase = "uploading";
      job.attemptTimes = [...job.attemptTimes, now()].slice(-2);
      job.leaseUntil = now() + LEASE_MS;
      const recorded = await store.compareAndSet(key, owner.version, job, null);
      if (!recorded) return readCatalogPreparation(page, deps);
      owner = recorded;
      try {
        job.submission = await importer().submit(job.importPlan);
        job.phase = "verifying";
        delete job.nextAttemptAt;
      } catch (error) {
        if (error instanceof PreviewImportQueueBusyError) {
          job.phase = "waiting-upload";
          job.nextAttemptAt = now() + error.retryAfterSeconds * 1000;
        } else {
          job.firstUncertainAttemptAt ??= job.attemptTimes.at(-1);
          job.phase = "reconciling";
          job.nextAttemptAt = now() + 3_000;
        }
      }
      return persist(job);
    }
    if (
      job.phase === "uploading" ||
      job.phase === "reconciling" ||
      (job.phase === "failed" &&
        job.failureCode === "IMPORT_UPLOAD_UNCONFIRMED")
    ) {
      if (!job.importPlan)
        throw new AudiencePreviewError(
          "INVALID_PREVIEW_STATE",
          "The audience import plan is unavailable.",
        );
      job.firstUncertainAttemptAt ??= job.attemptTimes.at(-1);
      const result = await importer().reconcile(
        job.importPlan,
        [...job.attemptTimes, job.firstUncertainAttemptAt].filter(
          (value): value is number => typeof value === "number",
        ),
      );
      if (result.status === "verified") {
        job.submission = result.submission;
        job.importedProfileIds = result.profileIds;
        job.phase = "preparing";
        delete job.failureCode;
      } else if (result.status === "pending") {
        job.phase = "reconciling";
        job.nextAttemptAt = now() + 10_000;
      } else if (result.status === "unconfirmed" && !job.uncertainRetryUsed) {
        job.uncertainRetryUsed = true;
        job.phase = "upload";
        delete job.nextAttemptAt;
      } else {
        job.phase = "failed";
        job.failureCode =
          result.status === "failed"
            ? "IMPORT_VERIFICATION_FAILED"
            : "IMPORT_UPLOAD_UNCONFIRMED";
      }
      return persist(job);
    }
    if (job.phase === "verifying") {
      if (!job.importPlan || !job.submission)
        throw new AudiencePreviewError(
          "INVALID_PREVIEW_STATE",
          "The audience import receipt is unavailable.",
        );
      const result = await importer().inspect(job.importPlan, job.submission);
      if (result.status === "verified") {
        job.importedProfileIds = result.profileIds;
        job.phase = "preparing";
      } else if (result.status === "pending") job.nextAttemptAt = now() + 3_000;
      else {
        job.phase = "failed";
        job.failureCode = "IMPORT_VERIFICATION_FAILED";
      }
      return persist(job);
    }
    if (job.phase === "preparing") {
      const verifyCatalogProfile = createCatalogProfileProofVerifier(
        job,
        importer,
      );
      // An explicit retry may re-run failed native reads; completed profile/import work is retained.
      for (const row of job.rows)
        if (row.failureFor === pageKey(page)) delete row.failureFor;
      const selected = job.rows
        .filter(
          (row) =>
            row.verifiedFor !== pageKey(page) &&
            row.failureFor !== pageKey(page),
        )
        .slice(0, WORKERS);
      await Promise.all(
        selected.map(async (row) => {
          let stage: CatalogFailureStage = "profile-preparation";
          try {
            const input = AUDIENCE_PREVIEW_SCENARIOS[row.index];
            if (row.source === "bulk") {
              const profileKey = audiencePreviewProfileKey(
                row.selectorHash,
                namespace,
              );
              const existing = await store.read<AudienceProfileJob>(profileKey);
              if (
                existing?.value.phase === "catalog" &&
                existing.value.catalogId === job.id
              ) {
                const recordIndex = job.rows
                  .filter((entry) => entry.source === "bulk")
                  .findIndex((entry) => entry.index === row.index);
                const profileId = job.importedProfileIds?.[recordIndex];
                if (!profileId || !job.submission)
                  throw new AudiencePreviewError(
                    "INVALID_PREVIEW_STATE",
                    "The audience import proof is unavailable.",
                  );
                const next: AudienceProfileJob = {
                  ...existing.value,
                  phase: "binding",
                  profileId,
                  catalogProof: { ...job.submission, recordIndex },
                };
                delete next.code;
                delete next.lease;
                delete next.nextAttemptAt;
                delete next.submission;
                if (
                  !(await store.compareAndSet(
                    profileKey,
                    existing.version,
                    next,
                    null,
                  ))
                )
                  return;
              }
            }
            const result = await (
              deps.prepareProfile || prepareAudiencePreviewProfile
            )(input, { ...deps.profiles, verifyCatalogProfile });
            if (result.status !== "ready") return;
            assertVerifiedPreviewProfile(result.profile);
            if (result.profile.selectorHash !== row.selectorHash)
              throw new AudiencePreviewError(
                "INVALID_PREVIEW_PROFILE",
                "The audience profile could not be verified.",
              );
            stage = "native-decision";
            if (deps.verifyProfile)
              await deps.verifyProfile(page, result.profile);
            else {
              const decisions = await evaluateAudiencePreview(
                page,
                result.profile,
                deps.decisions,
              );
              stage = "page-layout";
              await getAudiencePreviewLayout(page, decisions);
            }
            row.profileId = result.profile.profileId;
            row.verifiedFor = pageKey(page);
            delete row.failureFor;
            delete row.failure;
          } catch (error) {
            const failure = catalogRowFailure(row.index, stage, error);
            if (error instanceof AudiencePreviewError && error.retryable) {
              recordCatalogRowFailure(failure, "pending");
              return;
            }
            row.failureFor = pageKey(page);
            row.failure = failure;
            recordCatalogRowFailure(failure, "failed");
          }
        }),
      );
      const ids = job.rows
        .filter((row) => row.verifiedFor === pageKey(page))
        .map((row) => row.profileId);
      if (new Set(ids).size !== ids.length) {
        for (const row of job.rows)
          if (
            row.verifiedFor === pageKey(page) &&
            ids.filter((id) => id === row.profileId).length > 1
          ) {
            delete row.verifiedFor;
            row.failureFor = pageKey(page);
            row.failure = catalogRowFailure(row.index, "profile-preparation", {
              code: "INVALID_PREVIEW_PROFILE",
            });
          }
        job.phase = "failed";
        job.failureCode = "INVALID_PREVIEW_PROFILE";
      }
      return persist(job);
    }
    return persist(job);
  } catch (error) {
    if (error instanceof AudiencePreviewError && error.retryable) {
      job.nextAttemptAt = now() + 3_000;
      return persist(job);
    }
    job.phase = "failed";
    job.failureCode =
      error instanceof AudiencePreviewError
        ? error.code
        : "PREVIEW_UNAVAILABLE";
    console.info("Audience Preview catalog preparation", {
      phase: "failed",
      outcome: "unconfirmed",
    });
    return persist(job);
  }
}
