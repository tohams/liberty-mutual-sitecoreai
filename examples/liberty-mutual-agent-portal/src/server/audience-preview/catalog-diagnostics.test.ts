import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogRowFailure,
  recordCatalogRowFailure,
  storedCatalogRowFailure,
} from "./catalog-diagnostics";

test("catalog diagnostics retain only fixed stage/code and bounded actual HTTP status", () => {
  const error = {
    code: "PREVIEW_RECEIPT_MISMATCH",
    status: 409,
    message: "private-provider-message",
    profileId: "private-profile-id",
    response: { status: 503, body: "private-response" },
    cause: { status: 401, message: "private-token" },
  };
  assert.deepEqual(catalogRowFailure(22, "page-layout", error), {
    index: 22,
    stage: "page-layout",
    code: "PREVIEW_RECEIPT_MISMATCH",
    status: 409,
  });
  assert.deepEqual(
    catalogRowFailure(22, "native-decision", {
      code: "raw-provider-secret",
      status: 200,
      statusCode: "503",
      response: { status: 700 },
      cause: { statusCode: 502 },
    }),
    {
      index: 22,
      stage: "native-decision",
      code: "PREVIEW_UNAVAILABLE",
      status: 502,
    },
  );
});

test("stored diagnostics expose only fixed source/state flags and sanitize again", () => {
  assert.deepEqual(
    storedCatalogRowFailure(22, {
      stage: "profile-preparation",
      code: "PROFILE_LINK_TIMEOUT",
      source: "existing",
      profilePhase: "failed",
      profileCode: "PROFILE_LINK_TIMEOUT",
      identitySent: true,
      hasCatalogProof: false,
      hasSubmissionProof: true,
      profileId: "private-profile-id",
      message: "private-provider-message",
    }),
    {
      index: 22,
      stage: "profile-preparation",
      code: "PROFILE_LINK_TIMEOUT",
      source: "existing",
      profilePhase: "failed",
      profileCode: "PROFILE_LINK_TIMEOUT",
      identitySent: true,
      hasCatalogProof: false,
      hasSubmissionProof: true,
    },
  );
  assert.deepEqual(
    storedCatalogRowFailure(22, {
      stage: "private-stage",
      code: "private-code",
      status: 399,
      source: "private-source",
      profilePhase: "private-phase",
      profileCode: "private-code",
      identitySent: "private-value",
      hasCatalogProof: "private-value",
      hasSubmissionProof: {},
    }),
    { index: 22, stage: "unrecorded", code: "PREVIEW_UNAVAILABLE" },
  );
  assert.deepEqual(storedCatalogRowFailure(22, undefined), {
    index: 22,
    stage: "unrecorded",
    code: "UNRECORDED_FAILURE",
  });
});

test("row logs contain sanitized metadata and reject an out-of-catalog index", (t) => {
  const log = t.mock.method(console, "info", () => undefined);
  recordCatalogRowFailure(
    { index: 22, stage: "profile-preparation", code: "PROFILE_LINK_TIMEOUT" },
    "failed",
  );
  recordCatalogRowFailure(
    { index: 42, stage: "unrecorded", code: "private-code" },
    "failed",
  );
  assert.equal(log.mock.callCount(), 1);
  assert.deepEqual(log.mock.calls[0].arguments, [
    "Audience Preview catalog row",
    {
      index: 22,
      stage: "profile-preparation",
      code: "PROFILE_LINK_TIMEOUT",
      outcome: "failed",
    },
  ]);
});
