import "server-only";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";

/** Discovery and rendering must read the same draft-capable content context. */
export function personalizationPreviewContentContextId(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const contextId =
    environment.PERSONALIZATION_PREVIEW_EDGE_CONTEXT_ID?.trim() ||
    environment.SITECORE_PREVIEW_CONTEXT_ID?.trim() ||
    environment.SITECORE_EDGE_CONTEXT_ID?.trim();
  if (!contextId)
    throw new PersonalizationPreviewError(
      "CONFIGURATION_REQUIRED",
      "Personalization Preview’s content connection is not configured.",
      503,
    );
  return contextId;
}
