import type {
  WorkshopResetOperation,
  WorkshopResetRequest,
  WorkshopResetStatus,
} from "./reset.types";

import manifest from "../../../fixtures/manifest.json";
const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** Accept only a resumable reference, never a legacy reset mode or arbitrary stored fields. */
export function parsePersistedResetIntent(
  pack: string,
  raw: unknown,
): WorkshopResetRequest | null {
  if (!manifest.reviewerPacks.includes(pack)) return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    input.reviewerPack !== pack ||
    input.mode !== "restart" ||
    typeof input.requestId !== "string" ||
    !UUID.test(input.requestId) ||
    typeof input.expectedRunId !== "string" ||
    !UUID.test(input.expectedRunId) ||
    (input.resumeVerification !== undefined &&
      typeof input.resumeVerification !== "boolean")
  )
    return null;
  return {
    reviewerPack: pack,
    mode: "restart",
    requestId: input.requestId,
    expectedRunId: input.expectedRunId,
    ...(input.resumeVerification === true ? { resumeVerification: true } : {}),
  };
}

export interface ResetRecovery {
  intent: WorkshopResetRequest | null;
  success: WorkshopResetOperation | null;
  error: string;
  notice: string;
  blockNewRequest: boolean;
}

function requestFor(operation: WorkshopResetOperation): WorkshopResetRequest {
  return {
    reviewerPack: operation.reviewerPack,
    mode: "restart",
    requestId: operation.requestId,
    expectedRunId: operation.expectedRunId,
    ...(operation.canResumeVerification ? { resumeVerification: true } : {}),
  };
}

/** Read-only recovery: this never sends, retries, or generates a new reset request. */
export function recoverResetState(
  status: WorkshopResetStatus,
  stored: WorkshopResetRequest | null,
): ResetRecovery {
  const result: ResetRecovery = {
    intent: null,
    success: null,
    error: "",
    notice: "",
    blockNewRequest: false,
  };
  const intent = parsePersistedResetIntent(status.reviewerPack, stored);
  const changed =
    "The saved work for this workshop number changed since that request. The current identities are shown below. Start a new reset only if you still need one.";
  const pending =
    status.pendingOperation?.status === "pending"
      ? status.pendingOperation
      : status.operation?.status === "pending"
        ? status.operation
        : null;
  if (pending) {
    if (
      pending.reviewerPack === status.reviewerPack &&
      pending.expectedRunId === status.runId
    ) {
      result.intent = requestFor(pending);
    } else {
      result.error =
        "The pending reset does not match the current workshop state. Refresh status before continuing.";
      result.blockNewRequest = true;
    }
    return result;
  }

  const operation = status.operation;
  if (operation && operation.reviewerPack !== status.reviewerPack) {
    result.error =
      "The reset receipt belongs to another workshop number. Refresh status before continuing.";
    result.blockNewRequest = true;
    return result;
  }
  if (operation?.status === "failed") {
    result.error =
      operation.message ||
      "The reset did not complete. The existing profiles remain active.";
    if (operation.expectedRunId !== status.runId) {
      result.notice = changed;
      return result;
    }
    if (operation.canResumeVerification) result.intent = requestFor(operation);
    result.blockNewRequest = operation.code === "UPLOAD_UNCERTAIN";
    return result;
  }
  if (operation?.status === "completed") {
    if (operation.runId !== status.runId) {
      result.notice = changed;
    } else if (intent?.requestId === operation.requestId) {
      result.success = operation;
    }
    return result;
  }
  if (intent) {
    if (intent.expectedRunId === status.runId) result.intent = intent;
    else result.notice = changed;
  }
  return result;
}
