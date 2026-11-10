import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { AudiencePreviewInput } from "@/features/audience-preview/types";
import { readPortalBrowserProfileRef } from "@/lib/portal-identity-link";
import type { StateStore, StoredValue } from "../state/store";
import {
  AudiencePreviewError,
  HASH,
  PREVIEW_IDENTITY_PREFIX,
  PREVIEW_PROVIDER,
  PREVIEW_SCHEMA_VERSION,
  responseObject,
  UUID,
  validateAudiencePreviewInput,
  validateNativePreviewConfiguration,
  type NativePreviewConfiguration,
} from "./contracts";
import {
  createPreviewProfileImporter,
  PreviewImportQueueBusyError,
  type PreviewImportPlan,
  type PreviewImportSubmission,
  type PreviewProfileImporter,
} from "./importer";

import {
  recordAudiencePreviewStage,
  type AudiencePreviewStage,
} from "./telemetry";

const LEASE_MS = 45_000;
const RETRY_SECONDS = 3;
const BINDING_DEADLINE_MS = 120_000;

export interface VerifiedPreviewProfile {
  selectorHash: string;
  identity: string;
  profileId: string;
  browserId: string;
}
export type AudienceProfilePreparation =
  | {
      status: "pending";
      retryAfterSeconds: number;
      waitingForAnotherAudience?: boolean;
    }
  | { status: "ready"; profile: VerifiedPreviewProfile };

export interface AudienceProfileJob {
  schemaVersion: typeof PREVIEW_SCHEMA_VERSION;
  phase:
    | "uploading"
    | "waiting-upload"
    | "reconciling"
    | "verifying"
    | "binding"
    | "ready"
    | "catalog"
    | "failed";
  plan: PreviewImportPlan;
  createdAt: number;
  nextAttemptAt?: number;
  lease?: { id: string; expiresAt: number };
  submission?: PreviewImportSubmission;
  profileId?: string;
  browserId?: string;
  identitySent?: boolean;
  bindingStartedAt?: number;
  code?: string;
  /** At most one exact UPSERT after an unknown receipt; the original plan is immutable. */
  uncertainRetryUsed?: boolean;
  lastUploadAttemptAt?: number;
  firstUncertainUploadAt?: number;
  /** A fixed catalog reservation is advanced only by its durable catalog worker. */
  catalogId?: string;
  catalogProof?: {
    batchId: string;
    checksumMd5: string;
    fileSizeBytes: number;
    recordIndex: number;
  };
}
type ProfileJob = AudienceProfileJob;

export function audiencePreviewProfileKey(
  selectorHash: string,
  namespace: string,
): string {
  return `${namespace}:audience-preview:v${PREVIEW_SCHEMA_VERSION}:${selectorHash}`;
}

export interface AudienceProfileDependencies extends NativePreviewConfiguration {
  store: StateStore;
  /** Server-configured deployment namespace, never supplied by the browser. */
  namespace: string;
  importer?: PreviewProfileImporter;
  transport?: typeof fetch;
  now?: () => number;
  uuid?: () => string;
  readProfileRef?: typeof readPortalBrowserProfileRef;
}

export function audienceSelectorHash(
  input: unknown,
  namespace: string,
  siteName: string,
): string {
  const audience = validateAudiencePreviewInput(input);
  if (
    !/^[a-zA-Z0-9:_-]{3,160}$/.test(namespace) ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(siteName)
  )
    throw new AudiencePreviewError(
      "PREVIEW_NOT_CONFIGURED",
      "Audience Preview is not configured.",
    );
  return createHash("sha256")
    .update(
      JSON.stringify({
        schema: PREVIEW_SCHEMA_VERSION,
        namespace,
        siteName,
        audience,
      }),
    )
    .digest("hex");
}

/** Synthetic attributes mirror the UDL production schema; no personalization rule is evaluated here. */
export function prepareAudienceProfileImport(
  input: unknown,
  namespace: string,
  siteName: string,
  correlationId: string = randomUUID(),
): PreviewImportPlan {
  const audience: AudiencePreviewInput = validateAudiencePreviewInput(input);
  if (!UUID.test(correlationId))
    throw new AudiencePreviewError(
      "INVALID_IMPORT_PLAN",
      "The audience preview import is invalid.",
    );
  const selectorHash = audienceSelectorHash(audience, namespace, siteName);
  const identity = PREVIEW_IDENTITY_PREFIX + selectorHash;
  const total = Math.round(audience.agencyTotalWrittenPremiumUsd * 100);
  const smallCommercial = Math.round(
    (total * audience.agencySmallCommercialSharePercent) / 100,
  );
  const personal = total - smallCommercial;
  const extensions = {
    previewOnly: true,
    previewSchemaVersion: PREVIEW_SCHEMA_VERSION,
    previewSelectorHash: selectorHash,
    agentId: identity,
    agencyId: identity,
    agencyName: "Audience Preview",
    role: audience.role,
    state: audience.licensedStates[0] || "TX",
    channel: "independent",
    productionCurrency: "USD",
    productionMetricScope: "agency",
    licensedInTexas: audience.licensedStates.includes("TX"),
    licensedInFlorida: audience.licensedStates.includes("FL"),
    licensedInIllinois: audience.licensedStates.includes("IL"),
    specializesInSmallCommercial: audience.specializesInSmallCommercial,
    personalWrittenPremiumCents: personal,
    agencyPersonalWrittenPremiumCents: personal,
    smallCommercialWrittenPremiumCents: smallCommercial,
    agencySmallCommercialWrittenPremiumCents: smallCommercial,
    agentSmallCommercialWrittenPremiumCents: Math.round(
      audience.agentSmallCommercialWrittenPremiumUsd * 100,
    ),
  };
  const payload =
    JSON.stringify({
      id: correlationId.toLowerCase(),
      recordType: "profile",
      identifiers: [{ provider: PREVIEW_PROVIDER, id: identity }],
      contact: { firstName: "Audience", lastName: "Preview" },
      extensions,
    }) + "\n";
  return Object.freeze({
    selectorHash,
    identity,
    correlationId: correlationId.toLowerCase(),
    payload,
    checksumMd5: createHash("md5").update(payload).digest("hex"),
    fileSizeBytes: Buffer.byteLength(payload),
  });
}

export function assertVerifiedPreviewProfile(
  value: VerifiedPreviewProfile,
): void {
  if (
    !value ||
    !HASH.test(value.selectorHash) ||
    value.identity !== PREVIEW_IDENTITY_PREFIX + value.selectorHash ||
    !UUID.test(value.profileId) ||
    !UUID.test(value.browserId)
  )
    throw new AudiencePreviewError(
      "INVALID_PREVIEW_PROFILE",
      "The audience preview profile is not verified.",
    );
}

function jobStage(job: ProfileJob): AudiencePreviewStage {
  if (
    job.phase === "uploading" ||
    job.phase === "waiting-upload" ||
    job.phase === "reconciling"
  )
    return "profile-import";
  if (job.phase === "verifying") return "profile-verification";
  if (job.phase === "binding" || job.code === "PROFILE_LINK_TIMEOUT")
    return "profile-binding";
  return "profile-preparation";
}

function pending(job: ProfileJob, now: number): AudienceProfilePreparation {
  recordAudiencePreviewStage(jobStage(job), "pending");
  return {
    status: "pending",
    ...(job.code === "IMPORT_QUEUE_BUSY"
      ? { waitingForAnotherAudience: true }
      : {}),
    retryAfterSeconds: Math.max(
      RETRY_SECONDS,
      Math.ceil(
        (Math.max(job.nextAttemptAt || 0, job.lease?.expiresAt || 0) - now) /
          1000,
      ),
    ),
  };
}

function jobFailure(code = "PREVIEW_PROFILE_FAILED"): never {
  recordAudiencePreviewStage("profile-preparation", "failed", { code });
  throw new AudiencePreviewError(
    code,
    "This audience could not be prepared. Contact your Sitecore administrator to resolve the preview request.",
  );
}

/** One bounded stage per call. Pending jobs survive deployments, concurrent requests, and browser polling. */
export async function prepareAudiencePreviewProfile(
  input: unknown,
  dependencies: AudienceProfileDependencies,
): Promise<AudienceProfilePreparation> {
  const audience = validateAudiencePreviewInput(input);
  validateNativePreviewConfiguration(dependencies);
  const { store, namespace, siteName } = dependencies;
  const selectorHash = audienceSelectorHash(audience, namespace, siteName);
  const key = audiencePreviewProfileKey(selectorHash, namespace);
  const now = dependencies.now || Date.now;
  const uuid = dependencies.uuid || randomUUID;
  const transport = dependencies.transport || fetch;
  const readRef = dependencies.readProfileRef || readPortalBrowserProfileRef;
  let current = await store.read<ProfileJob>(key);
  const save = (previous: StoredValue<ProfileJob>, value: ProfileJob) =>
    store.compareAndSet(key, previous.version, value, null);
  const resultAfterConflict = async (): Promise<AudienceProfilePreparation> => {
    const latest = await store.read<ProfileJob>(key);
    if (!latest)
      throw new AudiencePreviewError(
        "PREVIEW_STATE_UNAVAILABLE",
        "The preview is temporarily unavailable.",
        true,
      );
    if (latest.value.phase === "failed") {
      if (
        latest.value.code === "PROFILE_LINK_TIMEOUT" &&
        latest.value.lease &&
        latest.value.lease.expiresAt > now()
      )
        return pending(latest.value, now());
      jobFailure(latest.value.code);
    }
    if (latest.value.phase === "ready") {
      const profile = {
        selectorHash,
        identity: latest.value.plan.identity,
        profileId: latest.value.profileId!,
        browserId: latest.value.browserId!,
      };
      assertVerifiedPreviewProfile(profile);
      return { status: "ready", profile };
    }
    return pending(latest.value, now());
  };
  const fail = async (
    previous: StoredValue<ProfileJob>,
    code: string,
  ): Promise<never> => {
    recordAudiencePreviewStage(jobStage(previous.value), "failed", { code });
    const job: ProfileJob = { ...previous.value, phase: "failed", code };
    if (
      code === "IMPORT_UPLOAD_UNCONFIRMED" &&
      job.firstUncertainUploadAt === undefined &&
      job.lastUploadAttemptAt
    )
      job.firstUncertainUploadAt = job.lastUploadAttemptAt;
    delete job.lease;
    await save(previous, job);
    return jobFailure(code);
  };
  const submitRetainedPlan = async (
    previous: StoredValue<ProfileJob>,
  ): Promise<AudienceProfilePreparation> => {
    const attempting: ProfileJob = {
      ...previous.value,
      phase: "uploading",
      lastUploadAttemptAt: now(),
      lease: { id: uuid(), expiresAt: now() + LEASE_MS },
    };
    const claimed = await save(previous, attempting);
    if (!claimed) return resultAfterConflict();
    const job = claimed.value;
    try {
      const importer =
        dependencies.importer ||
        createPreviewProfileImporter(undefined, transport);
      recordAudiencePreviewStage("profile-import", "started");
      const submission = await importer.submit(job.plan);
      if (
        !UUID.test(submission.batchId) ||
        submission.checksumMd5 !== job.plan.checksumMd5 ||
        submission.fileSizeBytes !== job.plan.fileSizeBytes
      )
        return fail(claimed, "IMPORT_UPLOAD_UNCONFIRMED");
      const next: ProfileJob = { ...job, phase: "verifying", submission };
      delete next.lease;
      delete next.code;
      delete next.nextAttemptAt;
      if (!(await save(claimed, next))) return resultAfterConflict();
      return pending(next, now());
    } catch (error) {
      if (error instanceof PreviewImportQueueBusyError) {
        const next: ProfileJob = {
          ...job,
          phase: "waiting-upload",
          code: "IMPORT_QUEUE_BUSY",
          nextAttemptAt: now() + error.retryAfterSeconds * 1000,
        };
        delete next.lease;
        if (!(await save(claimed, next))) return resultAfterConflict();
        return pending(next, now());
      }
      return fail(claimed, "IMPORT_UPLOAD_UNCONFIRMED");
    }
  };
  const reconcileRetainedPlan = async (
    previous: StoredValue<ProfileJob>,
  ): Promise<AudienceProfilePreparation> => {
    const job = previous.value;
    try {
      const importer =
        dependencies.importer ||
        createPreviewProfileImporter(undefined, transport);
      if (!importer.reconcile)
        return fail(previous, "IMPORT_UPLOAD_UNCONFIRMED");
      recordAudiencePreviewStage("profile-import", "started");
      const receipt = await importer.reconcile(
        job.plan,
        job.createdAt,
        job.lastUploadAttemptAt,
        job.firstUncertainUploadAt,
      );
      if (receipt.status === "failed")
        return fail(previous, "IMPORT_VERIFICATION_FAILED");
      if (receipt.status === "verified") {
        if (
          !UUID.test(receipt.profileId) ||
          !UUID.test(receipt.submission.batchId) ||
          receipt.submission.checksumMd5 !== job.plan.checksumMd5 ||
          receipt.submission.fileSizeBytes !== job.plan.fileSizeBytes
        )
          return fail(previous, "IMPORT_VERIFICATION_FAILED");
        const next: ProfileJob = {
          ...job,
          phase: "binding",
          submission: receipt.submission,
          profileId: receipt.profileId,
          bindingStartedAt: now(),
          nextAttemptAt: now() + RETRY_SECONDS * 1000,
        };
        delete next.lease;
        delete next.code;
        if (!(await save(previous, next))) return resultAfterConflict();
        recordAudiencePreviewStage("profile-import", "recovered");
        return pending(next, now());
      }
      if (receipt.status === "pending") {
        const next: ProfileJob = {
          ...job,
          phase: "reconciling",
          code: "IMPORT_QUEUE_BUSY",
          nextAttemptAt: now() + 10_000,
        };
        delete next.lease;
        if (!(await save(previous, next))) return resultAfterConflict();
        return pending(next, now());
      }
      if (job.uncertainRetryUsed)
        return fail(previous, "IMPORT_UPLOAD_UNCONFIRMED");
      // The bounded search did not recover a receipt. A single exact UPSERT is
      // profile-idempotent under the native identity rule. Persist its budget first.
      const retry: ProfileJob = {
        ...job,
        phase: "uploading",
        uncertainRetryUsed: true,
        lease: { id: uuid(), expiresAt: now() + LEASE_MS },
      };
      delete retry.code;
      const saved = await save(previous, retry);
      if (!saved) return resultAfterConflict();
      return submitRetainedPlan(saved);
    } catch (error) {
      if (error instanceof AudiencePreviewError && error.retryable) {
        const next: ProfileJob = {
          ...job,
          phase: "reconciling",
          nextAttemptAt: now() + 5_000,
        };
        delete next.lease;
        if (!(await save(previous, next))) return resultAfterConflict();
        recordAudiencePreviewStage("profile-import", "unconfirmed", {
          code: error.code,
        });
        return pending(next, now());
      }
      return fail(
        previous,
        error instanceof AudiencePreviewError
          ? error.code
          : "IMPORT_UPLOAD_UNCONFIRMED",
      );
    }
  };
  if (!current) {
    const job: ProfileJob = {
      schemaVersion: PREVIEW_SCHEMA_VERSION,
      phase: "uploading",
      createdAt: now(),
      plan: prepareAudienceProfileImport(audience, namespace, siteName, uuid()),
      lease: { id: uuid(), expiresAt: now() + LEASE_MS },
    };
    current = await store.compareAndSet(key, null, job, null);
    if (!current) return resultAfterConflict();
    return submitRetainedPlan(current);
  }
  const job = current.value;
  if (
    job.schemaVersion !== PREVIEW_SCHEMA_VERSION ||
    job.plan.selectorHash !== selectorHash ||
    job.plan.identity !== PREVIEW_IDENTITY_PREFIX + selectorHash
  )
    return jobFailure("INVALID_PREVIEW_STATE");
  if (job.phase === "catalog") return pending(job, now());
  if (job.phase === "failed" && job.code === "IMPORT_UPLOAD_UNCONFIRMED") {
    const importer =
      dependencies.importer ||
      createPreviewProfileImporter(undefined, transport);
    if (!importer.reconcile) return jobFailure(job.code);
    const claimedJob: ProfileJob = {
      ...job,
      phase: "reconciling",
      lease: { id: uuid(), expiresAt: now() + LEASE_MS },
    };
    const claimed = await save(current, claimedJob);
    if (!claimed) return resultAfterConflict();
    return reconcileRetainedPlan(claimed);
  }
  if (job.phase === "failed") {
    // A timed-out observation is not an uncertain write. Recheck only the exact
    // existing binding; never import, create a browser, or replay IDENTITY here.
    if (job.code !== "PROFILE_LINK_TIMEOUT") return jobFailure(job.code);
    const profile = {
      selectorHash,
      identity: job.plan.identity,
      profileId: job.profileId!,
      browserId: job.browserId!,
    };
    assertVerifiedPreviewProfile(profile);
    if (job.lease && job.lease.expiresAt > now()) return pending(job, now());
    const claimedJob: ProfileJob = {
      ...job,
      lease: { id: uuid(), expiresAt: now() + LEASE_MS },
    };
    const claimed = await save(current, claimedJob);
    if (!claimed) return resultAfterConflict();
    recordAudiencePreviewStage("profile-binding", "started");
    let linked: string | null = null;
    try {
      linked = await readRef(
        {
          edgeUrl: dependencies.edgeUrl,
          contextId: dependencies.contextId,
          browserId: profile.browserId,
        },
        AbortSignal.timeout(8_000),
        transport,
      );
    } catch {
      /* An unreadable binding remains unconfirmed. */
    }
    if (linked?.toLowerCase() !== profile.profileId.toLowerCase()) {
      const unchanged = { ...claimedJob };
      delete unchanged.lease;
      if (!(await save(claimed, unchanged))) return resultAfterConflict();
      return jobFailure(job.code);
    }
    const ready: ProfileJob = { ...claimedJob, phase: "ready" };
    delete ready.lease;
    delete ready.code;
    delete ready.nextAttemptAt;
    if (!(await save(claimed, ready))) return resultAfterConflict();
    recordAudiencePreviewStage("profile-binding", "recovered");
    return { status: "ready", profile };
  }
  if (job.phase === "ready") return resultAfterConflict();
  if (job.lease && job.lease.expiresAt > now()) return pending(job, now());
  if (job.phase === "uploading")
    return fail(current, "IMPORT_UPLOAD_UNCONFIRMED");
  if ((job.nextAttemptAt || 0) > now()) return pending(job, now());
  const claimedJob: ProfileJob = {
    ...job,
    lease: { id: uuid(), expiresAt: now() + LEASE_MS },
  };
  const claimed = await save(current, claimedJob);
  if (!claimed) return resultAfterConflict();
  const release = async (
    next: ProfileJob,
  ): Promise<AudienceProfilePreparation> => {
    delete next.lease;
    next.nextAttemptAt = now() + RETRY_SECONDS * 1000;
    if (!(await save(claimed, next))) return resultAfterConflict();
    return pending(next, now());
  };
  if (job.phase === "waiting-upload") return submitRetainedPlan(claimed);
  if (job.phase === "reconciling") return reconcileRetainedPlan(claimed);
  if (job.phase === "verifying") {
    if (!job.submission) return fail(claimed, "INVALID_PREVIEW_STATE");
    try {
      recordAudiencePreviewStage("profile-verification", "started");
      const inspection = await (
        dependencies.importer ||
        createPreviewProfileImporter(undefined, transport)
      ).inspect(job.plan, job.submission);
      if (inspection.status === "pending") return release({ ...claimedJob });
      if (inspection.status !== "verified" || !UUID.test(inspection.profileId))
        return fail(claimed, "IMPORT_VERIFICATION_FAILED");
      recordAudiencePreviewStage("profile-verification", "ready");
      return release({
        ...claimedJob,
        phase: "binding",
        profileId: inspection.profileId,
        bindingStartedAt: now(),
      });
    } catch (error) {
      recordAudiencePreviewStage("profile-verification", "unconfirmed", {
        code: error instanceof AudiencePreviewError ? error.code : undefined,
      });
      if (error instanceof AudiencePreviewError && !error.retryable)
        return fail(claimed, error.code);
      return release({ ...claimedJob });
    }
  }
  if (job.phase !== "binding" || !job.profileId || !UUID.test(job.profileId))
    return fail(claimed, "INVALID_PREVIEW_STATE");
  const bindingDeadlineExceeded = () =>
    now() - (job.bindingStartedAt || job.createdAt) > BINDING_DEADLINE_MS;
  // An existing browser must get one final read before a timeout is persisted.
  if (!job.browserId && bindingDeadlineExceeded())
    return fail(claimed, "PROFILE_LINK_TIMEOUT");
  recordAudiencePreviewStage("profile-binding", "started");
  const headers = {
    "x-sitecore-contextid": dependencies.contextId,
    Accept: "application/json",
  };
  try {
    if (!job.browserId) {
      const endpoint = new URL(
        "/v1/events/v1.2/browser/create.json?client_key=",
        dependencies.edgeUrl,
      );
      const response = await transport(endpoint, {
        headers,
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        recordAudiencePreviewStage("profile-binding", "unconfirmed", {
          status: response.status,
        });
        return release({ ...claimedJob });
      }
      const body = await responseObject(response);
      if (typeof body.ref !== "string" || !UUID.test(body.ref))
        return fail(claimed, "INVALID_BROWSER_RESPONSE");
      return release({ ...claimedJob, browserId: body.ref.toLowerCase() });
    }
    if (!UUID.test(job.browserId))
      return fail(claimed, "INVALID_PREVIEW_STATE");
    const ref = await readRef(
      {
        edgeUrl: dependencies.edgeUrl,
        contextId: dependencies.contextId,
        browserId: job.browserId,
      },
      AbortSignal.timeout(8_000),
      transport,
    );
    if (ref?.toLowerCase() === job.profileId.toLowerCase()) {
      const ready: ProfileJob = { ...claimedJob, phase: "ready" };
      delete ready.lease;
      delete ready.nextAttemptAt;
      if (!(await save(claimed, ready))) return resultAfterConflict();
      recordAudiencePreviewStage("profile-binding", "ready");
      return {
        status: "ready",
        profile: {
          selectorHash,
          identity: job.plan.identity,
          profileId: job.profileId,
          browserId: job.browserId,
        },
      };
    }
    if (bindingDeadlineExceeded()) return fail(claimed, "PROFILE_LINK_TIMEOUT");
    if (job.identitySent) return release({ ...claimedJob });
    // Persist before the event. Even if its response is lost, polling only checks the same binding.
    const sent: ProfileJob = { ...claimedJob, identitySent: true };
    const recorded = await save(claimed, sent);
    if (!recorded) return resultAfterConflict();
    const endpoint = new URL("/v1/events/v1.2/events", dependencies.edgeUrl);
    endpoint.searchParams.set("siteId", siteName);
    try {
      const response = await transport(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({
          browser_id: job.browserId,
          channel: "WEB",
          client_key: "",
          currency: "USD",
          language: "EN",
          page: "Audience Preview",
          pos: "",
          requested_at: new Date(now()).toISOString(),
          type: "IDENTITY",
          identifiers: [{ provider: PREVIEW_PROVIDER, id: job.plan.identity }],
          ext: { previewOnly: true },
        }),
      });
      recordAudiencePreviewStage(
        "identity-event",
        response.ok ? "accepted" : "unconfirmed",
        { status: response.status },
      );
      void response.body?.cancel().catch(() => undefined);
    } catch {
      recordAudiencePreviewStage("identity-event", "unconfirmed");
      /* A lost event receipt is resolved by read-only browser/show polling, never by replay. */
    }
    delete sent.lease;
    sent.nextAttemptAt = now() + RETRY_SECONDS * 1000;
    if (!(await save(recorded, sent))) return resultAfterConflict();
    return pending(sent, now());
  } catch (error) {
    if (error instanceof AudiencePreviewError && !error.retryable)
      return fail(claimed, error.code);
    return release({ ...claimedJob });
  }
}
