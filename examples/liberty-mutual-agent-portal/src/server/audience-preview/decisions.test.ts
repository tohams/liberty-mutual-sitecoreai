import assert from "node:assert/strict";
import test from "node:test";
import { CdpHelper } from "@sitecore-content-sdk/content/personalize";
import { defineConfig } from "@sitecore-content-sdk/nextjs/config";
import type { AudiencePreviewPage } from "../../features/audience-preview/types";
import { evaluateAudiencePreview, nativePreviewExecutions } from "./decisions";
import { normalizeNativePreviewConfiguration } from "./contracts";

const page: AudiencePreviewPage = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Home",
  path: "/",
  language: "en",
  siteName: "liberty-mutual-agent-portal",
  version: 4,
};
const profile = {
  selectorHash: "a".repeat(64),
  identity: "audience-preview:v1:" + "a".repeat(64),
  profileId: "11111111-1111-4111-8111-111111111111",
  browserId: "22222222-2222-4222-8222-222222222222",
};
const variants = ["componentA_rule1", "componentA_rule2", "componentB_rule3"];
const configuration = {
  edgeUrl: "https://edge-platform.sitecorecloud.io",
  contextId: "synthetic-context",
  siteName: page.siteName,
};

test("the actual SDK default scope becomes an omitted scope and sends an unscoped native friendly ID", async () => {
  const sdk = defineConfig({
    api: { edge: { contextId: "configuration-test" } },
    defaultSite: page.siteName,
    personalize: { enabled: true },
  });
  assert.equal(sdk.personalize.scope, "");
  const normalized = normalizeNativePreviewConfiguration({
    edgeUrl: sdk.api.edge.edgeUrl,
    contextId: sdk.api.edge.contextId,
    siteName: sdk.defaultSite,
    scope: sdk.personalize.scope,
  });
  assert.equal(Object.hasOwn(normalized, "scope"), false);
  let requests = 0;
  const result = await evaluateAudiencePreview(page, profile, {
    ...normalized,
    discovery: {
      getPersonalizeInfo: async () => ({
        pageId: page.id,
        variantIds: [variants[0]],
      }),
    },
    readProfileRef: async () => profile.profileId,
    transport: (async (url, init) => {
      requests++;
      const endpoint = new URL(String(url));
      const body = JSON.parse(String(init?.body));
      assert.equal(endpoint.searchParams.has("scope"), false);
      assert.equal(Object.hasOwn(body, "scope"), false);
      assert.equal(
        body.friendlyId,
        CdpHelper.getComponentFriendlyId(page.id, "componentA", "en"),
      );
      return Response.json({ variantId: "componentA_default" });
    }) as typeof fetch,
  });
  assert.equal(requests, 1);
  assert.equal(result.selections[0].control, true);
});

test("scope normalization retains explicit scopes and rejects invalid native configuration", () => {
  assert.equal(
    normalizeNativePreviewConfiguration({ ...configuration, scope: " " }).scope,
    undefined,
  );
  assert.equal(
    normalizeNativePreviewConfiguration({
      ...configuration,
      scope: "portal-preview",
    }).scope,
    "portal-preview",
  );
  for (const invalid of [
    { edgeUrl: "http://edge-platform.sitecorecloud.io" },
    { edgeUrl: "https://untrusted.example" },
    { contextId: "" },
    { siteName: "invalid/site" },
    { scope: "invalid/scope" },
  ])
    assert.throws(
      () =>
        normalizeNativePreviewConfiguration({ ...configuration, ...invalid }),
      /not configured/,
    );
});

test("native grouping uses SDK friendly IDs and per-component control variants", () => {
  assert.deepEqual(
    nativePreviewExecutions({ pageId: page.id, variantIds: variants }, "en"),
    [
      {
        componentId: "componentA",
        friendlyId: CdpHelper.getComponentFriendlyId(
          page.id,
          "componentA",
          "en",
        ),
        variantIds: [
          "componentA_default",
          "componentA_rule1",
          "componentA_rule2",
        ],
      },
      {
        componentId: "componentB",
        friendlyId: CdpHelper.getComponentFriendlyId(
          page.id,
          "componentB",
          "en",
        ),
        variantIds: ["componentB_default", "componentB_rule3"],
      },
    ],
  );
});

test("a verified browser/profile pair receives only allowlisted native decisions without local targeting", async () => {
  const calls: Record<string, unknown>[] = [];
  const result = await evaluateAudiencePreview(page, profile, {
    ...configuration,
    discovery: {
      getPersonalizeInfo: async (path, language, site) => {
        assert.deepEqual([path, language, site], ["/", "en", page.siteName]);
        return { pageId: page.id, variantIds: variants };
      },
    },
    readProfileRef: async () => profile.profileId,
    transport: (async (url, init) => {
      assert.equal(new URL(String(url)).pathname, "/v1/personalize");
      assert.equal(
        new URL(String(url)).searchParams.get("siteId"),
        page.siteName,
      );
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      assert.equal(body.browserId, profile.browserId);
      assert.equal(body.guestRef, profile.profileId);
      assert.equal(body.identifiers, undefined);
      assert.equal(body.params, undefined);
      return Response.json({
        variantId: body.variants.includes("componentA_rule2")
          ? "componentA_rule2"
          : "componentB_default",
      });
    }) as typeof fetch,
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(result.selectedVariantIds, [
    "componentA_rule2",
    "componentB_default",
  ]);
  assert.equal(result.selections[0].control, false);
  assert.equal(result.selections[1].control, true);
});

test("a mismatched native browser binding blocks every decision call", async () => {
  let calls = 0;
  await assert.rejects(
    evaluateAudiencePreview(page, profile, {
      ...configuration,
      discovery: {
        getPersonalizeInfo: async () => {
          calls++;
          return { pageId: page.id, variantIds: variants };
        },
      },
      readProfileRef: async () => "33333333-3333-4333-8333-333333333333",
      transport: (async () => {
        calls++;
        return Response.json({});
      }) as typeof fetch,
    }),
    /binding could not be confirmed/,
  );
  assert.equal(calls, 0);
});

test("foreign native variant receipts, pages, and unverified profiles are rejected", async () => {
  const dependencies = {
    ...configuration,
    discovery: {
      getPersonalizeInfo: async () => ({
        pageId: page.id,
        variantIds: variants,
      }),
    },
    readProfileRef: async () => profile.profileId,
    transport: (async () =>
      Response.json({ variantId: "foreign_rule" })) as typeof fetch,
  };
  await assert.rejects(
    evaluateAudiencePreview(page, profile, dependencies),
    /valid variant/,
  );
  await assert.rejects(
    evaluateAudiencePreview(
      { ...page, siteName: "other-site" },
      profile,
      dependencies,
    ),
    /valid page/,
  );
  await assert.rejects(
    evaluateAudiencePreview(
      { ...page, path: "/../another" },
      profile,
      dependencies,
    ),
    /valid page/,
  );
  await assert.rejects(
    evaluateAudiencePreview(
      page,
      { ...profile, identity: "daniel.01" },
      dependencies,
    ),
    /not verified/,
  );
  await assert.rejects(
    evaluateAudiencePreview(page, profile, {
      ...dependencies,
      discovery: {
        getPersonalizeInfo: async () => ({
          pageId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          variantIds: variants,
        }),
      },
    }),
    /selected page/,
  );
});
