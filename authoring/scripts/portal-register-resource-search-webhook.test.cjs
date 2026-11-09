"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const portal = require("./portal-register-resource-search-webhook.cjs");
const publicSite = require("./public-register-search-webhook.cjs");
const secret = "portal-test-webhook-credential-123456";

test("Portal registrar owns a distinct OnEnd destination and accepts only its dedicated settings", () => {
  const settings = {
    PORTAL_RESOURCE_PUBLIC_ORIGIN: "https://portal.example.com",
    PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET: secret,
    PUBLIC_SITE_URL: "https://public.example.com",
    PUBLICATION_WEBHOOK_SECRET: "public-test-webhook-credential-123456",
  };
  const hook = portal.desiredHook(settings);
  const publicHook = publicSite.desiredHook(settings);
  assert.equal(
    hook.uri,
    "https://portal.example.com/api/sitecore/resource-publication",
  );
  assert.equal(hook.label, "Liberty Mutual agent resource Search sync");
  assert.equal(hook.executionMode, "OnEnd");
  assert.equal(hook.headers.Authorization, `Bearer ${secret}`);
  assert.deepEqual(JSON.parse(hook.body), {
    schemaVersion: 1,
    site: "liberty-mutual-agent-portal",
    event: "edge-publish-complete",
  });
  assert.notEqual(hook.uri, publicHook.uri);
  assert.notEqual(hook.label, publicHook.label);
  assert.equal(
    publicHook.uri,
    "https://public.example.com/api/sitecore/publication",
  );
  assert.equal(JSON.parse(publicHook.body).site, "liberty-mutual-public-site");
  assert.throws(() =>
    portal.desiredHook({
      PUBLIC_SITE_URL: "https://public.example.com",
      PUBLICATION_WEBHOOK_SECRET: secret,
    }),
  );
  for (const origin of [
    "http://localhost:3000",
    "https://portal.example.com/path",
    "https://user:password@portal.example.com",
    "https://portal.example.com/?token=value",
  ])
    assert.throws(() =>
      portal.desiredHook({
        ...settings,
        PORTAL_RESOURCE_PUBLIC_ORIGIN: origin,
      }),
    );
  assert.throws(() =>
    portal.desiredHook({
      ...settings,
      PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET: "weak",
    }),
  );
});

test("Portal temporary setup client remains environment-scoped and has no credential in safe summaries", () => {
  const request = portal.edgeClientRequest();
  assert.equal(request.projectId, publicSite.BINDING.projectId);
  assert.equal(request.environmentId, publicSite.BINDING.environmentId);
  assert.equal(request.name, "Liberty Mutual Portal webhook setup");
  assert.equal(Object.hasOwn(request, "scope"), false);
  const hook = portal.desiredHook({
    PORTAL_RESOURCE_PUBLIC_ORIGIN: "https://portal.example.com",
    PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET: secret,
  });
  const summary = portal.summarize({
    ...hook,
    id: "owned-hook",
    lastRuns: [{ timestamp: "now", success: true, message: secret }],
  });
  assert.equal(JSON.stringify(summary).includes(secret), false);
  assert.equal(summary.id, "owned-hook");
});
