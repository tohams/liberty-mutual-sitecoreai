import "server-only";
import { getProfileIdentifier } from "../auth/profile-identity";
import { fixtures } from "../data/fixtures";
import {
  getPack,
  requireReviewerPack,
  type PackMetadata,
  type RestartJob,
  type RestartReceipt,
} from "../data/pack-state";
import {
  requestReviewerRestart,
  type ProfileImporter,
} from "../data/reviewer-restart";
import { PortalError } from "../errors";
import { getStateStore, stateNamespace, type StateStore } from "../state/store";
import { assertConfigured } from "../udl/profile-import";
import type {
  WorkshopResetOperation,
  WorkshopResetRequest,
  WorkshopResetResult,
  WorkshopResetStatus,
} from "@/features/workshops/reset.types";

const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export interface WorkshopResetDependencies {
  store?: StateStore;
  importer?: ProfileImporter;
  now?: () => number;
}

export function requireResetRequestId(
  value: unknown,
  label = "request ID",
): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value))
    throw new PortalError("INVALID_INPUT", `Provide a valid ${label}.`);
}

export function parseWorkshopResetRequest(body: unknown): WorkshopResetRequest {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PortalError("INVALID_INPUT", "Choose a reviewer number.");
  const input = body as Record<string, unknown>;
  const allowed = new Set([
    "reviewerPack",
    "mode",
    "requestId",
    "expectedRunId",
    "resumeVerification",
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key)))
    throw new PortalError(
      "INVALID_INPUT",
      "This reset request contains unsupported fields.",
    );
  if (typeof input.reviewerPack !== "string")
    throw new PortalError("INVALID_INPUT", "Choose a valid reviewer number.");
  requireReviewerPack(input.reviewerPack);
  if (input.mode !== "restart")
    throw new PortalError(
      "INVALID_INPUT",
      "This request must perform a complete reviewer reset.",
    );
  requireResetRequestId(input.requestId);
  requireResetRequestId(input.expectedRunId, "current run ID");
  if (
    input.resumeVerification !== undefined &&
    typeof input.resumeVerification !== "boolean"
  ) {
    throw new PortalError(
      "INVALID_INPUT",
      "Verification recovery applies only to a profile restart.",
    );
  }
  return {
    reviewerPack: input.reviewerPack,
    mode: input.mode,
    requestId: input.requestId,
    expectedRunId: input.expectedRunId,
    ...(input.resumeVerification !== undefined
      ? { resumeVerification: input.resumeVerification }
      : {}),
  };
}

function publicReceipt(
  receipt: RestartReceipt,
  metadata: PackMetadata,
): WorkshopResetOperation {
  const code = [
    "UPLOAD_UNCERTAIN",
    "IMPORT_VERIFICATION_FAILED",
    "PROFILE_IMPORT_FAILED",
  ].includes(receipt.code ?? "")
    ? receipt.code
    : receipt.status === "failed"
      ? "RESET_FAILED"
      : undefined;
  const messages: Record<string, string> = {
    UPLOAD_UNCERTAIN:
      "The import response could not be confirmed. The current profiles remain active. Check the native import before starting a different request.",
    IMPORT_VERIFICATION_FAILED:
      "The new profiles could not yet be verified. The current profiles remain active. You can retry verification of this same import when recovery is available.",
    PROFILE_IMPORT_FAILED:
      "The profile import was rejected. The current profiles remain active. Try a new request after the import issue is resolved.",
    RESET_FAILED:
      "The reset could not be completed. The current profiles remain active.",
  };
  const canResumeVerification =
    receipt.status === "failed" &&
    receipt.code === "IMPORT_VERIFICATION_FAILED" &&
    !!receipt.batchId &&
    UUID.test(receipt.batchId) &&
    receipt.expectedRunId === metadata.runId &&
    receipt.profileGeneration === metadata.profileGeneration &&
    receipt.targetGeneration === metadata.profileGeneration + 1 &&
    receipt.identityScope === stateNamespace() &&
    !metadata.pendingRestart;
  return {
    reviewerPack: receipt.reviewerPack,
    mode: receipt.mode,
    requestId: receipt.requestId,
    expectedRunId: receipt.expectedRunId,
    status: receipt.status,
    phase: receipt.phase,
    runId: receipt.runId,
    profileGeneration: receipt.profileGeneration,
    targetGeneration: receipt.targetGeneration,
    ...(receipt.status === "pending" && receipt.retryAfterSeconds
      ? { retryAfterSeconds: receipt.retryAfterSeconds }
      : {}),
    ...(code ? { code, message: messages[code] } : {}),
    canResumeVerification,
    requiresPortalSignIn: receipt.status === "completed",
  };
}

function pendingOperation(
  reviewerPack: string,
  job: RestartJob,
  now: number,
): WorkshopResetOperation {
  const next = Math.max(job.nextAttemptAt ?? 0, job.lease?.expiresAt ?? 0);
  return {
    reviewerPack,
    mode: "restart",
    requestId: job.requestId,
    expectedRunId: job.expectedRunId,
    status: "pending",
    phase: job.phase,
    runId: job.expectedRunId,
    profileGeneration: job.baseGeneration,
    targetGeneration: job.plan.generation,
    retryAfterSeconds: Math.max(3, Math.ceil((next - now) / 1000)),
    canResumeVerification: false,
    requiresPortalSignIn: false,
  };
}

function restartAvailable(importer?: ProfileImporter): boolean {
  try {
    (importer?.assertConfigured ?? assertConfigured)();
    return true;
  } catch {
    return false;
  }
}

function statusFrom(
  reviewerPack: string,
  metadata: PackMetadata,
  requestId?: string,
  now = Date.now(),
  importer?: ProfileImporter,
): WorkshopResetStatus {
  const pending = metadata.pendingRestart
    ? pendingOperation(reviewerPack, metadata.pendingRestart, now)
    : null;
  const receipts = [
    ...Object.values(metadata.restartReceipts ?? {}).map((receipt) => ({
      receipt,
      at: receipt.verifiedAt ?? receipt.failedAt ?? "",
    })),
  ];
  const receipt = requestId
    ? metadata.restartReceipts?.[requestId]
    : receipts.sort((a, b) => b.at.localeCompare(a.at))[0]?.receipt;
  return {
    reviewerPack,
    restartAvailable: restartAvailable(importer),
    runId: metadata.runId,
    profileGeneration: metadata.profileGeneration,
    profiles: fixtures.agents.map((agent) => {
      if (metadata.profileSet && !metadata.profileSet.identifiers[agent.id])
        throw new PortalError(
          "INVALID_STATE",
          "The current agent identities could not be confirmed.",
          409,
        );
      const profileId = metadata.profileSet?.verification.profiles.find(
        (profile) => profile.agentId === agent.id,
      )?.profileId;
      return {
        username: `${agent.id}.${reviewerPack}`,
        name: `${agent.name} - ${reviewerPack}`,
        identifier:
          metadata.profileSet?.identifiers[agent.id] ??
          getProfileIdentifier(
            reviewerPack,
            agent.id,
            metadata.profileGeneration,
          ),
        ...(profileId ? { profileId } : {}),
      };
    }),
    pendingOperation: pending,
    operation:
      pending && (!requestId || pending.requestId === requestId)
        ? pending
        : receipt
          ? publicReceipt(receipt, metadata)
          : null,
  };
}

export async function getWorkshopResetStatus(
  reviewerPack: string,
  requestId?: string,
  dependencies: WorkshopResetDependencies = {},
): Promise<WorkshopResetStatus> {
  requireReviewerPack(reviewerPack);
  if (requestId !== undefined) requireResetRequestId(requestId);
  const current = await getPack(
    dependencies.store ?? getStateStore(),
    reviewerPack,
  );
  return statusFrom(
    reviewerPack,
    current.value,
    requestId,
    dependencies.now?.(),
    dependencies.importer,
  );
}

export async function requestWorkshopReset(
  input: WorkshopResetRequest,
  dependencies: WorkshopResetDependencies = {},
): Promise<WorkshopResetResult> {
  const request = parseWorkshopResetRequest(input);
  const store = dependencies.store ?? getStateStore();
  let receipt: RestartReceipt;
  try {
    receipt = await requestReviewerRestart(
      {
        reviewerPack: request.reviewerPack,
        requestId: request.requestId,
        expectedRunId: request.expectedRunId,
        resumeVerification: request.resumeVerification,
      },
      { ...dependencies, store },
    );
  } catch (error) {
    if (
      error instanceof PortalError &&
      error.code === "CONFIGURATION_REQUIRED"
    ) {
      throw new PortalError(
        "CONFIGURATION_REQUIRED",
        "Native profile import is not configured for this environment.",
        503,
      );
    }
    throw error;
  }
  const current = await getPack(store, request.reviewerPack);
  return {
    ...statusFrom(
      request.reviewerPack,
      current.value,
      request.requestId,
      dependencies.now?.(),
      dependencies.importer,
    ),
    operation: publicReceipt(receipt, current.value),
  };
}
