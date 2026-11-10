import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "@sitecore-content-sdk/nextjs";
import type { AudiencePreviewInput } from "../../features/audience-preview/types";
import type { StateStore, StoredValue } from "../state/store";
import type { AudiencePreviewPage } from "../marketplace/audience-preview-pages";
import {
  AudiencePreviewError,
  PREVIEW_IDENTITY_PREFIX,
  PREVIEW_SCHEMA_VERSION,
} from "./contracts";
import type { PreviewServiceDependencies } from "./service";
import { audienceSelectorHash } from "./profiles";

// This synthetic context satisfies SDK module validation; every test injects its transports.
process.env.SITECORE_EDGE_CONTEXT_ID ||= "unit-test-preview-context";

const input: AudiencePreviewInput = {
  role: "principal",
  licensedStates: ["TX"],
  specializesInSmallCommercial: true,
  agencySmallCommercialSharePercent: 15,
  agencyTotalWrittenPremiumUsd: 1_000_000,
  agentSmallCommercialWrittenPremiumUsd: 60_000,
};
const page: AudiencePreviewPage = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 1,
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
};
const profileId = "22222222-2222-4222-8222-222222222222";
const browserId = "33333333-3333-4333-8333-333333333333";
const componentId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function store(value: unknown): StateStore {
  return {
    read: async <T>() =>
      structuredClone({ version: 0, expiresAt: null, value }) as StoredValue<T>,
    compareAndSet: async () => {
      throw new Error("The retained ready job must not be written.");
    },
    persist: async () => null,
  };
}

test("request parsing permits only selected-page coordinates and validated generic audience attributes", async () => {
  const { parseAudiencePreviewRequest } = await import("./service");
  assert.deepEqual(
    parseAudiencePreviewRequest({
      pageId: page.id,
      language: "en",
      version: 1,
      input,
    }).input,
    input,
  );
  for (const invalid of [
    { pageId: page.id, language: "en", input, profileId },
    { pageId: page.id, language: "en", input, accessToken: "forbidden" },
    { pageId: page.id, language: "en", version: 1.5, input },
    {
      pageId: page.id,
      language: "en",
      input: { ...input, role: "administrator" },
    },
  ])
    assert.throws(() => parseAudiencePreviewRequest(invalid));
});

test("a transient binding mismatch remains pending until a strict native match and composition succeed", async () => {
  const { prepareAudiencePreview } = await import("./service");
  const namespace = "test-preview";
  const selectorHash = audienceSelectorHash(input, namespace, page.siteName);
  let composed = false;
  let created = false;
  let bindingMatches = false;
  let reads = 0;
  let discoveries = 0;
  let nativeDecisions = 0;
  let discoveryError: unknown;
  const dependencies: PreviewServiceDependencies = {
    profiles: {
      namespace,
      store: store({
        schemaVersion: PREVIEW_SCHEMA_VERSION,
        phase: "ready",
        plan: {
          selectorHash,
          identity: PREVIEW_IDENTITY_PREFIX + selectorHash,
        },
        profileId,
        browserId,
      }),
      siteName: page.siteName,
      edgeUrl: "https://edge-platform.sitecorecloud.io",
      contextId: "configured-context",
    },
    decisions: {
      siteName: page.siteName,
      edgeUrl: "https://edge-platform.sitecorecloud.io",
      contextId: "configured-context",
      readProfileRef: async () => {
        reads++;
        return bindingMatches
          ? profileId
          : "44444444-4444-4444-8444-444444444444";
      },
      discovery: {
        getPersonalizeInfo: async () => {
          discoveries++;
          if (discoveryError) throw discoveryError;
          return {
            pageId: page.id,
            variantIds: [`${componentId}_variant`],
          };
        },
      },
      transport: async (_url, init) => {
        nativeDecisions++;
        const body = JSON.parse(String(init?.body));
        assert.equal(body.browserId, browserId);
        assert.equal(body.guestRef, profileId);
        return Response.json({ variantId: `${componentId}_variant` });
      },
    },
    loadLayout: async (selected, decisions) => {
      assert.equal(selected.id, page.id);
      assert.deepEqual(decisions.componentVariantIds, [
        `${componentId}_variant`,
      ]);
      composed = true;
      return {
        locale: "en",
        siteName: page.siteName,
        mode: {
          name: "preview",
          isNormal: false,
          isPreview: true,
          isEditing: false,
          isDesignLibrary: false,
          designLibrary: { isVariantGeneration: false },
        },
        layout: {
          sitecore: {
            context: { language: "en", pageEditing: false },
            route: {
              name: "Home",
              placeholders: {
                main: [{ uid: componentId, componentName: "AgencyPriorities" }],
              },
            },
          },
        },
      } as Page;
    },
    createView: async (actor, selected, audience) => {
      assert.equal(composed, true);
      assert.equal(actor, "authenticated-author");
      assert.equal(selected.version, page.version);
      assert.deepEqual(audience, input);
      created = true;
      return "a".repeat(43);
    },
    origin: "https://portal.example",
  };
  const pending = await prepareAudiencePreview(
    "authenticated-author",
    page,
    input,
    dependencies,
  );
  assert.deepEqual(pending, { status: "pending", retryAfterSeconds: 3 });
  assert.equal("previewUrl" in pending, false);
  assert.equal(reads, 1);
  assert.equal(discoveries, 0);
  assert.equal(nativeDecisions, 0);
  assert.equal(composed, false);
  assert.equal(created, false);
  bindingMatches = true;
  const result = await prepareAudiencePreview(
    "authenticated-author",
    page,
    input,
    dependencies,
  );
  assert.equal(reads, 2);
  assert.equal(discoveries, 1);
  assert.equal(nativeDecisions, 1);
  assert.equal(created, true);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error("Expected a ready preview.");
  assert.deepEqual(result.matchedRules, [
    {
      componentName: "Agency Priorities",
      experienceName: "Personalized content",
    },
  ]);
  assert.equal(
    result.previewUrl,
    `https://portal.example/apps/audience-preview/view/${"a".repeat(43)}`,
  );
  assert.equal(JSON.stringify(result).includes(profileId), false);
  assert.equal(JSON.stringify(result).includes(browserId), false);
  for (const error of [
    new AudiencePreviewError(
      "PREVIEW_BINDING_CHANGED",
      "Nonretryable binding failure",
    ),
    new AudiencePreviewError(
      "NATIVE_DECISION_UNAVAILABLE",
      "Another retryable failure",
      true,
    ),
    { code: "PREVIEW_BINDING_CHANGED", retryable: true },
  ]) {
    discoveryError = error;
    await assert.rejects(
      prepareAudiencePreview("authenticated-author", page, input, dependencies),
      (caught) => caught === error,
    );
  }
});

test("pending retained preparation returns no URL and does not evaluate or create a view", async () => {
  const { prepareAudiencePreview } = await import("./service");
  const namespace = "test-preview";
  const selectorHash = audienceSelectorHash(input, namespace, page.siteName);
  const result = await prepareAudiencePreview(
    "authenticated-author",
    page,
    input,
    {
      profiles: {
        namespace,
        store: store({
          schemaVersion: PREVIEW_SCHEMA_VERSION,
          phase: "verifying",
          plan: {
            selectorHash,
            identity: PREVIEW_IDENTITY_PREFIX + selectorHash,
          },
          lease: { id: "lease", expiresAt: Date.now() + 30_000 },
        }),
        siteName: page.siteName,
        edgeUrl: "https://edge-platform.sitecorecloud.io",
        contextId: "configured-context",
      },
      decisions: {
        siteName: page.siteName,
        edgeUrl: "https://edge-platform.sitecorecloud.io",
        contextId: "configured-context",
        discovery: {
          getPersonalizeInfo: async () => {
            throw new Error("Pending must not evaluate.");
          },
        },
      },
      createView: async () => {
        throw new Error("Pending must not create a view.");
      },
      origin: "https://portal.example",
    },
  );
  assert.equal(result.status, "pending");
  assert.equal("previewUrl" in result, false);
});
