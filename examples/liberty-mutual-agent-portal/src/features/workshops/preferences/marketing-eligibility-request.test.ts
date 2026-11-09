import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchMarketingEligibility,
  isMarketingEligibilityResult,
} from "./marketing-eligibility-request";
import type { MarketingEligibilityResult } from "./marketing-eligibility.types";

const result: MarketingEligibilityResult = {
  preferenceOperationId: "operation",
  checkedAt: "2026-11-08T12:00:00Z",
  nativeFriendlyId: "liberty_mutual_marketing_eligibility",
  profiles: [
    {
      identifier: "limu-preferences-allowed",
      profileId: "dc19931a-73a9-4182-8116-c72955ba688b",
      displayName: "Cameron Ellis - Allowed",
      agencyName: "Lakeside",
      eligible: true,
      nativeResponse: {
        marketingEligible: true,
        marketingSuppressed: false,
        preferenceKnown: true,
        profileId: "dc19931a-73a9-4182-8116-c72955ba688b",
      },
    },
    {
      identifier: "limu-preferences-suppressed",
      profileId: "463ce5a5-eb15-41db-ba23-607d78c1796d",
      displayName: "Cameron Ellis - Suppressed",
      agencyName: "Lakeside",
      eligible: false,
      nativeResponse: {
        marketingEligible: false,
        marketingSuppressed: true,
        preferenceKnown: true,
        profileId: "463ce5a5-eb15-41db-ba23-607d78c1796d",
      },
    },
  ],
};
test("the client sends no profile or preference input and accepts confirmed native results", async () => {
  const received = await fetchMarketingEligibility(
    new AbortController().signal,
    (async (url, options) => {
      assert.equal(url, "/api/workshops/marketing-eligibility");
      assert.equal(options?.method, "POST");
      assert.equal(options?.body, "{}");
      assert.equal(options?.cache, "no-store");
      return Response.json(result);
    }) as typeof fetch,
  );
  assert.deepEqual(received, result);
});
test("incomplete, conflicting, wrong-identity, and unauthenticated results cannot render a recipient", async () => {
  assert.equal(isMarketingEligibilityResult(result), true);
  for (const invalid of [
    null,
    {},
    { ...result, profiles: result.profiles.slice(0, 1) },
    { ...result, profiles: [result.profiles[0], result.profiles[0]] },
    {
      ...result,
      profiles: result.profiles.map((profile) => ({
        ...profile,
        eligible: !profile.eligible,
      })),
    },
    {
      ...result,
      profiles: result.profiles.map((profile) => ({
        ...profile,
        nativeResponse: { ...profile.nativeResponse, profileId: "different" },
      })),
    },
  ])
    assert.equal(isMarketingEligibilityResult(invalid), false);
  await assert.rejects(
    fetchMarketingEligibility(new AbortController().signal, (async () =>
      Response.json(result, { status: 401 })) as typeof fetch),
    /sign-in has ended/,
  );
});
