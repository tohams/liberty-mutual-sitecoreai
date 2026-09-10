"use client";

import { initContentSdk } from "@sitecore-content-sdk/nextjs";
import {
  analyticsBrowserAdapter,
  analyticsPlugin,
} from "@sitecore-content-sdk/analytics-core";
import {
  event,
  eventsPlugin,
  identity,
  pageView,
} from "@sitecore-content-sdk/events";
import { clearEventQueue } from "@sitecore-content-sdk/events/browser";
import type { PortalBootstrap, PortalAction } from "@/contracts/portal";
import config from "sitecore.config";

type PortalIdentity = NonNullable<PortalBootstrap["udlIdentity"]>;
let initialization: Promise<void> | undefined;
let activeIdentity: string | undefined;
let identifying: Promise<boolean> | undefined;
const recordedViews = new Set<string>();

export function trackingEnabled() {
  return (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    process.env.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED === "true" &&
    Boolean(config.api.edge?.clientContextId)
  );
}

/** Called only with an identity returned by the authenticated server after a verified UDL import. */
export async function establishPortalIdentity(
  profile: PortalIdentity | null,
): Promise<boolean> {
  if (!profile || !trackingEnabled()) return false;
  const key = `${profile.provider}:${profile.id}`;
  if (activeIdentity === key) return true;
  if (identifying) return identifying;
  identifying = (async () => {
    initialization ??= initContentSdk({
      config: {
        contextId: config.api.edge.clientContextId,
        edgeUrl: config.api.edge.edgeUrl,
        siteName: config.defaultSite,
      },
      plugins: [
        analyticsPlugin({
          options: { enableCookie: true },
          adapter: analyticsBrowserAdapter(),
        }),
        eventsPlugin(),
      ],
    });
    await initialization;
    await identity({
      identifiers: [profile],
      channel: "WEB",
      currency: "USD",
      language: "EN",
      page: "Agent workspace",
    });
    activeIdentity = key;
    return true;
  })()
    .catch(() => {
      // Measurement availability must not prevent an agent from accessing their work.
      initialization = undefined;
      return false;
    })
    .finally(() => {
      identifying = undefined;
    });
  return identifying;
}

export async function recordPortalPageView(
  profile: PortalIdentity | null,
  runId: string,
  path: string,
  pageVariantId: string,
) {
  if (!(await establishPortalIdentity(profile))) return;
  const key = `${profile!.id}:${runId}:${path}:${pageVariantId}`;
  if (recordedViews.has(key)) return;
  recordedViews.add(key);
  try {
    await pageView({
      channel: "WEB",
      currency: "USD",
      language: "EN",
      page: path,
      pageVariantId,
    });
  } catch {
    recordedViews.delete(key);
  }
}

/** Only a completed server action is measured; no customer names, free text or policy identifiers are sent. */
export async function recordPortalAction(type: PortalAction["type"]) {
  if (!activeIdentity || !trackingEnabled()) return;
  try {
    await event({
      type: "LIBERTY_MUTUAL:AGENT_ACTION",
      channel: "WEB",
      currency: "USD",
      language: "EN",
      extensionData: { action: type },
    });
  } catch {
    /* Operational writes remain successful if analytics is unavailable. */
  }
}

/** Uses the native Search event contract from Sitecore's official starter kit. */
export async function recordPortalSearch({
  profile,
  query,
  interactionType,
  componentId,
  nullResults,
  siteName,
  pageName,
  language,
}: {
  profile: PortalIdentity | null;
  query: string;
  interactionType: "viewed" | "clicked";
  componentId: string;
  nullResults: boolean;
  siteName?: string;
  pageName?: string;
  language?: string;
}) {
  if (!(await establishPortalIdentity(profile))) return;
  try {
    await event({
      type: "search",
      siteId: siteName ?? config.defaultSite,
      channel: "web",
      name: pageName ?? "Resource library",
      language: language ?? "en",
      core: {
        componentId,
        interactionType,
        keyword: query.slice(0, 250),
        nullResults,
      },
    });
  } catch {
    // Search navigation remains available when measurement is unavailable.
  }
}

/** Clear pending analytics before logout navigates to a fresh document. Cookies are expired by the server. */
export function clearPortalAnalytics() {
  if (initialization) void clearEventQueue().catch(() => undefined);
  activeIdentity = undefined;
  recordedViews.clear();
}
