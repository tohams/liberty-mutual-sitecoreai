import "server-only";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import {
  audiencePreviewAuthConfiguration,
  isAudiencePreviewAuthPath,
} from "./audience-preview-config";
import {
  audiencePreviewTokenDiagnostic,
  bindAudiencePreviewSession,
  isBoundAudiencePreviewSession,
} from "./audience-preview-session";

const configuration = audiencePreviewAuthConfiguration({
  AUDIENCE_PREVIEW_AUTH0_CLIENT_ID: "synthetic-client",
  AUDIENCE_PREVIEW_AUTH0_CLIENT_SECRET: "synthetic-client-secret",
  AUDIENCE_PREVIEW_AUTH0_SECRET: "a".repeat(64),
  AUDIENCE_PREVIEW_APP_BASE_URL: "https://portal.example",
  AUDIENCE_PREVIEW_MARKETPLACE_APP_ID: "11111111-1111-4111-8111-111111111111",
})!;
const session: SessionData = {
  user: { sub: "synthetic-author", email: "private@example.test" },
  tokenSet: {
    accessToken: "private-access-token",
    refreshToken: "private-refresh-token",
    expiresAt: 1_000,
  },
  internal: { sid: "private-session-id", createdAt: 100 },
};

test("the SDK's beforeSessionSaved binding preserves the author and refreshed token set", () => {
  const initial = bindAudiencePreviewSession(session, configuration);
  const refreshed = {
    ...initial,
    tokenSet: {
      ...initial.tokenSet,
      accessToken: "refreshed-private-token",
      refreshToken: "rotated-private-token",
      expiresAt: 2_000,
    },
  };
  const saved = bindAudiencePreviewSession(refreshed, configuration);
  assert.equal(isBoundAudiencePreviewSession(saved, configuration), true);
  assert.equal(saved.user.sub, session.user.sub);
  assert.deepEqual(saved.tokenSet, refreshed.tokenSet);
  assert.deepEqual(saved.internal, session.internal);
  for (const key of [
    "audiencePreviewClientId",
    "audiencePreviewOrganizationId",
    "audiencePreviewTenantId",
    "audiencePreviewMarketplaceAppId",
  ]) {
    assert.equal(saved[key], initial[key]);
    assert.equal(
      isBoundAudiencePreviewSession(
        { ...saved, [key]: "different-binding" },
        configuration,
      ),
      false,
    );
  }
  assert.equal(isBoundAudiencePreviewSession(null, configuration), false);
});

test("authorized token retrieval uses the configured single audience without an MRRT override", async () => {
  const environment = {
    AUDIENCE_PREVIEW_AUTH0_CLIENT_ID: configuration.clientId,
    AUDIENCE_PREVIEW_AUTH0_CLIENT_SECRET: configuration.clientSecret,
    AUDIENCE_PREVIEW_AUTH0_SECRET: configuration.secret,
    AUDIENCE_PREVIEW_APP_BASE_URL: configuration.appBaseUrl,
    AUDIENCE_PREVIEW_MARKETPLACE_APP_ID: configuration.marketplaceAppId,
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  try {
    const { getAudiencePreviewAuth, requireAudiencePreviewSession } =
      await import("./audience-preview-auth");
    const auth = getAudiencePreviewAuth()!;
    mock.method(auth, "getSession", async () =>
      bindAudiencePreviewSession(session, configuration),
    );
    const retrieve = mock.method(auth, "getAccessToken", async () => ({
      token: "synthetic-refreshed-token",
      expiresAt: 2_000,
    }));
    const result = await requireAudiencePreviewSession();
    assert.equal(result.user.sub, session.user.sub);
    assert.equal(result.accessToken, "synthetic-refreshed-token");
    assert.deepEqual(retrieve.mock.calls[0].arguments, []);
  } finally {
    mock.restoreAll();
    for (const key of Object.keys(environment)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("refresh diagnostics expose only allowlisted codes, token presence, and a bounded expiry delta", () => {
  assert.deepEqual(
    audiencePreviewTokenDiagnostic(
      { code: "missing_refresh_token", message: "private-error-text" },
      session,
      1_005,
    ),
    {
      code: "missing_refresh_token",
      hasRefreshToken: true,
      expiresAtDelta: -5,
    },
  );
  const diagnostic = audiencePreviewTokenDiagnostic(
    { code: "private-error-code", cause: { token: "private-token" } },
    { ...session, tokenSet: { ...session.tokenSet, expiresAt: 1_000_000_000 } },
    0,
  );
  assert.deepEqual(diagnostic, {
    code: "unexpected_token_error",
    hasRefreshToken: true,
    expiresAtDelta: 86_400,
  });
  assert.equal(JSON.stringify(diagnostic).includes("private"), false);
  assert.deepEqual(
    audiencePreviewTokenDiagnostic({ code: "missing_session" }, null),
    { code: "missing_session", hasRefreshToken: false, expiresAtDelta: null },
  );
});

test("the auth boundary includes this app's API and excludes other application paths", () => {
  for (const path of [
    "/api/audience-preview",
    "/api/audience-preview/context",
    "/apps/audience-preview",
    "/apps/audience-preview/view/opaque",
  ]) {
    assert.equal(isAudiencePreviewAuthPath(path), true, path);
  }
  for (const path of [
    "/api/portal/login",
    "/api/audience-preview-other",
    "/api/publication",
    "/apps/audience-preview-other",
    "/_next/static/chunk.js",
  ]) {
    assert.equal(isAudiencePreviewAuthPath(path), false, path);
  }
});
