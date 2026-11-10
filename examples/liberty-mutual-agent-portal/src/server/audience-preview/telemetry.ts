import "server-only";

export type AudiencePreviewStage =
  | "profile-import"
  | "profile-verification"
  | "profile-binding"
  | "profile-preparation"
  | "identity-event"
  | "native-decision"
  | "page-layout"
  | "preview-session"
  | "request";
type Outcome =
  | "started"
  | "pending"
  | "ready"
  | "failed"
  | "recovered"
  | "accepted"
  | "unconfirmed";
const CODES = new Set([
  "INVALID_IMPORT_PLAN",
  "IMPORT_NOT_CONFIGURED",
  "IMPORT_QUEUE_BUSY",
  "IMPORT_TRANSPORT_UNCONFIRMED",
  "IMPORT_ACKNOWLEDGEMENT_INVALID",
  "IMPORT_UPLOAD_UNCONFIRMED",
  "IMPORT_VERIFICATION_FAILED",
  "IMPORT_READ_UNAVAILABLE",
  "PROFILE_LINK_TIMEOUT",
  "INVALID_PREVIEW_STATE",
  "INVALID_BROWSER_RESPONSE",
  "PREVIEW_STATE_UNAVAILABLE",
  "PREVIEW_PROFILE_FAILED",
  "PREVIEW_BINDING_CHANGED",
  "PREVIEW_DISCOVERY_UNAVAILABLE",
  "NATIVE_DECISION_UNAVAILABLE",
  "INVALID_NATIVE_RESPONSE",
  "INVALID_NATIVE_DECISION",
  "INVALID_PREVIEW_LAYOUT",
  "PREVIEW_LAYOUT_UNAVAILABLE",
  "PREVIEW_RECEIPT_MISMATCH",
  "INVALID_PREVIEW_PROFILE",
  "PREVIEW_NOT_CONFIGURED",
  "CONFIGURATION_REQUIRED",
  "AUTHENTICATION_REQUIRED",
  "PAGE_ACCESS_DENIED",
  "RATE_LIMITED",
  "PREVIEW_UNAVAILABLE",
  "SITECORE_UNAVAILABLE",
  "INVALID_SITECORE_RESPONSE",
  "INVALID_PAGE_SELECTION",
  "SITE_ACCESS_DENIED",
  "PAGE_OUTSIDE_SITE",
]);

const REASONS = new Set([
  "invalid-body",
  "invalid-batch-id",
  "checksum-mismatch",
  "file-size-mismatch",
  "unexpected-status",
]);

/** Fixed stage/outcome enums only. Never log selectors, identities, tokens, native bodies, or exception messages. */
export function recordAudiencePreviewStage(
  stage: AudiencePreviewStage,
  outcome: Outcome,
  details: { code?: unknown; status?: unknown; reason?: unknown } = {},
): void {
  const code =
    typeof details.code === "string" && CODES.has(details.code)
      ? details.code
      : details.code === undefined
        ? undefined
        : "PREVIEW_UNAVAILABLE";
  const status =
    typeof details.status === "number" &&
    Number.isInteger(details.status) &&
    details.status >= 100 &&
    details.status <= 599
      ? details.status
      : undefined;
  const reason =
    typeof details.reason === "string" && REASONS.has(details.reason)
      ? details.reason
      : undefined;
  console.info(
    "Audience Preview preparation",
    JSON.stringify({
      stage,
      outcome,
      ...(code ? { code } : {}),
      ...(status ? { status } : {}),
      ...(reason ? { reason } : {}),
    }),
  );
}

export async function observeAudiencePreviewStage<T>(
  stage: AudiencePreviewStage,
  operation: () => Promise<T>,
): Promise<T> {
  recordAudiencePreviewStage(stage, "started");
  try {
    const result = await operation();
    recordAudiencePreviewStage(stage, "ready");
    return result;
  } catch (error) {
    recordAudiencePreviewStage(stage, "failed", {
      code:
        error && typeof error === "object" && "code" in error
          ? error.code
          : undefined,
    });
    throw error;
  }
}
