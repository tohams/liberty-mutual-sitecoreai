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
  type PageViewData,
} from "@sitecore-content-sdk/events";
import { clearEventQueue } from "@sitecore-content-sdk/events/browser";
import type { PortalBootstrap, PortalAction } from "@/contracts/portal";
import {
  readPortalBrowserProfileRef,
  waitForPortalProfileLink,
} from "./portal-identity-link";
import {
  awaitIdentityWork,
  boundedIdentityPreparation,
  LOGIN_IDENTITY_PREPARATION_TIMEOUT_MS,
  ORDINARY_IDENTITY_TIMEOUT_MS,
  PortalIdentityWork,
  prepareBrowserAdapter,
} from "./portal-identity-preparation";
import config from "sitecore.config";
import { PortalPageViews } from "./portal-page-views";

type PortalIdentity = NonNullable<PortalBootstrap["udlIdentity"]>;
let initialization: Promise<void> | undefined;
let browserAdapter: ReturnType<typeof analyticsBrowserAdapter> | undefined;
let activeIdentity: string | undefined;
let identifying: Promise<boolean> | undefined;
let identifyingKey: string | undefined;
let loginPreparation: Promise<boolean> | undefined;
const sdkWork = new PortalIdentityWork();
const recordedViews = new PortalPageViews();

export function trackingEnabled() {
  return (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    process.env.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED === "true" &&
    Boolean(config.api.edge?.clientContextId)
  );
}

async function identifyProfile(
  profile: PortalIdentity,
  generation: number,
  signal: AbortSignal,
  fresh: boolean,
): Promise<boolean> {
  const current = () => sdkWork.isCurrent(generation) && !signal.aborted;
  await sdkWork.waitUntilIdle(signal);
  if (!current()) return false;
  if (fresh) {
    if (initialization) {
      await awaitIdentityWork(
        sdkWork.run(generation, signal, clearEventQueue),
        signal,
      );
      if (!current()) return false;
    }
    initialization = undefined;
  }
  if (!initialization) {
    const adapter = analyticsBrowserAdapter();
    // Old initialization may have completed after the server expired cookies.
    // Force this login to create a fresh browser through the public adapter.
    const preparedAdapter = prepareBrowserAdapter(adapter, fresh);
    browserAdapter = preparedAdapter;
    const pending = sdkWork.run(generation, signal, () =>
      initContentSdk({
        config: {
          contextId: config.api.edge.clientContextId,
          edgeUrl: config.api.edge.edgeUrl,
          siteName: config.defaultSite,
        },
        plugins: [
          analyticsPlugin({
            options: { enableCookie: true, timeout: 2000 },
            adapter: preparedAdapter,
          }),
          eventsPlugin(),
        ],
      }),
    );
    initialization = pending;
    void pending.catch(() => {
      if (initialization === pending) initialization = undefined;
    });
  }
  await awaitIdentityWork(initialization, signal);
  if (!current()) return false;
  const identify = () =>
    sdkWork.run(generation, signal, () =>
      identity({
        identifiers: [profile],
        channel: "WEB",
        currency: "USD",
        language: "EN",
        page: "Agent workspace",
      }),
    );
  const browserId = browserAdapter?.getClientId();
  const ready = fresh
    ? Boolean(browserId) &&
      (await waitForPortalProfileLink(
        {
          identify,
          readProfileRef: (signal) =>
            readPortalBrowserProfileRef(
              {
                edgeUrl: config.api.edge.edgeUrl,
                contextId: config.api.edge.clientContextId,
                browserId: browserId!,
              },
              signal,
            ),
        },
        { signal },
      ))
    : Boolean(await awaitIdentityWork(identify(), signal));
  // A receipt alone does not establish the asynchronous browser-to-profile link.
  // Ordinary page tracking does not wait for an already-linked profile to change.
  if (!ready || !current()) return false;
  activeIdentity = `${profile.provider}:${profile.id}`;
  return true;
}

/** Ordinary tracking is bounded and never waits for an already-linked profile to change. */
export async function establishPortalIdentity(
  profile: PortalIdentity | null,
): Promise<boolean> {
  if (!profile || !trackingEnabled() || loginPreparation) return false;
  const key = `${profile.provider}:${profile.id}`;
  if (activeIdentity === key) return true;
  if (identifying) return identifyingKey === key ? identifying : false;
  const generation = sdkWork.current();
  identifyingKey = key;
  const operation = boundedIdentityPreparation(
    (signal) => identifyProfile(profile, generation, signal, false),
    ORDINARY_IDENTITY_TIMEOUT_MS,
  ).finally(() => {
    if (identifying === operation) {
      identifying = undefined;
      identifyingKey = undefined;
    }
  });
  identifying = operation;
  return operation;
}

/** Successful app authentication never waits more than eight seconds for optional native identity. */
export function preparePortalLoginIdentity(): Promise<boolean> {
  if (!trackingEnabled()) return Promise.resolve(false);
  const generation = sdkWork.invalidate();
  activeIdentity = undefined;
  recordedViews.clear();
  const preparation = boundedIdentityPreparation(async (signal) => {
    const response = await fetch("/api/portal/bootstrap", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) return false;
    const bootstrap = await response.json();
    if (signal.aborted || !sdkWork.isCurrent(generation)) return false;
    const profile: PortalIdentity | undefined = bootstrap?.udlIdentity;
    if (
      profile?.provider !== "liberty-mutual-agent" ||
      typeof profile.id !== "string" ||
      !profile.id
    )
      return false;
    return identifyProfile(profile, generation, signal, true);
  }, LOGIN_IDENTITY_PREPARATION_TIMEOUT_MS).finally(() => {
    if (loginPreparation === preparation) loginPreparation = undefined;
  });
  loginPreparation = preparation;
  return preparation;
}

export async function recordPortalPageView(
  profile: PortalIdentity | null,
  runId: string,
  path: string,
  pageData: Pick<PageViewData, "page" | "language"> & { pageVariantId: string },
) {
  if (!profile || !trackingEnabled()) return;
  const generation = sdkWork.current();
  const identityKey = `${profile.provider}:${profile.id}`;
  // Navigation deduplication uses the URL; Sitecore event metadata uses the CMS route.
  const key = JSON.stringify([identityKey, runId, path, pageData.pageVariantId]);
  return recordedViews.record(
    key,
    async () =>
      (await establishPortalIdentity(profile)) &&
      sdkWork.isCurrent(generation) &&
      activeIdentity === identityKey,
    () =>
      pageView({
        channel: "WEB",
        currency: "USD",
        ...pageData,
      }),
  );
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
  const generation = sdkWork.invalidate();
  if (initialization)
    void boundedIdentityPreparation(async (signal) => {
      await sdkWork.waitUntilIdle(signal);
      if (!sdkWork.isCurrent(generation)) return false;
      await awaitIdentityWork(
        sdkWork.run(generation, signal, clearEventQueue),
        signal,
      );
      return true;
    }, ORDINARY_IDENTITY_TIMEOUT_MS);
  activeIdentity = undefined;
  recordedViews.clear();
}
