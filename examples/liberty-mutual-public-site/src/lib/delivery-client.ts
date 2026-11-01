import { SitecoreClient } from "@sitecore-content-sdk/nextjs/client";
import scConfig from "sitecore.config";

/** Ordinary website reads are always published-only, including Preview deployments. */
export const deliveryConfig = {
  ...scConfig,
  api: {
    ...scConfig.api,
    edge: {
      ...scConfig.api.edge,
      // Never fall back to the authoring Preview context.
      contextId: process.env.SITECORE_LIVE_EDGE_CONTEXT_ID || "",
    },
  },
};

const deliveryClient = new SitecoreClient(deliveryConfig);
export default deliveryClient;
