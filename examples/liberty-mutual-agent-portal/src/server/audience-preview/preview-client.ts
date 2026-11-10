import "server-only";
import { SitecoreClient } from "@sitecore-content-sdk/nextjs/client";
import { LayoutServicePageState } from "@sitecore-content-sdk/content/layout";
import { LayoutKind } from "@sitecore-content-sdk/content/editing";
import scConfig from "sitecore.config";
import { AudiencePreviewError } from "@/server/marketplace/audience-preview-config";
import type { AudiencePreviewPage } from "@/server/marketplace/audience-preview-pages";
import type { AudiencePreviewDecisions } from "./decisions";
import { composeNativeAudiencePreview } from "./native-layout";

/** Read the authorized CMS draft through the official Content SDK preview service. */
export async function getAudiencePreviewLayout(
  selected: AudiencePreviewPage,
  decisions: AudiencePreviewDecisions,
) {
  const contextId =
    process.env.AUDIENCE_PREVIEW_EDGE_CONTEXT_ID ||
    process.env.SITECORE_EDGE_CONTEXT_ID;
  if (!contextId)
    throw new AudiencePreviewError(
      "CONFIGURATION_REQUIRED",
      "Audience preview is not configured.",
      503,
    );
  const client = new SitecoreClient({
    ...scConfig,
    api: { ...scConfig.api, edge: { ...scConfig.api.edge, contextId } },
  });
  return composeNativeAudiencePreview(selected, decisions, (variantId) =>
    client.getPreview(
      {
        site: selected.siteName,
        itemId: selected.id,
        language: selected.language,
        version: String(selected.version),
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
