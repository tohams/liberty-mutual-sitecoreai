import "server-only";
import { LayoutServicePageState } from "@sitecore-content-sdk/content/layout";
import { LayoutKind } from "@sitecore-content-sdk/content/editing";
import { getSitecorePreviewClient } from "@/lib/sitecore-preview-client";
import type { NativePreviewDecisions } from "./native-variants";
import type { PersonalizationPreviewPage } from "./types";
import { personalizationPreviewContentContextId } from "./content-context";
import { composeNativePersonalizationPreview } from "./native-layout";

/** Render the selected native receipts for the authorized page and version. */
export async function getPersonalizationPreviewLayout(
  page: PersonalizationPreviewPage,
  decisions: NativePreviewDecisions,
) {
  const client = getSitecorePreviewClient(
    personalizationPreviewContentContextId(),
  );
  return composeNativePersonalizationPreview(page, decisions, (variantId) =>
    client.getPreview(
      {
        site: page.siteName,
        itemId: page.id,
        language: page.language,
        version: String(page.version),
        variantId,
        mode: LayoutServicePageState.Preview,
        layoutKind: LayoutKind.Final,
      },
      {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
            signal: AbortSignal.timeout(12_000),
          }),
      },
    ),
  );
}
