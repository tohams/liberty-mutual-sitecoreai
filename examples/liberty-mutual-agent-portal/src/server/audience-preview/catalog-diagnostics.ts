import "server-only";
import {
  CATALOG_FAILURE_CODES,
  CATALOG_FAILURE_STAGES,
} from "@/features/audience-preview/preparation-types";

export type CatalogFailureStage =
  "profile-preparation" | "native-decision" | "page-layout" | "unrecorded";
export interface CatalogRowFailure {
  index: number;
  stage: CatalogFailureStage;
  code: string;
  status?: number;
  source?: "existing" | "bulk";
  profilePhase?:
    | "uploading"
    | "waiting-upload"
    | "reconciling"
    | "verifying"
    | "binding"
    | "ready"
    | "catalog"
    | "failed";
  profileCode?: string;
  identitySent?: boolean;
  hasCatalogProof?: boolean;
  hasSubmissionProof?: boolean;
}
const codes = new Set<string>(CATALOG_FAILURE_CODES);
const stages = new Set<string>(CATALOG_FAILURE_STAGES);
const profilePhases = new Set([
  "uploading",
  "waiting-upload",
  "reconciling",
  "verifying",
  "binding",
  "ready",
  "catalog",
  "failed",
]);
const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** Retain only fixed diagnostics; native messages, responses, identifiers and credentials never cross this boundary. */
export function catalogRowFailure(
  index: number,
  stage: CatalogFailureStage,
  error: unknown,
): CatalogRowFailure {
  const outer = record(error);
  const response = record(outer?.response);
  const cause = record(outer?.cause);
  const code =
    typeof outer?.code === "string" && codes.has(outer.code)
      ? outer.code
      : "PREVIEW_UNAVAILABLE";
  const status = [
    outer?.status,
    outer?.statusCode,
    response?.status,
    cause?.status,
    cause?.statusCode,
  ].find(
    (value): value is number =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 400 &&
      value <= 599,
  );
  return { index, stage, code, ...(status !== undefined ? { status } : {}) };
}

/** Stored rows are sanitized again before returning authenticated progress. */
export function storedCatalogRowFailure(
  index: number,
  value: unknown,
): CatalogRowFailure {
  const stored = record(value);
  const stage =
    typeof stored?.stage === "string" && stages.has(stored.stage)
      ? (stored.stage as CatalogFailureStage)
      : "unrecorded";
  const diagnostic = catalogRowFailure(index, stage, stored);
  if (!stored)
    return { index, stage: "unrecorded", code: "UNRECORDED_FAILURE" };
  return {
    ...diagnostic,
    ...(stored.source === "existing" || stored.source === "bulk"
      ? { source: stored.source }
      : {}),
    ...(typeof stored.profilePhase === "string" &&
    profilePhases.has(stored.profilePhase)
      ? {
          profilePhase:
            stored.profilePhase as CatalogRowFailure["profilePhase"],
        }
      : {}),
    ...(typeof stored.profileCode === "string" && codes.has(stored.profileCode)
      ? { profileCode: stored.profileCode }
      : {}),
    ...(typeof stored.identitySent === "boolean"
      ? { identitySent: stored.identitySent }
      : {}),
    ...(typeof stored.hasCatalogProof === "boolean"
      ? { hasCatalogProof: stored.hasCatalogProof }
      : {}),
    ...(typeof stored.hasSubmissionProof === "boolean"
      ? { hasSubmissionProof: stored.hasSubmissionProof }
      : {}),
  };
}

export function recordCatalogRowFailure(
  failure: CatalogRowFailure,
  outcome: "pending" | "failed",
): void {
  if (
    !Number.isInteger(failure.index) ||
    failure.index < 0 ||
    failure.index >= 42
  )
    return;
  console.info("Audience Preview catalog row", {
    ...storedCatalogRowFailure(failure.index, failure),
    outcome,
  });
}
