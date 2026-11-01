import { initContentSdk } from "@sitecore-content-sdk/nextjs";
import {
  analyticsBrowserAdapter,
  analyticsPlugin,
} from "@sitecore-content-sdk/analytics-core";
import { event, eventsPlugin } from "@sitecore-content-sdk/events";
import config from "sitecore.config";
import { trackingAllowed } from "../consent/consent";

let initialization: Promise<void> | null = null;

export function ensurePublicAnalytics(
  siteName = config.defaultSite,
): Promise<void> | null {
  if (
    process.env.NODE_ENV === "development" ||
    !trackingAllowed() ||
    !config.api.edge?.clientContextId
  )
    return null;
  if (!initialization)
    initialization = initContentSdk({
      config: {
        contextId: config.api.edge.clientContextId,
        edgeUrl: config.api.edge.edgeUrl,
        siteName,
      },
      plugins: [
        analyticsPlugin({
          options: {
            enableCookie: true,
            cookieDomain: window.location.hostname,
          },
          adapter: analyticsBrowserAdapter(),
        }),
        eventsPlugin(),
      ],
    }).catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  return initialization;
}

export async function recordPublicEvent(
  type: string,
  data: Record<string, string | number | boolean> = {},
) {
  if (!trackingAllowed()) return;
  const ready = ensurePublicAnalytics();
  if (!ready) return;
  try {
    await ready;
    if (!trackingAllowed()) return;
    await event({
      type: `LM_PUBLIC_${type}`,
      channel: "WEB",
      language: document.documentElement.lang,
      page: window.location.pathname,
      extensionData: data,
    });
  } catch {
    /* Content and navigation remain available when optional analytics is unavailable. */
  }
}

/** Native search analytics contract follows the official Content SDK product-listing starter. */
export async function recordSearchInteraction(data: {
  query: string;
  componentId: string;
  siteName: string;
  interactionType: "viewed" | "clicked";
  nullResults: boolean;
}) {
  if (!trackingAllowed()) return;
  const ready = ensurePublicAnalytics(data.siteName);
  if (!ready) return;
  try {
    await ready;
    if (!trackingAllowed()) return;
    await event({
      type: "search",
      siteId: data.siteName,
      channel: "web",
      name: window.location.pathname,
      language: document.documentElement.lang,
      core: {
        componentId: data.componentId,
        interactionType: data.interactionType,
        keyword: data.query.slice(0, 250),
        nullResults: data.nullResults,
      },
    });
  } catch {
    /* Search remains usable when optional analytics is unavailable. */
  }
}
