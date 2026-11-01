import "server-only";
import { randomUUID } from "node:crypto";
import type {
  MarketingPreferenceAction,
  MarketingPreferencePhase,
  MarketingPreferenceProfile,
  MarketingPreferenceStatus,
} from "@/features/workshops/preferences/preferences.types";
import { PortalError } from "../errors";
import {
  getStateStore,
  stateNamespace,
  type StateStore,
  type StoredValue,
} from "../state/store";
import {
  PREFERENCE_IDENTIFIERS,
  prepareMarketingPreferences,
  type PreferencePlan,
} from "./marketing-preference-plan";
import {
  marketingPreferenceTransport,
  PreferenceImportError,
  type PreferenceSubmission,
  type PreferenceTransport,
  type PreferenceVerification,
} from "./marketing-preference-import";

interface PreferenceJob {
  operationId: string;
  action: MarketingPreferenceAction;
  status: Exclude<MarketingPreferencePhase, "idle">;
  plan: PreferencePlan;
  startedAt: number;
  submission?: PreferenceSubmission;
  counts?: { CREATED: number; UPDATED: number; FAILED: number };
}
interface PreferenceState {
  schemaVersion: 1;
  job: PreferenceJob;
  verifiedProfiles: MarketingPreferenceProfile[];
}
export interface PreferenceDependencies {
  store?: StateStore;
  transport?: PreferenceTransport;
  now?: () => number;
}
const ACTIVE = new Set<MarketingPreferencePhase>([
  "uploading",
  "queued",
  "pending",
  "upload-uncertain",
]);
const messages: Record<MarketingPreferencePhase, string> = {
  idle: "Load the two comparison profiles before recording a preference change.",
  uploading:
    "The preference file is being submitted once to SitecoreAI. Check import status for progress.",
  queued:
    "SitecoreAI accepted the preference file and queued it for processing. Check import status to verify completion.",
  pending:
    "SitecoreAI is processing the same preference import. Check its status again shortly.",
  verified:
    "The native import completed, and its record results match the submitted preferences. Open the profiles and audience to inspect the effect.",
  rejected:
    "SitecoreAI rejected the upload before queueing it. Check native import history and configuration before trying another action.",
  "upload-uncertain":
    "The upload acknowledgement could not be confirmed. A second upload is blocked. Check native Profile import history using the operation ID before taking further action.",
  failed:
    "The native import could not be verified. Inspect its history and results before correcting the source or starting another action.",
};
function key() {
  return `${stateNamespace()}:workshop:marketing-preferences`;
}
function publicProfile(
  profile: PreferencePlan["profiles"][number],
): MarketingPreferenceProfile {
  return {
    identifier: profile.identifier,
    displayName: profile.displayName,
    agencyName: profile.agencyName,
    state: profile.state,
    role: profile.role,
    marketingSuppressed: profile.marketingSuppressed,
  };
}
function view(
  state: PreferenceState | undefined,
  now: number,
): MarketingPreferenceStatus {
  const job = state?.job;
  const status: MarketingPreferencePhase =
    job?.status === "uploading" && now - job.startedAt > 60000
      ? "upload-uncertain"
      : (job?.status ?? "idle");
  const base =
    prepareMarketingPreferences("baseline").profiles.map(publicProfile);
  const profiles = base.map((profile) => {
    const known = state?.verifiedProfiles.find(
      (entry) => entry.identifier === profile.identifier,
    );
    const submitted = job?.plan.profiles.find(
      (entry) => entry.identifier === profile.identifier,
    );
    return {
      ...profile,
      ...known,
      ...(submitted ? publicProfile(submitted) : {}),
    };
  });
  return {
    status,
    ...(job ? { operationId: job.operationId, action: job.action } : {}),
    ...(job?.submission ? { batchId: job.submission.batchId } : {}),
    profiles,
    ...(job?.counts ? { counts: job.counts } : {}),
    message: messages[status],
    canSubmit: !ACTIVE.has(status),
    canInspect:
      !!job?.submission && ["queued", "pending", "failed"].includes(status),
    ...(["uploading", "queued", "pending"].includes(status)
      ? { retryAfterSeconds: 3 }
      : {}),
  };
}
export function parseMarketingPreferenceAction(
  body: unknown,
): MarketingPreferenceAction {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PortalError("INVALID_INPUT", "Choose a preference action.");
  const input = body as Record<string, unknown>;
  if (
    Object.keys(input).length !== 1 ||
    typeof input.action !== "string" ||
    !["baseline", "optout"].includes(input.action)
  )
    throw new PortalError(
      "INVALID_INPUT",
      "Choose one supported preference action.",
    );
  return input.action as MarketingPreferenceAction;
}
export function parseMarketingPreferenceBatch(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PortalError("INVALID_INPUT", "Enter a native import batch ID.");
  const input = body as Record<string, unknown>;
  if (
    Object.keys(input).length !== 1 ||
    typeof input.batchId !== "string" ||
    !/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(
      input.batchId,
    )
  )
    throw new PortalError(
      "INVALID_INPUT",
      "Enter one native import batch ID in UUID format.",
    );
  return input.batchId.toLowerCase();
}
function services(dependencies: PreferenceDependencies) {
  return {
    store: dependencies.store ?? getStateStore(),
    transport: dependencies.transport ?? marketingPreferenceTransport,
    now: dependencies.now ?? Date.now,
  };
}
async function update(
  store: StateStore,
  current: StoredValue<PreferenceState>,
  value: PreferenceState,
) {
  const saved = await store.compareAndSet(key(), current.version, value, null);
  return saved ?? (await store.read<PreferenceState>(key()));
}
function verifiedState(
  state: PreferenceState,
  verification: PreferenceVerification,
  verifiedAt: number,
  submission = state.job.submission,
): PreferenceState {
  const job = state.job;
  const { CREATED, UPDATED, FAILED } = verification.counts;
  if (
    ![CREATED, UPDATED, FAILED].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    FAILED !== 0 ||
    CREATED + UPDATED !== job.plan.profiles.length ||
    verification.profiles.length !== job.plan.profiles.length ||
    new Set(verification.profiles.map((entry) => entry.identifier)).size !==
      job.plan.profiles.length ||
    new Set(verification.profiles.map((entry) => entry.profileId)).size !==
      job.plan.profiles.length
  )
    throw new PreferenceImportError("VERIFICATION_FAILED");
  const verifiedProfiles = [...state.verifiedProfiles];
  for (const profile of job.plan.profiles) {
    const confirmed = verification.profiles.find(
      (entry) => entry.identifier === profile.identifier,
    );
    if (!confirmed) throw new PreferenceImportError("VERIFICATION_FAILED");
    const old = verifiedProfiles.find(
      (entry) => entry.identifier === profile.identifier,
    );
    if (old?.profileId && old.profileId !== confirmed.profileId)
      throw new PreferenceImportError("VERIFICATION_FAILED");
    const value = {
      ...publicProfile(profile),
      profileId: confirmed.profileId,
      verifiedAt: new Date(verifiedAt).toISOString(),
    };
    if (old) verifiedProfiles.splice(verifiedProfiles.indexOf(old), 1, value);
    else verifiedProfiles.push(value);
  }
  return {
    ...state,
    verifiedProfiles,
    job: {
      ...job,
      status: "verified",
      submission,
      counts: verification.counts,
    },
  };
}

export async function getMarketingPreferenceStatus(
  inspect = false,
  dependencies: PreferenceDependencies = {},
): Promise<MarketingPreferenceStatus> {
  const { store, transport, now } = services(dependencies);
  const current = await store.read<PreferenceState>(key());
  if (
    !current ||
    !inspect ||
    !current.value.job.submission ||
    !["queued", "pending", "failed"].includes(current.value.job.status)
  )
    return view(current?.value, now());
  const state = current.value,
    job = state.job;
  let next: PreferenceState;
  try {
    const result = await transport.inspect(job.plan, job.submission!);
    if (result.status === "pending")
      next = { ...state, job: { ...job, status: "pending" } };
    else next = verifiedState(state, result.verification, now());
  } catch (error) {
    if (
      error instanceof PreferenceImportError &&
      error.code === "VERIFICATION_FAILED"
    )
      next = { ...state, job: { ...job, status: "failed" } };
    else
      throw new PortalError(
        "IMPORT_READ_UNAVAILABLE",
        "Native verification is temporarily unavailable. Check import status again; no new upload is needed.",
        503,
      );
  }
  const saved = await update(store, current, next);
  return view(saved?.value, now());
}

/** Reattach only a completed, matching native import; this path never uploads. */
export async function recoverMarketingPreferenceImport(
  batchId: string,
  dependencies: PreferenceDependencies = {},
): Promise<MarketingPreferenceStatus> {
  batchId = parseMarketingPreferenceBatch({ batchId });
  const { store, transport, now } = services(dependencies);
  const current = await store.read<PreferenceState>(key());
  if (
    !current ||
    current.value.job.submission ||
    view(current.value, now()).status !== "upload-uncertain"
  )
    throw new PortalError(
      "IMPORT_RECOVERY_UNAVAILABLE",
      "There is no unconfirmed upload to recover. Refresh the import status.",
      409,
    );
  const { job } = current.value;
  const submission: PreferenceSubmission = {
    batchId,
    checksumMd5: job.plan.checksumMd5,
    fileSizeBytes: job.plan.fileSizeBytes,
  };
  let next: PreferenceState;
  try {
    transport.assertConfigured();
    const result = await transport.inspect(job.plan, submission, {
      uploadedAfter: job.startedAt,
      uploadedBefore: now(),
    });
    if (result.status === "pending")
      return {
        ...view(current.value, now()),
        message:
          "SitecoreAI is still processing this batch. Wait until its native import status is Completed, then recover it again. No new file has been uploaded.",
        retryAfterSeconds: 3,
      };
    next = verifiedState(current.value, result.verification, now(), submission);
  } catch (error) {
    if (
      error instanceof PreferenceImportError &&
      error.code === "VERIFICATION_FAILED"
    )
      throw new PortalError(
        "IMPORT_RECOVERY_MISMATCH",
        "This completed batch does not match the unconfirmed upload and its known profiles. Check the native import history and batch ID.",
        409,
      );
    if (error instanceof PortalError) throw error;
    throw new PortalError(
      "IMPORT_READ_UNAVAILABLE",
      "Native verification is temporarily unavailable. Try recovering the same batch again; no new upload is needed.",
      503,
    );
  }
  const saved = await store.compareAndSet(key(), current.version, next, null);
  if (!saved)
    throw new PortalError(
      "IMPORT_RECOVERY_CONFLICT",
      "The import checkpoint changed during verification. Refresh its status before continuing.",
      409,
    );
  return view(saved.value, now());
}

export async function requestMarketingPreferenceImport(
  action: MarketingPreferenceAction,
  dependencies: PreferenceDependencies = {},
): Promise<MarketingPreferenceStatus> {
  if (!["baseline", "optout"].includes(action))
    throw new PortalError(
      "INVALID_INPUT",
      "Choose one supported preference action.",
    );
  const { store, transport, now } = services(dependencies);
  transport.assertConfigured();
  const current = await store.read<PreferenceState>(key());
  if (current && ACTIVE.has(current.value.job.status))
    return view(current.value, now());
  if (
    action === "optout" &&
    !PREFERENCE_IDENTIFIERS.every((identifier) =>
      current?.value.verifiedProfiles.some(
        (profile) => profile.identifier === identifier && profile.profileId,
      ),
    )
  )
    throw new PortalError(
      "BASELINE_REQUIRED",
      "Load the preference examples and verify their import before recording Cameron's opt-out.",
      409,
    );
  const job: PreferenceJob = {
    operationId: randomUUID(),
    action,
    status: "uploading",
    plan: prepareMarketingPreferences(action),
    startedAt: now(),
  };
  const state: PreferenceState = {
    schemaVersion: 1,
    job,
    verifiedProfiles: current?.value.verifiedProfiles ?? [],
  };
  // Persistent CAS checkpoint precedes the only native POST. Concurrent clicks return it.
  const claimed = await store.compareAndSet(
    key(),
    current?.version ?? null,
    state,
    null,
  );
  if (!claimed)
    return view((await store.read<PreferenceState>(key()))?.value, now());
  let next: PreferenceState;
  try {
    const submission = await transport.submit(job.plan, job.operationId);
    next = { ...state, job: { ...job, status: "queued", submission } };
  } catch (error) {
    next = {
      ...state,
      job: {
        ...job,
        status:
          error instanceof PreferenceImportError &&
          error.code === "UPLOAD_REJECTED"
            ? "rejected"
            : "upload-uncertain",
      },
    };
  }
  // If persistence is uncertain, the existing uploading checkpoint blocks re-upload.
  const saved = await update(store, claimed, next);
  return view(saved?.value, now());
}
