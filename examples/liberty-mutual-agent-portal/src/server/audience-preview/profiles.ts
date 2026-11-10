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
  type PreviewImportPlan,
  type PreviewImportSubmission,
  type PreviewProfileImporter,
} from "./importer";

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
  | { status: "pending"; retryAfterSeconds: number }
  | { status: "ready"; profile: VerifiedPreviewProfile };

interface ProfileJob {
  schemaVersion: typeof PREVIEW_SCHEMA_VERSION;
  phase: "uploading" | "verifying" | "binding" | "ready" | "failed";
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

function pending(job: ProfileJob, now: number): AudienceProfilePreparation {
  return {
    status: "pending",
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
  const key = `${namespace}:audience-preview:v${PREVIEW_SCHEMA_VERSION}:${selectorHash}`;
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
    if (latest.value.phase === "failed") jobFailure(latest.value.code);
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
    const job = { ...previous.value, phase: "failed" as const, code };
    delete job.lease;
    await save(previous, job);
    return jobFailure(code);
  };
  if (!current) {
    // Only the CAS winner may submit. An unknown upload outcome is never retried automatically.
    const job: ProfileJob = {
      schemaVersion: PREVIEW_SCHEMA_VERSION,
      phase: "uploading",
      createdAt: now(),
      plan: prepareAudienceProfileImport(audience, namespace, siteName, uuid()),
      lease: { id: uuid(), expiresAt: now() + LEASE_MS },
    };
    current = await store.compareAndSet(key, null, job, null);
    if (!current) return resultAfterConflict();
    try {
      const importer =
        dependencies.importer ||
        createPreviewProfileImporter(undefined, transport);
      const submission = await importer.submit(job.plan);
      if (
        !UUID.test(submission.batchId) ||
        submission.checksumMd5 !== job.plan.checksumMd5 ||
        submission.fileSizeBytes !== job.plan.fileSizeBytes
      )
        return fail(current, "IMPORT_UPLOAD_UNCONFIRMED");
      const next = { ...job, phase: "verifying" as const, submission };
      delete next.lease;
      if (!(await save(current, next))) return resultAfterConflict();
      return pending(next, now());
    } catch {
      return fail(current, "IMPORT_UPLOAD_UNCONFIRMED");
    }
  }
  const job = current.value;
  if (
    job.schemaVersion !== PREVIEW_SCHEMA_VERSION ||
    job.plan.selectorHash !== selectorHash ||
    job.plan.identity !== PREVIEW_IDENTITY_PREFIX + selectorHash
  )
    return jobFailure("INVALID_PREVIEW_STATE");
  if (job.phase === "failed") return jobFailure(job.code);
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
  if (job.phase === "verifying") {
    if (!job.submission) return fail(claimed, "INVALID_PREVIEW_STATE");
    try {
      const inspection = await (
        dependencies.importer ||
        createPreviewProfileImporter(undefined, transport)
      ).inspect(job.plan, job.submission);
      if (inspection.status === "pending") return release({ ...claimedJob });
      if (inspection.status !== "verified" || !UUID.test(inspection.profileId))
        return fail(claimed, "IMPORT_VERIFICATION_FAILED");
      return release({
        ...claimedJob,
        phase: "binding",
        profileId: inspection.profileId,
        bindingStartedAt: now(),
      });
    } catch (error) {
      if (error instanceof AudiencePreviewError && !error.retryable)
        return fail(claimed, error.code);
      return release({ ...claimedJob });
    }
  }
  if (job.phase !== "binding" || !job.profileId || !UUID.test(job.profileId))
    return fail(claimed, "INVALID_PREVIEW_STATE");
  if (now() - (job.bindingStartedAt || job.createdAt) > BINDING_DEADLINE_MS)
    return fail(claimed, "PROFILE_LINK_TIMEOUT");
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
      if (!response.ok) return release({ ...claimedJob });
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
      void response.body?.cancel().catch(() => undefined);
    } catch {
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
