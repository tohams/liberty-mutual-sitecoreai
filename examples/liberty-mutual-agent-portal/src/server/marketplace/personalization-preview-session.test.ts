import "server-only";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import {
  AccessTokenError,
  AccessTokenErrorCode,
  OAuth2Error,
} from "@auth0/nextjs-auth0/errors";
import {
  personalizationPreviewAuthConfiguration,
  isPersonalizationPreviewAuthPath,
} from "./personalization-preview-config";
import {
  personalizationPreviewTokenDiagnostic,
  bindPersonalizationPreviewSession,
  isBoundPersonalizationPreviewSession,
} from "./personalization-preview-session";

const configuration = personalizationPreviewAuthConfiguration({
  PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID: "synthetic-client",
  PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET: "synthetic-client-secret",
  PERSONALIZATION_PREVIEW_AUTH0_SECRET: "a".repeat(64),
  PERSONALIZATION_PREVIEW_APP_BASE_URL: "https://portal.example",
  PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID:
    "11111111-1111-4111-8111-111111111111",
  PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID:
    "01f409b3-854f-4c33-4345-08df2a1d7525",
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
  const initial = bindPersonalizationPreviewSession(session, configuration);
  const refreshed = {
    ...initial,
    tokenSet: {
      ...initial.tokenSet,
      accessToken: "refreshed-private-token",
      refreshToken: "rotated-private-token",
      expiresAt: 2_000,
    },
  };
  const saved = bindPersonalizationPreviewSession(refreshed, configuration);
  assert.equal(
    isBoundPersonalizationPreviewSession(saved, configuration),
    true,
  );
  assert.equal(saved.user.sub, session.user.sub);
  assert.deepEqual(saved.tokenSet, refreshed.tokenSet);
  assert.deepEqual(saved.internal, session.internal);
  for (const key of [
    "personalizationPreviewClientId",
    "personalizationPreviewOrganizationId",
    "personalizationPreviewTenantId",
    "personalizationPreviewMarketplaceAppId",
  ]) {
    assert.equal(saved[key], initial[key]);
    assert.equal(
      isBoundPersonalizationPreviewSession(
        { ...saved, [key]: "different-binding" },
        configuration,
      ),
      false,
    );
  }
  assert.equal(
    isBoundPersonalizationPreviewSession(null, configuration),
    false,
  );
});

test("default SDK claim filtering removes oversized custom data while preserving identity and authorization metadata", () => {
  const original: SessionData = {
    ...session,
    user: {
      ...session.user,
      org_id: "synthetic-organization",
      act: { sub: "synthetic-actor", iss: "https://issuer.example" },
      groups: Array.from(
        { length: 200 },
        (_, index) => `unused-custom-group-${index}`,
      ),
      "https://custom.example/unused": "x".repeat(20_000),
    },
    internal: { ...session.internal, sessionExpiresAt: 2_000 },
  };
  const bound = bindPersonalizationPreviewSession(original, configuration);
  assert.equal(Object.hasOwn(bound.user, "groups"), false);
  assert.equal(
    Object.hasOwn(bound.user, "https://custom.example/unused"),
    false,
  );
  assert.equal(bound.user.sub, original.user.sub);
  assert.equal(bound.user.org_id, original.user.org_id);
  assert.deepEqual(bound.user.act, original.user.act);
  assert.equal(bound.tokenSet, original.tokenSet);
  assert.equal(bound.internal, original.internal);
  assert.equal(
    isBoundPersonalizationPreviewSession(bound, configuration),
    true,
  );
  assert.ok(JSON.stringify(bound.user).length < 1_000);
  assert.ok(
    Object.hasOwn(original.user, "groups"),
    "Filtering must not mutate the input session",
  );
});

test("a session bound to the old app installation is rejected by the new configuration", () => {
  const oldInstallation = {
    ...configuration,
    marketplaceTenantId: "ba40a477-d452-493b-fb23-08df2a1b4cda",
  };
  const bound = bindPersonalizationPreviewSession(session, oldInstallation);
  assert.equal(
    isBoundPersonalizationPreviewSession(bound, configuration),
    false,
  );
  assert.equal(
    isBoundPersonalizationPreviewSession(
      bindPersonalizationPreviewSession(session, configuration),
      configuration,
    ),
    true,
  );
});

test("authorized token retrieval uses the configured single audience without an MRRT override", async () => {
  const environment = {
    PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID: configuration.clientId,
    PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET: configuration.clientSecret,
    PERSONALIZATION_PREVIEW_AUTH0_SECRET: configuration.secret,
    PERSONALIZATION_PREVIEW_APP_BASE_URL: configuration.appBaseUrl,
    PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID: configuration.marketplaceAppId,
    PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID:
      configuration.marketplaceTenantId,
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  try {
    const {
      getPersonalizationPreviewAuth,
      requirePersonalizationPreviewSession,
    } = await import("./personalization-preview-auth");
    const auth = getPersonalizationPreviewAuth()!;
    mock.method(auth, "getSession", async () =>
      bindPersonalizationPreviewSession(session, configuration),
    );
    const retrieve = mock.method(auth, "getAccessToken", async () => ({
      token: "synthetic-refreshed-token",
      expiresAt: 2_000,
    }));
    const result = await requirePersonalizationPreviewSession();
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
    personalizationPreviewTokenDiagnostic(
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
  const diagnostic = personalizationPreviewTokenDiagnostic(
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
    personalizationPreviewTokenDiagnostic({ code: "missing_session" }, null),
    { code: "missing_session", hasRefreshToken: false, expiresAtDelta: null },
  );
});

test("nested SDK OAuth diagnostics retain only allowlisted codes and an actually present HTTP error status", () => {
  const cause = new OAuth2Error({
    code: "invalid_grant",
    message:
      "Denied for private@example.test; refresh_token=private-refresh-token",
  });
  const error = new AccessTokenError(
    AccessTokenErrorCode.FAILED_TO_REFRESH_TOKEN,
    "private-top-level-description",
    cause,
  );
  const withoutStatus = personalizationPreviewTokenDiagnostic(
    error,
    session,
    1_005,
  );
  assert.equal(withoutStatus.oauthCode, "invalid_grant");
  assert.equal(Object.hasOwn(withoutStatus, "oauthStatus"), false);
  Object.assign(cause, { status: 401 });
  const diagnostic = personalizationPreviewTokenDiagnostic(
    error,
    session,
    1_005,
  );
  assert.deepEqual(diagnostic, {
    code: "failed_to_refresh_token",
    hasRefreshToken: true,
    expiresAtDelta: -5,
    oauthCode: "invalid_grant",
    oauthStatus: 401,
  });
  assert.equal(JSON.stringify(diagnostic).includes("private"), false);
});

test("unrecognized OAuth codes, raw provider data, and invalid status values never enter diagnostics", () => {
  for (const status of [399, 600, 401.5, Infinity, "401", undefined]) {
    const diagnostic = personalizationPreviewTokenDiagnostic(
      {
        code: "failed_to_refresh_token",
        cause: {
          code: "https://private.example/token",
          status,
          message: "private-message",
          error_description: "private-description",
          body: { token: "private-token" },
        },
      },
      session,
      1_005,
    );
    assert.equal(Object.hasOwn(diagnostic, "oauthCode"), false);
    assert.equal(Object.hasOwn(diagnostic, "oauthStatus"), false);
    assert.equal(JSON.stringify(diagnostic).includes("private"), false);
  }
});

test("the auth boundary includes this app's API and excludes other application paths", () => {
  for (const path of [
    "/api/personalization-preview",
    "/api/personalization-preview/context",
    "/apps/personalization-preview",
    "/apps/personalization-preview/view/opaque",
  ]) {
    assert.equal(isPersonalizationPreviewAuthPath(path), true, path);
  }
  for (const path of [
    "/api/portal/login",
    "/api/personalization-preview-other",
    "/api/publication",
    "/apps/personalization-preview-other",
    "/_next/static/chunk.js",
  ]) {
    assert.equal(isPersonalizationPreviewAuthPath(path), false, path);
  }
});
