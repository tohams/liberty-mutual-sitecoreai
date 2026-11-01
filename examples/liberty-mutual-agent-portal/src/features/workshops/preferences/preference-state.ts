import type { MarketingPreferenceStatus } from "./preferences.types";

export const MAX_AUTOMATIC_PREFERENCE_CHECKS = 8;
const PHASES = new Set([
  "idle",
  "uploading",
  "queued",
  "pending",
  "verified",
  "rejected",
  "upload-uncertain",
  "failed",
]);

export function isMarketingPreferenceStatus(
  value: unknown,
): value is MarketingPreferenceStatus {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.status === "string" &&
    PHASES.has(data.status) &&
    typeof data.canSubmit === "boolean" &&
    typeof data.canInspect === "boolean" &&
    typeof data.message === "string" &&
    Array.isArray(data.profiles) &&
    data.profiles.every((profile) => {
      if (!profile || typeof profile !== "object") return false;
      const item = profile as Record<string, unknown>;
      return (
        typeof item.identifier === "string" &&
        typeof item.displayName === "string" &&
        typeof item.agencyName === "string" &&
        item.state === "TX" &&
        item.role === "producer" &&
        typeof item.marketingSuppressed === "boolean"
      );
    })
  );
}

export function preferenceSubmissionAllowed(
  status: MarketingPreferenceStatus | null,
  busy: boolean,
  submissionUncertain: boolean,
): boolean {
  return Boolean(status?.canSubmit && !busy && !submissionUncertain);
}

export function preferenceOptOutAllowed(
  status: MarketingPreferenceStatus | null,
  busy: boolean,
  submissionUncertain: boolean,
): boolean {
  return (
    preferenceSubmissionAllowed(status, busy, submissionUncertain) &&
    status?.status === "verified" &&
    status.action === "baseline"
  );
}

export function preferenceIsProcessing(
  status: MarketingPreferenceStatus | null,
): boolean {
  return Boolean(
    status && ["uploading", "queued", "pending"].includes(status.status),
  );
}

export function preferenceAutomaticCheckAllowed(
  status: MarketingPreferenceStatus | null,
  busy: boolean,
  error: string,
  checkCount: number,
): boolean {
  return (
    !busy &&
    !error &&
    Boolean(status?.canInspect) &&
    preferenceIsProcessing(status) &&
    checkCount < MAX_AUTOMATIC_PREFERENCE_CHECKS
  );
}

export function preferenceRecoveryAllowed(
  status: MarketingPreferenceStatus | null,
  busy: boolean,
  batchId: string,
): boolean {
  return (
    status?.status === "upload-uncertain" &&
    !busy &&
    /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(
      batchId.trim(),
    )
  );
}
