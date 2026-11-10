export const CATALOG_FAILURE_STAGES = [
  "profile-preparation",
  "native-decision",
  "page-layout",
  "unrecorded",
] as const;
export const CATALOG_FAILURE_CODES = [
  "UNRECORDED_FAILURE",
  "PREVIEW_UNAVAILABLE",
  "INVALID_AUDIENCE",
  "PREVIEW_NOT_CONFIGURED",
  "INVALID_PREVIEW_STATE",
  "PREVIEW_STATE_UNAVAILABLE",
  "IMPORT_NOT_CONFIGURED",
  "IMPORT_UPLOAD_UNCONFIRMED",
  "IMPORT_VERIFICATION_FAILED",
  "IMPORT_READ_UNAVAILABLE",
  "PROFILE_LINK_TIMEOUT",
  "INVALID_BROWSER_RESPONSE",
  "INVALID_PREVIEW_PROFILE",
  "PREVIEW_BINDING_CHANGED",
  "PREVIEW_DISCOVERY_UNAVAILABLE",
  "INVALID_NATIVE_DISCOVERY",
  "INVALID_NATIVE_DECISION",
  "INVALID_NATIVE_RESPONSE",
  "NATIVE_DECISION_UNAVAILABLE",
  "PREVIEW_RECEIPT_MISMATCH",
  "CONFIGURATION_REQUIRED",
  "AUTHENTICATION_REQUIRED",
  "PAGE_ACCESS_DENIED",
] as const;
export const CATALOG_PROFILE_PHASES = [
  "uploading",
  "waiting-upload",
  "reconciling",
  "verifying",
  "binding",
  "ready",
  "catalog",
  "failed",
] as const;
export type CatalogProfilePhase = (typeof CATALOG_PROFILE_PHASES)[number];
export type CatalogFailureStage = (typeof CATALOG_FAILURE_STAGES)[number];
export type CatalogFailureCode = (typeof CATALOG_FAILURE_CODES)[number];
export interface AudiencePreparationFailure {
  index: number;
  stage: CatalogFailureStage;
  code: CatalogFailureCode;
  status?: number;
  source?: "existing" | "bulk";
  profilePhase?: CatalogProfilePhase;
  profileCode?: CatalogFailureCode;
  identitySent?: boolean;
  hasCatalogProof?: boolean;
  hasSubmissionProof?: boolean;
}
export function isCatalogFailureStage(
  value: unknown,
): value is CatalogFailureStage {
  return CATALOG_FAILURE_STAGES.some((stage) => stage === value);
}
export function isCatalogFailureCode(
  value: unknown,
): value is CatalogFailureCode {
  return CATALOG_FAILURE_CODES.some((code) => code === value);
}
function isFailure(
  value: unknown,
  total: number,
): value is AudiencePreparationFailure {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    Object.keys(row).every((key) =>
      [
        "index",
        "stage",
        "code",
        "status",
        "source",
        "profilePhase",
        "profileCode",
        "identitySent",
        "hasCatalogProof",
        "hasSubmissionProof",
      ].includes(key),
    ) &&
    Number.isInteger(row.index) &&
    Number(row.index) >= 0 &&
    Number(row.index) < total &&
    isCatalogFailureStage(row.stage) &&
    isCatalogFailureCode(row.code) &&
    (row.source === undefined ||
      row.source === "existing" ||
      row.source === "bulk") &&
    (row.profilePhase === undefined ||
      CATALOG_PROFILE_PHASES.some((phase) => phase === row.profilePhase)) &&
    (row.profileCode === undefined || isCatalogFailureCode(row.profileCode)) &&
    [row.identitySent, row.hasCatalogProof, row.hasSubmissionProof].every(
      (flag) => flag === undefined || typeof flag === "boolean",
    ) &&
    (row.status === undefined ||
      (Number.isInteger(row.status) &&
        Number(row.status) >= 400 &&
        Number(row.status) <= 599))
  );
}

export interface AudiencePreparationProgress {
  status: "idle" | "pending" | "ready" | "failed";
  total: number;
  readyCount: number;
  pendingCount: number;
  failedCount: number;
  retryAfterSeconds?: number;
  message?: string;
  failedRows?: AudiencePreparationFailure[];
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
    (candidate.failedRows === undefined ||
      (Array.isArray(candidate.failedRows) &&
        candidate.failedRows.length <= Number(candidate.failedCount) &&
        candidate.failedRows.every((row) => isFailure(row, expectedTotal)) &&
        new Set(candidate.failedRows.map((row) => row.index)).size ===
          candidate.failedRows.length)) &&
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
