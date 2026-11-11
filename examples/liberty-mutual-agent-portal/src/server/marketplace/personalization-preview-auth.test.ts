import assert from "node:assert/strict";
import test from "node:test";
import {
  personalizationPreviewAuthConfiguration,
  personalizationPreviewAuthorizationParameters,
  isPersonalizationPreviewAuthPath,
} from "./personalization-preview-config";

const environment = {
  PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID: "synthetic-client",
  PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET: "synthetic-client-secret",
  PERSONALIZATION_PREVIEW_AUTH0_SECRET: "a".repeat(64),
  PERSONALIZATION_PREVIEW_APP_BASE_URL: "https://portal.example",
  PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID:
    "11111111-1111-4111-8111-111111111111",
  PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID:
    "01f409b3-854f-4c33-4345-08df2a1d7525",
};

test("Auth0 targets the verified installed Marketplace tenant and the server-configured app product", () => {
  const configuration = personalizationPreviewAuthConfiguration(environment);
  assert.ok(configuration);
  const authorization =
    personalizationPreviewAuthorizationParameters(configuration);
  assert.equal(
    authorization.tenant_id,
    environment.PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID,
  );
  assert.notEqual(
    authorization.tenant_id,
    "ba40a477-d452-493b-fb23-08df2a1b4cda",
  );
  assert.notEqual(
    authorization.tenant_id,
    "97eea84c-ac47-4d91-7e4f-08defdaaa7df",
  );
  assert.notEqual(
    authorization.tenant_id,
    "b0688afd-d747-4582-efe5-08defda484ba",
  );
  assert.equal(authorization.organization_id, "org_XqL3u1MSNVuubOTb");
  assert.equal(
    authorization.product_codes,
    `mkp_${environment.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID}`,
  );
  assert.equal(authorization.audience, "https://api-webapp.sitecorecloud.io");
  assert.equal(authorization.scope, "openid profile email offline_access");
});

test("sign-in requires this app's own Marketplace installation tenant", () => {
  for (const tenantId of [
    undefined,
    "",
    "not-a-tenant",
    "tenant&product_codes=other",
  ]) {
    assert.equal(
      personalizationPreviewAuthConfiguration({
        ...environment,
        PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID: tenantId,
      }),
      null,
    );
  }
  assert.equal(
    personalizationPreviewAuthConfiguration({
      ...environment,
      PERSONALIZATION_PREVIEW_MARKETPLACE_TENANT_ID: undefined,
      UNRELATED_MARKETPLACE_TENANT_ID: "ba40a477-d452-493b-fb23-08df2a1b4cda",
    }),
    null,
  );
});

test("sign-in cannot initialize without a valid server-configured Marketplace app ID", () => {
  for (const appId of [
    undefined,
    "",
    "untrusted-app",
    "11111111-1111-4111-8111-111111111111&tenant_id=other",
  ]) {
    assert.equal(
      personalizationPreviewAuthConfiguration({
        ...environment,
        PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID: appId,
      }),
      null,
    );
  }
});

test("sign-in never falls back to unrelated portal configuration or routes", () => {
  assert.equal(
    personalizationPreviewAuthConfiguration({
      PORTAL_AUTH0_CLIENT_ID: "existing-client",
      PORTAL_AUTH0_CLIENT_SECRET: "existing-client-secret",
      PORTAL_AUTH0_SECRET: "a".repeat(64),
      PORTAL_APP_BASE_URL: "https://portal.example",
      PORTAL_MARKETPLACE_APP_ID: "11111111-1111-4111-8111-111111111111",
    }),
    null,
  );
  for (const path of [
    "/apps/other-preview",
    "/api/other-preview",
    "/apps/other-preview/auth/callback",
    "/apps/personalization-preview-other",
  ])
    assert.equal(isPersonalizationPreviewAuthPath(path), false);
  for (const path of [
    "/apps/personalization-preview",
    "/api/personalization-preview/context",
    "/apps/personalization-preview/auth/callback",
  ])
    assert.equal(isPersonalizationPreviewAuthPath(path), true);
});
