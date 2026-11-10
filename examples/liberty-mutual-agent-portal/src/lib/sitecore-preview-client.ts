import "server-only";
import { SitecoreClient } from "@sitecore-content-sdk/nextjs/client";
import scConfig from "sitecore.config";

/** A draft must use the CM preview context, while ordinary getPage keeps live delivery. */
export function getSitecorePreviewClient(contextOverride?: string) {
  const contextId =
    contextOverride?.trim() ||
    process.env.SITECORE_PREVIEW_CONTEXT_ID?.trim() ||
    process.env.SITECORE_EDGE_CONTEXT_ID?.trim();
  if (!contextId)
    throw new Error("The Sitecore preview context is not configured.");
  return new SitecoreClient({
    ...scConfig,
    api: { ...scConfig.api, edge: { ...scConfig.api.edge, contextId } },
  });
}
