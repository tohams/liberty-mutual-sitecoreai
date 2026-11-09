import "server-only";
import type { MarketingEligibilityResult } from "@/features/workshops/preferences/marketing-eligibility.types";
import type { MarketingPreferenceStatus } from "@/features/workshops/preferences/preferences.types";
import { PortalError } from "../errors";
import { PREFERENCE_IDENTIFIERS } from "./marketing-preference-plan";
import { getMarketingPreferenceStatus } from "./marketing-preferences";

const UUID =
  /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const MAX_RESPONSE_BYTES = 16_384;

export interface MarketingDecisionConfiguration {
  edgeUrl: string;
  contextId: string;
  analyticsId: string;
  friendlyId: string;
  clientBindings: unknown;
}

export interface MarketingEligibilityDependencies {
  preferences?: () => Promise<MarketingPreferenceStatus>;
  configuration?: () => MarketingDecisionConfiguration;
  transport?: typeof fetch;
  now?: () => number;
}

function configuration(): MarketingDecisionConfiguration {
  let clientBindings: unknown;
  try {
    clientBindings = JSON.parse(
      process.env.SITECORE_MARKETING_ELIGIBILITY_CLIENT_BINDINGS || "null",
    );
  } catch {
    return unavailable();
  }
  return {
    edgeUrl:
      process.env.NEXT_PUBLIC_SITECORE_EDGE_URL ||
      "https://edge-platform.sitecorecloud.io",
    contextId:
      process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID ||
      process.env.SITECORE_EDGE_CONTEXT_ID ||
      "",
    analyticsId:
      process.env.SITECORE_MARKETING_ELIGIBILITY_ANALYTICS_ID ||
      "liberty-mutual-agent-portal",
    friendlyId:
      process.env.SITECORE_MARKETING_ELIGIBILITY_FRIENDLY_ID ||
      "liberty_mutual_marketing_eligibility",
    clientBindings,
  };
}

function unavailable(): never {
  throw new PortalError(
    "MARKETING_DECISION_UNAVAILABLE",
    "SitecoreAI could not confirm marketing eligibility. No recipient preview is available. Run the eligibility check again.",
    503,
  );
}

function endpoint(config: MarketingDecisionConfiguration): URL {
  let url: URL;
  try {
    url = new URL("/v1/personalize/v2/callFlows", config.edgeUrl);
  } catch {
    return unavailable();
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".sitecorecloud.io") ||
    url.username ||
    url.password ||
    !config.contextId ||
    !config.analyticsId ||
    !config.friendlyId
  )
    unavailable();
  url.searchParams.set("siteId", config.analyticsId);
  return url;
}

function confirmedProfiles(status: MarketingPreferenceStatus) {
  if (
    status.status !== "verified" ||
    !status.operationId ||
    status.profiles.length !== PREFERENCE_IDENTIFIERS.length ||
    !PREFERENCE_IDENTIFIERS.every((identifier) =>
      status.profiles.some(
        (profile) =>
          profile.identifier === identifier &&
          profile.verifiedAt &&
          typeof profile.profileId === "string" &&
          UUID.test(profile.profileId),
      ),
    ) ||
    new Set(status.profiles.map((profile) => profile.profileId)).size !==
      PREFERENCE_IDENTIFIERS.length
  ) {
    throw new PortalError(
      "PREFERENCES_NOT_VERIFIED",
      "Confirm the current preference import before running the eligibility check.",
      409,
    );
  }
  return status.profiles.map((profile) => ({
    ...profile,
    profileId: profile.profileId!,
  }));
}

function confirmedClients(
  value: unknown,
  profiles: ReturnType<typeof confirmedProfiles>,
): Map<string, string> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== PREFERENCE_IDENTIFIERS.length
  )
    return unavailable();
  const clients = new Map<string, string>();
  for (const profile of profiles) {
    if (!Object.hasOwn(value, profile.identifier)) return unavailable();
    const binding: unknown = (value as Record<string, unknown>)[
      profile.identifier
    ];
    if (
      !binding ||
      typeof binding !== "object" ||
      Array.isArray(binding) ||
      Object.keys(binding).length !== 2 ||
      !("clientId" in binding) ||
      typeof binding.clientId !== "string" ||
      !UUID.test(binding.clientId) ||
      !("profileId" in binding) ||
      binding.profileId !== profile.profileId
    )
      return unavailable();
    clients.set(profile.identifier, binding.clientId);
  }
  if (new Set(clients.values()).size !== PREFERENCE_IDENTIFIERS.length)
    return unavailable();
  return clients;
}

async function nativeDecision(
  response: Response,
  profileId: string,
  importedPreference: boolean,
) {
  if (!response.ok || !response.body) return unavailable();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return unavailable();
      }
      chunks.push(next.value);
    }
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    if (
      !value ||
      typeof value !== "object" ||
      !("marketingEligible" in value) ||
      typeof value.marketingEligible !== "boolean" ||
      !("profileId" in value) ||
      value.profileId !== profileId ||
      !("marketingSuppressed" in value) ||
      typeof value.marketingSuppressed !== "boolean" ||
      value.marketingSuppressed !== importedPreference ||
      !("preferenceKnown" in value) ||
      value.preferenceKnown !== true
    )
      return unavailable();
    return {
      marketingEligible: value.marketingEligible,
      marketingSuppressed: value.marketingSuppressed,
      preferenceKnown: true as const,
      profileId,
    };
  } finally {
    reader.releaseLock();
  }
}

/** The application consumes two native decisions; it never reimplements the suppression rule. */
export async function evaluateMarketingEligibility(
  dependencies: MarketingEligibilityDependencies = {},
): Promise<MarketingEligibilityResult> {
  const readPreferences =
    dependencies.preferences ?? (() => getMarketingPreferenceStatus());
  const preferences = await readPreferences();
  const profiles = confirmedProfiles(preferences);
  const config = (dependencies.configuration ?? configuration)();
  const url = endpoint(config);
  const clients = confirmedClients(config.clientBindings, profiles);
  const transport = dependencies.transport ?? fetch;
  const now = dependencies.now ?? Date.now;
  let result: MarketingEligibilityResult["profiles"];
  try {
    result = await Promise.all(
      profiles.map(async (profile) => {
        const response = await transport(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-sitecore-contextid": config.contextId,
          },
          body: JSON.stringify({
            channel: "web",
            clientKey: "",
            friendlyId: config.friendlyId,
            pointOfSale: config.analyticsId,
            browserId: clients.get(profile.identifier),
          }),
          signal: AbortSignal.timeout(8_000),
          cache: "no-store",
          redirect: "error",
        });
        const nativeResponse = await nativeDecision(
          response,
          profile.profileId,
          profile.marketingSuppressed,
        );
        return {
          identifier: profile.identifier,
          profileId: profile.profileId,
          displayName: profile.displayName,
          agencyName: profile.agencyName,
          eligible: nativeResponse.marketingEligible,
          nativeResponse,
        };
      }),
    );
  } catch {
    return unavailable();
  }
  // A concurrent opt-out invalidates the earlier evaluation, even if its response arrived successfully.
  const latest = await readPreferences();
  if (
    latest.status !== "verified" ||
    latest.operationId !== preferences.operationId
  ) {
    throw new PortalError(
      "PREFERENCES_CHANGED",
      "The preference input changed during the check. Confirm its import, then run the eligibility check again.",
      409,
    );
  }
  return {
    preferenceOperationId: preferences.operationId!,
    checkedAt: new Date(now()).toISOString(),
    nativeFriendlyId: config.friendlyId,
    profiles: result,
  };
}
