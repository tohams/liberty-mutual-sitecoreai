import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import {
  PersonalizationPreviewError,
  personalizationPreviewAuthConfiguration,
} from "./personalization-preview-config";
import { resolveAuthorizedPersonalizationPreviewPage } from "./personalization-preview-pages";

const PAGE_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
const ROOT = "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const PORTAL = "https://liberty-mutual-agent-portal.vercel.app";
const CONTEXT_ID = "synthetic-installed-context";
const oldContext = process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID;
const oldApp = process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID;

beforeEach(() => {
  process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID = CONTEXT_ID;
  process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID =
    "11111111-1111-4111-8111-111111111111";
});

afterEach(() => {
  mock.restoreAll();
  if (oldContext === undefined)
    delete process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID;
  else process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID = oldContext;
  if (oldApp === undefined)
    delete process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID;
  else process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID = oldApp;
});

function responses(
  overrides: {
    page?: Record<string, unknown>;
    sites?: unknown;
    sitesStatus?: number;
    status?: number;
    headers?: HeadersInit;
  } = {},
) {
  const bodies = [
    overrides.sites ?? [{ id: SITE_ID, name: "liberty-mutual-agent-portal" }],
    {
      id: PAGE_ID.replaceAll("-", ""),
      name: "Home",
      path: `${ROOT}/Home`,
      language: "en",
      version: 7,
      hasPresentation: true,
      permissions: { canRead: true },
      ...overrides.page,
    },
  ];
  let index = 0;
  return mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.ok(input instanceof URL);
      assert.equal(init?.cache, "no-store");
      const body = bodies[index++];
      assert.ok(body, "No additional Sitecore calls are expected");
      return Response.json(body, {
        status: (index === 1 ? overrides.sitesStatus : overrides.status) || 200,
        headers: overrides.headers,
      });
    },
  );
}

function isError(status: number, code?: string) {
  return (error: unknown) =>
    error instanceof PersonalizationPreviewError &&
    error.status === status &&
    (!code || error.code === code);
}

test("resolves the authorized site through Sites API before authorizing the exact page version", async () => {
  const fetch = responses();
  const result = await resolveAuthorizedPersonalizationPreviewPage(
    { pageId: `{${PAGE_ID.toUpperCase()}}`, language: "en", version: 7 },
    "synthetic-delegated-user-token",
  );
  assert.deepEqual(result, {
    id: PAGE_ID,
    name: "Home",
    path: "/",
    contentPath: `${ROOT}/Home`,
    siteName: "liberty-mutual-agent-portal",
    language: "en",
    version: 7,
  });
  const calls = fetch.mock.calls;
  assert.equal(calls.length, 2);
  for (const call of calls) {
    const [input, init] = call.arguments as [URL, RequestInit];
    assert.equal(input.origin, "https://edge-platform.sitecorecloud.io");
    assert.equal(input.searchParams.get("sitecoreContextId"), CONTEXT_ID);
    assert.equal(init.cache, "no-store");
    assert.equal(init.redirect, "error");
    const headers = new Headers(init.headers);
    assert.equal(
      headers.get("Authorization"),
      "Bearer synthetic-delegated-user-token",
    );
    assert.equal(headers.get("sc-resource"), "marketplace");
    assert.equal(headers.get("sc-marketplace-auth"), "interactive/v1");
  }
  assert.equal(
    (calls[0].arguments[0] as URL).pathname,
    "/authoring/api/v1/sites",
  );
  const versioned = calls[1].arguments[0] as URL;
  assert.equal(versioned.pathname, `/authoring/api/v1/pages/${PAGE_ID}`);
  assert.equal(versioned.searchParams.get("version"), "7");
  assert.equal(versioned.searchParams.get("site"), SITE_ID);
});

test("rejects invalid page selection before any network request", async () => {
  const fetch = responses();
  for (const selection of [
    { pageId: "https://untrusted.example/page", language: "en", version: 7 },
    { pageId: PAGE_ID, language: "en&sitecoreContextId=other", version: 7 },
    { pageId: PAGE_ID, language: "en", version: 0 },
    { pageId: PAGE_ID, language: "en", version: 1.5 },
  ]) {
    await assert.rejects(
      resolveAuthorizedPersonalizationPreviewPage(selection, "synthetic-token"),
      isError(400, "INVALID_PAGE_SELECTION"),
    );
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("rejects missing or invalid bearer tokens before any network request", async () => {
  const fetch = responses();
  for (const token of ["", "token\r\ninjected-header"]) {
    await assert.rejects(
      resolveAuthorizedPersonalizationPreviewPage(
        { pageId: PAGE_ID, language: "en" },
        token,
      ),
      isError(401),
    );
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("uses the Sites API identifier rather than a hardcoded content or SiteGrouping item", async () => {
  const returnedId = "44444444-4444-4444-8444-444444444444";
  const fetch = responses({
    sites: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "liberty-mutual-public-site",
      },
      { id: returnedId, name: "liberty-mutual-agent-portal" },
    ],
  });
  await resolveAuthorizedPersonalizationPreviewPage(
    { pageId: PAGE_ID, language: "en", version: 7 },
    "synthetic-token",
  );
  assert.equal(
    (fetch.mock.calls[1].arguments[0] as URL).searchParams.get("site"),
    returnedId,
  );
});

test("a missing, ambiguous, or invalid authorized site stops before the page request", async () => {
  for (const sites of [
    [],
    [{ id: SITE_ID, name: "liberty-mutual-public-site" }],
    [{ id: "invalid", name: "liberty-mutual-agent-portal" }],
    [
      { id: SITE_ID, name: "liberty-mutual-agent-portal" },
      { id: PAGE_ID, name: "liberty-mutual-agent-portal" },
    ],
  ]) {
    const fetch = responses({ sites });
    await assert.rejects(
      resolveAuthorizedPersonalizationPreviewPage(
        { pageId: PAGE_ID, language: "en" },
        "synthetic-token",
      ),
      isError(403, "SITE_ACCESS_DENIED"),
    );
    assert.equal(fetch.mock.callCount(), 1);
    mock.restoreAll();
  }
});

test("a malformed Sites API response or denied site listing cannot authorize a page", async () => {
  const malformed = responses({ sites: { sites: [] } });
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-token",
    ),
    isError(502, "INVALID_SITECORE_RESPONSE"),
  );
  assert.equal(malformed.mock.callCount(), 1);
  mock.restoreAll();
  const denied = responses({ sitesStatus: 403 });
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-token",
    ),
    isError(403),
  );
  assert.equal(denied.mock.callCount(), 1);
});

test("cannot substitute a client-selected context or host", async () => {
  const fetch = responses();
  await resolveAuthorizedPersonalizationPreviewPage(
    {
      pageId: PAGE_ID,
      language: "en",
      version: 7,
      contextId: "untrusted-context",
      host: "https://untrusted.example",
      appId: "untrusted-app",
      siteName: "liberty-mutual-public-site",
    } as Parameters<typeof resolveAuthorizedPersonalizationPreviewPage>[0],
    "synthetic-token",
  );
  for (const call of fetch.mock.calls) {
    const url = call.arguments[0] as URL;
    assert.equal(url.origin, "https://edge-platform.sitecorecloud.io");
    assert.equal(url.searchParams.get("sitecoreContextId"), CONTEXT_ID);
    assert.equal(
      url.searchParams.get("site"),
      url.pathname.endsWith("/sites") ? null : SITE_ID,
    );
  }
});

test("does not accept a page belonging to another site", async () => {
  const fetch = responses({
    page: { path: "/sitecore/content/Other/Home" },
  });
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-token",
    ),
    isError(403, "PAGE_OUTSIDE_SITE"),
  );
  assert.equal(fetch.mock.callCount(), 2);
});

test("does not accept a foreign versioned page or non-page data item", async () => {
  for (const path of [
    `${ROOT}-other/Home`,
    `${ROOT}/Data/private`,
    `${ROOT}/Home/../Data`,
  ]) {
    responses({ page: { path } });
    await assert.rejects(
      resolveAuthorizedPersonalizationPreviewPage(
        { pageId: PAGE_ID, language: "en" },
        "synthetic-token",
      ),
      isError(403),
    );
    mock.restoreAll();
  }
});

test("rejects a silently substituted version or denied read permission", async () => {
  for (const page of [
    { version: 8 },
    { language: "fr" },
    { permissions: { canRead: false } },
    { id: "00000000-0000-0000-0000-000000000001" },
    { hasPresentation: false },
  ]) {
    responses({ page });
    await assert.rejects(
      resolveAuthorizedPersonalizationPreviewPage(
        { pageId: PAGE_ID, language: "en", version: 7 },
        "synthetic-token",
      ),
      isError(403),
    );
    mock.restoreAll();
  }
});

test("preserves Sitecore's authentication, authorization, and missing-page failures", async () => {
  for (const status of [401, 403, 404]) {
    responses({ status });
    await assert.rejects(
      resolveAuthorizedPersonalizationPreviewPage(
        { pageId: PAGE_ID, language: "en" },
        "synthetic-token",
      ),
      isError(status),
    );
    mock.restoreAll();
  }
});

test("rejection diagnostics contain only status, fixed path, and a bounded correlation ID", async () => {
  const warn = mock.method(console, "warn", () => undefined);
  responses({
    status: 400,
    headers: { "x-correlation-id": "qa-correlation-123" },
  });
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-delegated-secret",
    ),
    isError(502),
  );
  assert.deepEqual(warn.mock.calls[0].arguments, [
    "Personalization Preview Sitecore request rejected",
    {
      status: 400,
      path: `/authoring/api/v1/pages/${PAGE_ID}`,
      correlationId: "qa-correlation-123",
    },
  ]);
  const recorded = JSON.stringify(warn.mock.calls[0].arguments);
  assert.equal(recorded.includes("synthetic-delegated-secret"), false);
  assert.equal(recorded.includes(CONTEXT_ID), false);
  assert.equal(recorded.includes("permissions"), false);
});

test("ProblemDetails diagnostics redact credentials and identifiers and expose field names without values", async () => {
  const warn = mock.method(console, "warn", () => undefined);
  responses({
    status: 422,
    page: {
      title: "Validation failed",
      detail:
        "Wrong resource Bearer secret-value https://provider.example?token=private contextId=private-context-123456789 11111111-1111-4111-8111-111111111111",
      errors: {
        site: ["private-validation-value"],
        sitecoreContextId: ["private-context-value"],
        "not a field": ["private"],
      },
    },
  });
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-delegated-secret",
    ),
    isError(502),
  );
  const diagnostic = warn.mock.calls[0].arguments[1] as Record<string, unknown>;
  assert.equal(diagnostic.problemTitle, "Validation failed");
  assert.deepEqual(diagnostic.validationFields, ["site", "sitecoreContextId"]);
  const recorded = JSON.stringify(diagnostic);
  for (const secret of [
    "secret-value",
    "provider.example",
    "private-context",
    "11111111-1111-4111-8111-111111111111",
    "private-validation-value",
    "private-context-value",
    "synthetic-delegated-secret",
  ])
    assert.equal(recorded.includes(secret), false);
  assert.ok(String(diagnostic.problemDetail).length <= 300);
});

test("returns a subpage's route from the authoritative content path", async () => {
  responses({
    page: { path: `${ROOT}/Home/resources/guide` },
  });
  const page = await resolveAuthorizedPersonalizationPreviewPage(
    { pageId: PAGE_ID, language: "en", version: 7 },
    "synthetic-token",
  );
  assert.equal(page.path, "/resources/guide");
  assert.equal(page.contentPath, `${ROOT}/Home/resources/guide`);
  assert.equal("previewUrl" in page, false);
});

test("rejects Public Website from authoritative Pages API metadata", async () => {
  const fetch = responses({
    page: {
      path: "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Home",
    },
  });
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-token",
    ),
    isError(403, "PAGE_OUTSIDE_SITE"),
  );
  assert.equal(fetch.mock.callCount(), 2);
});

test("requires the installed server API configuration", async () => {
  delete process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID;
  const fetch = responses();
  await assert.rejects(
    resolveAuthorizedPersonalizationPreviewPage(
      { pageId: PAGE_ID, language: "en" },
      "synthetic-token",
    ),
    isError(503, "CONFIGURATION_REQUIRED"),
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("Auth0 setup is optional until this app's own complete HTTPS configuration exists", () => {
  assert.equal(personalizationPreviewAuthConfiguration({}), null);
  const config = {
    PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID: "synthetic-client-id",
    PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET: "synthetic-client-secret",
    PERSONALIZATION_PREVIEW_AUTH0_SECRET: "a".repeat(64),
    PERSONALIZATION_PREVIEW_APP_BASE_URL: PORTAL,
    PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID:
      "11111111-1111-4111-8111-111111111111",
  };
  assert.equal(
    personalizationPreviewAuthConfiguration(config)?.appBaseUrl,
    PORTAL,
  );
  for (const invalid of [
    { PERSONALIZATION_PREVIEW_APP_BASE_URL: "http://localhost:3000" },
    { PERSONALIZATION_PREVIEW_APP_BASE_URL: `${PORTAL}/untrusted-path` },
    { PERSONALIZATION_PREVIEW_AUTH0_DOMAIN: "https://untrusted.example" },
    { PERSONALIZATION_PREVIEW_AUTH0_AUDIENCE: "untrusted-audience" },
    { PERSONALIZATION_PREVIEW_AUTH0_SECRET: "short" },
  ]) {
    assert.equal(
      personalizationPreviewAuthConfiguration({ ...config, ...invalid }),
      null,
    );
  }
});
