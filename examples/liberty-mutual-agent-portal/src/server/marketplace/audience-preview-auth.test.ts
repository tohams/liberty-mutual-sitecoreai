import assert from "node:assert/strict";
import test from "node:test";
import {
  AUDIENCE_PREVIEW_TENANT_ID,
  audiencePreviewAuthConfiguration,
  audiencePreviewAuthorizationParameters,
} from "./audience-preview-config";

const environment = {
  AUDIENCE_PREVIEW_AUTH0_CLIENT_ID: "synthetic-client",
  AUDIENCE_PREVIEW_AUTH0_CLIENT_SECRET: "synthetic-client-secret",
  AUDIENCE_PREVIEW_AUTH0_SECRET: "a".repeat(64),
  AUDIENCE_PREVIEW_APP_BASE_URL: "https://portal.example",
  AUDIENCE_PREVIEW_MARKETPLACE_APP_ID: "11111111-1111-4111-8111-111111111111",
};

test("Auth0 targets the verified installed Marketplace tenant and the server-configured app product", () => {
  const configuration = audiencePreviewAuthConfiguration(environment);
  assert.ok(configuration);
  const authorization = audiencePreviewAuthorizationParameters(configuration);
  assert.equal(
    AUDIENCE_PREVIEW_TENANT_ID,
    "ba40a477-d452-493b-fb23-08df2a1b4cda",
  );
  assert.equal(authorization.tenant_id, AUDIENCE_PREVIEW_TENANT_ID);
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
    `mkp_${environment.AUDIENCE_PREVIEW_MARKETPLACE_APP_ID}`,
  );
  assert.equal(authorization.audience, "https://api-webapp.sitecorecloud.io");
  assert.equal(authorization.scope, "openid profile email offline_access");
});

test("sign-in cannot initialize without a valid server-configured Marketplace app ID", () => {
  for (const appId of [
    undefined,
    "",
    "untrusted-app",
    "11111111-1111-4111-8111-111111111111&tenant_id=other",
  ]) {
    assert.equal(
      audiencePreviewAuthConfiguration({
        ...environment,
        AUDIENCE_PREVIEW_MARKETPLACE_APP_ID: appId,
      }),
      null,
    );
  }
});
