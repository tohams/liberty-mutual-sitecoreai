import "server-only";
import {
  PERSONALIZATION_PREVIEW_COMPLETE,
  PERSONALIZATION_PREVIEW_SILENT_RETURN,
  type PersonalizationPreviewAuthOutcome,
} from "@/features/personalization-preview/sso";
import {
  personalizationPreviewAuthorizationParameters,
  type PersonalizationPreviewAuthConfiguration,
} from "./personalization-preview-config";

export function personalizationPreviewSilentLoginOptions(
  configuration: PersonalizationPreviewAuthConfiguration,
) {
  return {
    returnTo: PERSONALIZATION_PREVIEW_SILENT_RETURN,
    authorizationParameters: {
      ...personalizationPreviewAuthorizationParameters(configuration),
      prompt: "none",
    },
  };
}

export function personalizationPreviewCallbackDestination(
  error: unknown,
  returnTo: string | undefined,
  baseUrl: string,
): URL {
  const destination = new URL(PERSONALIZATION_PREVIEW_COMPLETE, baseUrl);
  destination.searchParams.set(
    "flow",
    returnTo === PERSONALIZATION_PREVIEW_SILENT_RETURN ? "silent" : "popup",
  );
  let outcome: PersonalizationPreviewAuthOutcome = "authenticated";
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
