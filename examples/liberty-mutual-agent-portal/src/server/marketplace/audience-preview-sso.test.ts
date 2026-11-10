import "server-only";
import assert from "node:assert/strict";
import test from "node:test";
import {
  audiencePreviewAuthorizationParameters,
  type AudiencePreviewAuthConfiguration,
} from "./audience-preview-config";
import {
  audiencePreviewCallbackDestination,
  audiencePreviewSilentLoginOptions,
} from "./audience-preview-sso";
import {
  AUDIENCE_PREVIEW_COMPLETE,
  AUDIENCE_PREVIEW_SILENT_RETURN,
} from "@/features/audience-preview/sso";

const configuration: AudiencePreviewAuthConfiguration = {
  clientId: "synthetic-client",
  clientSecret: "synthetic-secret",
  secret: "a".repeat(64),
  marketplaceAppId: "11111111-1111-4111-8111-111111111111",
  appBaseUrl: "https://portal.example",
};

test("silent authorization preserves fixed tenant, app, scope, and audience and requests no interaction", () => {
  assert.deepEqual(audiencePreviewSilentLoginOptions(configuration), {
    returnTo: AUDIENCE_PREVIEW_SILENT_RETURN,
    authorizationParameters: {
      ...audiencePreviewAuthorizationParameters(configuration),
      prompt: "none",
    },
  });
});

test("callback returns only a fixed same-origin completion route with safe outcomes", () => {
  for (const returnTo of [
    "https://attacker.example",
    "//attacker.example",
    undefined,
    "/arbitrary",
  ]) {
    const target = audiencePreviewCallbackDestination(
      null,
      returnTo,
      configuration.appBaseUrl,
    );
    assert.equal(target.origin, configuration.appBaseUrl);
    assert.equal(target.pathname, AUDIENCE_PREVIEW_COMPLETE);
    assert.equal(target.searchParams.get("flow"), "popup");
    assert.equal(target.searchParams.get("outcome"), "authenticated");
  }
  const target = audiencePreviewCallbackDestination(
    null,
    AUDIENCE_PREVIEW_SILENT_RETURN,
    configuration.appBaseUrl,
  );
  assert.equal(target.searchParams.get("flow"), "silent");
});

test("standard silent-auth challenges fall back while raw callback errors remain private", () => {
  for (const code of [
    "login_required",
    "consent_required",
    "interaction_required",
  ]) {
    for (const error of [
      { code },
      { cause: { code } },
      { cause: { error: code } },
    ]) {
      assert.equal(
        audiencePreviewCallbackDestination(
          error,
          AUDIENCE_PREVIEW_SILENT_RETURN,
          configuration.appBaseUrl,
        ).searchParams.get("outcome"),
        "interaction_required",
      );
    }
  }
  const target = audiencePreviewCallbackDestination(
    new Error("sensitive token and error details"),
    AUDIENCE_PREVIEW_SILENT_RETURN,
    configuration.appBaseUrl,
  );
  assert.equal(target.searchParams.get("outcome"), "failed");
  assert.equal(target.href.includes("sensitive"), false);
  assert.deepEqual([...target.searchParams.keys()], ["flow", "outcome"]);
});
