"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const H = require("./public-register-search-webhook.cjs");

test("Edge setup request binds to one environment and hook body identifies only public publication completion", () => {
  const client = H.edgeClientRequest();
  assert.equal(client.projectId, H.BINDING.projectId);
  assert.equal(client.environmentId, H.BINDING.environmentId);
  assert.equal(Object.hasOwn(client, "scope"), false);
  const hook = H.desiredHook({
    PUBLIC_SITE_URL: "https://public.example.com",
    PUBLICATION_WEBHOOK_SECRET: "test-webhook-secret-1234567890",
  });
  assert.equal(hook.uri, "https://public.example.com/api/sitecore/publication");
  assert.equal(hook.executionMode, "OnEnd");
  assert.deepEqual(JSON.parse(hook.body), {
    schemaVersion: 1,
    site: "liberty-mutual-public-site",
    event: "edge-publish-complete",
  });
  assert.throws(() =>
    H.desiredHook({
      PUBLIC_SITE_URL: "http://localhost:3001",
      PUBLICATION_WEBHOOK_SECRET: "test-webhook-secret-1234567890",
    }),
  );
  assert.throws(() =>
    H.desiredHook({
      PUBLIC_SITE_URL: "https://public.example.com",
      PUBLICATION_WEBHOOK_SECRET: "weak",
    }),
  );
});

test("OAuth uses supported client credentials, keeps secrets out of summaries, and rejects another environment", async () => {
  let captured;
  const token = await H.edgeToken(
    { ...H.BINDING, clientId: "test-id", clientSecret: "test-secret" },
    async (url, init) => {
      captured = { url, init };
      return Response.json({
        access_token: "test-token",
        token_type: "Bearer",
      });
    },
  );
  assert.equal(token, "test-token");
  assert.equal(captured.url, "https://auth.sitecorecloud.io/oauth/token");
  assert.equal(captured.init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(captured.init.body), {
    audience: "https://api.sitecorecloud.io",
    grant_type: "client_credentials",
    client_id: "test-id",
    client_secret: "test-secret",
  });
  assert.equal(
    JSON.stringify(
      H.summarize({
        id: "one",
        label: "hook",
        uri: "https://public.example.com",
        headers: { Authorization: "Bearer test-token" },
        body: "test-secret",
        lastRuns: [{ timestamp: "now", success: false, message: "test-token" }],
      }),
    ).includes("test-token"),
    false,
  );
  await assert.rejects(
    H.edgeToken({
      ...H.BINDING,
      environmentId: "different",
      clientId: "test-id",
      clientSecret: "test-secret",
    }),
    /exact environment/,
  );
});
