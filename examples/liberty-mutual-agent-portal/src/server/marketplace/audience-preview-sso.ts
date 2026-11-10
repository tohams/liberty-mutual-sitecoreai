import "server-only";
import {
  AUDIENCE_PREVIEW_COMPLETE,
  AUDIENCE_PREVIEW_SILENT_RETURN,
  type AudiencePreviewAuthOutcome,
} from "@/features/audience-preview/sso";
import {
  audiencePreviewAuthorizationParameters,
  type AudiencePreviewAuthConfiguration,
} from "./audience-preview-config";

export function audiencePreviewSilentLoginOptions(
  configuration: AudiencePreviewAuthConfiguration,
) {
  return {
    returnTo: AUDIENCE_PREVIEW_SILENT_RETURN,
    authorizationParameters: {
      ...audiencePreviewAuthorizationParameters(configuration),
      prompt: "none",
    },
  };
}

export function audiencePreviewCallbackDestination(
  error: unknown,
  returnTo: string | undefined,
  baseUrl: string,
): URL {
  const destination = new URL(AUDIENCE_PREVIEW_COMPLETE, baseUrl);
  destination.searchParams.set(
    "flow",
    returnTo === AUDIENCE_PREVIEW_SILENT_RETURN ? "silent" : "popup",
  );
  let outcome: AudiencePreviewAuthOutcome = "authenticated";
  if (error) {
    outcome = "failed";
    const recoverable = new Set([
      "login_required",
      "consent_required",
      "interaction_required",
    ]);
    const values = [error, (error as { cause?: unknown }).cause];
    if (
      values.some(
        (value) =>
          value &&
          typeof value === "object" &&
          (recoverable.has(String((value as { code?: unknown }).code)) ||
            recoverable.has(String((value as { error?: unknown }).error))),
      )
    )
      outcome = "interaction_required";
  }
  destination.searchParams.set("outcome", outcome);
  return destination;
}
