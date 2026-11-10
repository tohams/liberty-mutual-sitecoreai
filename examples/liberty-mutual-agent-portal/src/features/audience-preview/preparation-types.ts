export interface AudiencePreparationProgress {
  status: "idle" | "pending" | "ready" | "failed";
  total: number;
  readyCount: number;
  pendingCount: number;
  failedCount: number;
  retryAfterSeconds?: number;
  message?: string;
}

export function isAudiencePreparationProgress(
  value: unknown,
  expectedTotal: number,
): value is AudiencePreparationProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    ["idle", "pending", "ready", "failed"].includes(String(candidate.status)) &&
    candidate.total === expectedTotal &&
    (candidate.status !== "ready" ||
      (candidate.readyCount === expectedTotal &&
        candidate.failedCount === 0)) &&
    [candidate.readyCount, candidate.pendingCount, candidate.failedCount].every(
      (count) =>
        Number.isInteger(count) &&
        Number(count) >= 0 &&
        Number(count) <= expectedTotal,
    ) &&
    Number(candidate.readyCount) +
      Number(candidate.pendingCount) +
      Number(candidate.failedCount) ===
      expectedTotal &&
    (candidate.message === undefined ||
      (typeof candidate.message === "string" &&
        candidate.message.length <= 300)) &&
    (candidate.retryAfterSeconds === undefined ||
      (typeof candidate.retryAfterSeconds === "number" &&
        Number.isFinite(candidate.retryAfterSeconds) &&
        candidate.retryAfterSeconds >= 1 &&
        candidate.retryAfterSeconds <= 60))
  );
}
