import assert from "node:assert/strict";
import test from "node:test";
import { readPersonalizationFlowDefinitions } from "./upstream";

const page = {
  id: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  name: "Home",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 1,
};
const flow = {
  ref: "11111111-1111-4111-8111-111111111111",
  name: "Agency priorities",
  subtype: "EXPERIENCE",
};

test("configuration discovery uses only read-only fixed-origin requests with this app's delegated headers", async () => {
  const before = {
    context: process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID,
    app: process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID,
  };
  process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID =
    "personalization-preview-context";
  process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID =
    "77777777-7777-4777-8777-777777777777";
  const urls: URL[] = [];
  try {
    const result = await readPersonalizationFlowDefinitions(
      page,
      "delegated-user-token",
      (async (input, init) => {
        const url = new URL(String(input));
        urls.push(url);
        assert.equal(url.origin, "https://edge-platform.sitecorecloud.io");
        assert.equal(init?.method, "GET");
        assert.equal(init?.redirect, "error");
        assert.equal(init?.cache, "no-store");
        const headers = new Headers(init?.headers);
        assert.equal(
          headers.get("authorization"),
          "Bearer delegated-user-token",
        );
        assert.equal(headers.get("sc-resource"), "marketplace");
        assert.equal(headers.get("sc-marketplace-auth"), "interactive/v1");
        assert.equal(
          headers.get("x-sitecore-contextid"),
          "personalization-preview-context",
        );
        return Response.json(
          url.pathname.includes("by-page")
            ? [flow, { ...flow, ref: "test", subtype: "EXPERIMENT" }]
            : flow,
        );
      }) as typeof fetch,
    );
    assert.deepEqual(result, [flow]);
    assert.equal(urls.length, 2);
    assert.match(urls[0].pathname, /\/api\/v1\/flows\/by-page\//);
    assert.equal(urls[0].searchParams.get("language"), "en");
    assert.equal(
      urls.some((url) => url.href.includes("delegated-user-token")),
      false,
    );
  } finally {
    if (before.context === undefined)
      delete process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID;
    else
      process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID = before.context;
    if (before.app === undefined)
      delete process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID;
    else process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID = before.app;
  }
});
