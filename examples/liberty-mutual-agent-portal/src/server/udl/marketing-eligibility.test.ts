import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateMarketingEligibility,
  type MarketingDecisionConfiguration,
} from "./marketing-eligibility";
import type { MarketingPreferenceStatus } from "@/features/workshops/preferences/preferences.types";

const config: MarketingDecisionConfiguration = {
  edgeUrl: "https://edge-platform.sitecorecloud.io",
  contextId: "test-context",
  analyticsId: "liberty-mutual-agent-portal",
  friendlyId: "liberty_mutual_marketing_eligibility",
  clientBindings: {
    "limu-preferences-allowed": {
      clientId: "86e90dd7-a416-4f2c-9537-4142e0ef7c44",
      profileId: "dc19931a-73a9-4182-8116-c72955ba688b",
    },
    "limu-preferences-suppressed": {
      clientId: "c1c68aaf-4456-4f0d-b7c8-470bdc42cfee",
      profileId: "463ce5a5-eb15-41db-ba23-607d78c1796d",
    },
  },
};
const status: MarketingPreferenceStatus = {
  status: "verified",
  operationId: "confirmed-operation",
  canSubmit: true,
  canInspect: true,
  message: "Confirmed",
  profiles: [
    {
      identifier: "limu-preferences-allowed",
      displayName: "Cameron Ellis - Allowed",
      agencyName: "Lakeside",
      state: "TX",
      role: "producer",
      marketingSuppressed: false,
      profileId: "dc19931a-73a9-4182-8116-c72955ba688b",
      verifiedAt: "2026-11-08T12:00:00Z",
    },
    {
      identifier: "limu-preferences-suppressed",
      displayName: "Cameron Ellis - Suppressed",
      agencyName: "Lakeside",
      state: "TX",
      role: "producer",
      marketingSuppressed: true,
      profileId: "463ce5a5-eb15-41db-ba23-607d78c1796d",
      verifiedAt: "2026-11-08T12:00:00Z",
    },
  ],
};
const response = (index: number, eligible = index === 0) => ({
  marketingEligible: eligible,
  marketingSuppressed: status.profiles[index].marketingSuppressed,
  preferenceKnown: true,
  profileId: status.profiles[index].profileId,
});
const dependencies = (transport: typeof fetch) => ({
  preferences: async () => structuredClone(status),
  configuration: () => config,
  transport,
});

test("verified native client bindings evaluate the same known identities, with no request-supplied preference", async () => {
  let calls = 0;
  const result = await evaluateMarketingEligibility(
    dependencies((async (url, options) => {
      const endpoint = new URL(String(url));
      assert.equal(endpoint.pathname, "/v1/personalize/v2/callFlows");
      assert.equal(endpoint.searchParams.get("siteId"), config.analyticsId);
      assert.equal(options?.method, "POST");
      assert.equal(
        new Headers(options?.headers).get("x-sitecore-contextid"),
        config.contextId,
      );
      assert.equal(options?.cache, "no-store");
      assert.equal(options?.redirect, "error");
      const index = calls++;
      assert.deepEqual(JSON.parse(String(options?.body)), {
        channel: "web",
        clientKey: "",
        friendlyId: config.friendlyId,
        pointOfSale: config.analyticsId,
        browserId: (
          config.clientBindings as Record<string, { clientId: string }>
        )[status.profiles[index].identifier].clientId,
      });
      return Response.json(response(index));
    }) as typeof fetch),
  );
  assert.equal(calls, 2);
  assert.equal(result.preferenceOperationId, status.operationId);
  assert.deepEqual(
    result.profiles.map((profile) => profile.eligible),
    [true, false],
  );
  assert.deepEqual(
    result.profiles.map((profile) => profile.nativeResponse.profileId),
    status.profiles.map((profile) => profile.profileId),
  );
});

test("the returned native decision controls eligibility, rather than the local submitted suppression value", async () => {
  let calls = 0;
  const result = await evaluateMarketingEligibility(
    dependencies((async () =>
      Response.json(response(calls++, false))) as typeof fetch),
  );
  assert.equal(status.profiles[0].marketingSuppressed, false);
  assert.deepEqual(
    result.profiles.map((profile) => profile.eligible),
    [false, false],
  );
});

test("missing, malformed, wrong-identity, stale, oversized, and failed native responses cannot select recipients", async () => {
  const failures = [
    () => new Response(null, { status: 204 }),
    () => Response.json({}),
    () => Response.json({ ...response(0), marketingEligible: "true" }),
    () =>
      Response.json({
        ...response(0),
        profileId: "e925db1f-a514-4345-8c1d-bf2081964bf6",
      }),
    () => Response.json({ ...response(0), marketingSuppressed: true }),
    () => Response.json({ ...response(0), preferenceKnown: false }),
    () => new Response("not json"),
    () => new Response("x".repeat(20_000)),
    () => new Response("upstream unavailable", { status: 503 }),
    () => {
      throw new Error("network timeout");
    },
  ];
  for (const failure of failures)
    await assert.rejects(
      evaluateMarketingEligibility(
        dependencies((async () => failure()) as typeof fetch),
      ),
      { code: "MARKETING_DECISION_UNAVAILABLE", status: 503 },
    );
});

test("unverified or incomplete imports cannot trigger native calls", async () => {
  for (const invalid of [
    { ...status, status: "pending" as const },
    { ...status, operationId: undefined },
    { ...status, profiles: status.profiles.slice(0, 1) },
    {
      ...status,
      profiles: status.profiles.map((profile) => ({
        ...profile,
        profileId: undefined,
      })),
    },
  ]) {
    let calls = 0;
    await assert.rejects(
      evaluateMarketingEligibility({
        preferences: async () => invalid,
        configuration: () => config,
        transport: (async () => {
          calls++;
          return Response.json({});
        }) as typeof fetch,
      }),
      { code: "PREFERENCES_NOT_VERIFIED", status: 409 },
    );
    assert.equal(calls, 0);
  }
});

test("a preference change during a native check invalidates the entire preview", async () => {
  let reads = 0,
    calls = 0;
  await assert.rejects(
    evaluateMarketingEligibility({
      ...dependencies((async () =>
        Response.json(response(calls++))) as typeof fetch),
      preferences: async () =>
        ++reads === 1 ? status : { ...status, operationId: "new-operation" },
    }),
    { code: "PREFERENCES_CHANGED", status: 409 },
  );
});

test("configuration is restricted to a secure Sitecore endpoint", async () => {
  await assert.rejects(
    evaluateMarketingEligibility({
      ...dependencies((async () => {
        throw new Error("must not be called");
      }) as typeof fetch),
      configuration: () => ({
        ...config,
        edgeUrl: "https://untrusted.example",
      }),
    }),
    { code: "MARKETING_DECISION_UNAVAILABLE" },
  );
});

test("only the exact two native client bindings that match the confirmed profiles can be evaluated", async () => {
  const bindings = config.clientBindings as Record<
    string,
    { clientId: string; profileId: string }
  >;
  for (const invalid of [
    null,
    [],
    {},
    { ...bindings, another: bindings["limu-preferences-allowed"] },
    {
      ...bindings,
      "limu-preferences-allowed": {
        ...bindings["limu-preferences-allowed"],
        profileId: "e925db1f-a514-4345-8c1d-bf2081964bf6",
      },
    },
    {
      ...bindings,
      "limu-preferences-allowed": {
        ...bindings["limu-preferences-allowed"],
        clientId: "invalid",
      },
    },
    {
      ...bindings,
      "limu-preferences-allowed": {
        ...bindings["limu-preferences-allowed"],
        clientId: bindings["limu-preferences-suppressed"].clientId,
      },
    },
  ]) {
    let calls = 0;
    await assert.rejects(
      evaluateMarketingEligibility({
        ...dependencies((async () => {
          calls++;
          return Response.json({});
        }) as typeof fetch),
        configuration: () => ({ ...config, clientBindings: invalid }),
      }),
      { code: "MARKETING_DECISION_UNAVAILABLE", status: 503 },
    );
    assert.equal(calls, 0);
  }
});
