import assert from "node:assert/strict";
import test from "node:test";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import { audiencePreviewOAuthReason } from "./audience-preview-oauth-reason";

const session: SessionData = {
  user: {
    sub: "native-user-id",
    name: "Known Reviewer",
    given_name: "Known",
    family_name: "Reviewer",
    email: "person@example.test",
    org_id: "org-sensitive",
    act: { sub: "private-actor-id" },
  },
  tokenSet: {
    accessToken: "short-access",
    idToken: "short-id",
    refreshToken: "short-refresh",
    expiresAt: 1_000,
  },
  internal: { sid: "private-session", createdAt: 1 },
};

test("clear context requirements use fixed categories without provider text", () => {
  assert.deepEqual(
    audiencePreviewOAuthReason(
      "tenant_id is required for person@example.test",
      session,
    ),
    { oauthReasonCategory: "missing-tenant-context" },
  );
  assert.deepEqual(
    audiencePreviewOAuthReason("Missing organization_id", session),
    { oauthReasonCategory: "missing-organization-context" },
  );
  assert.deepEqual(
    audiencePreviewOAuthReason("product_codes was not provided", session),
    { oauthReasonCategory: "missing-product-context" },
  );
});

test("unrelated missing information cannot be labeled as a missing tenant context", () => {
  assert.equal(
    audiencePreviewOAuthReason(
      "tenant_id is present; another input is missing",
      session,
    ).oauthReasonCategory,
    "unclassified",
  );
  assert.equal(
    audiencePreviewOAuthReason(
      'Denied ["private-provider-body"]',
      session,
    ).oauthReason?.includes("private-provider-body"),
    false,
  );
});

test("unknown reasons remove session identities and literal token values before bounded output", () => {
  const reason = audiencePreviewOAuthReason(
    "Request denied for Known Reviewer / native-user-id / person@example.test / org-sensitive / private-actor-id. short-access short-id short-refresh",
    session,
  );
  assert.equal(reason.oauthReasonCategory, "unclassified");
  for (const value of [
    "Known",
    "Reviewer",
    "native-user-id",
    "person@example.test",
    "org-sensitive",
    "private-actor-id",
    "short-access",
    "short-id",
    "short-refresh",
  ])
    assert.equal(reason.oauthReason?.includes(value), false, value);
  assert.ok(reason.oauthReason!.length <= 240);
});

test("provider messages cannot expose URLs, queries, credentials, IDs, numeric identifiers, or structured payloads", () => {
  const message =
    'Denied https://provider.example/token?secret=private-url-secret Bearer private-bearer client_secret="private-secret" tenant_id=11111111-1111-4111-8111-111111111111 product_codes=private-product organization_id=private-organization person+tag@other.example 123456789 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwcml2YXRlIn0.c2lnbmF0dXJl opaque-private-identifier1234567890 {"body":"private-body"}';
  const reason = audiencePreviewOAuthReason(message, session);
  const excerpt = reason.oauthReason!;
  for (const value of [
    "provider.example",
    "private-url-secret",
    "private-bearer",
    "private-secret",
    "11111111",
    "private-product",
    "private-organization",
    "person+tag",
    "123456789",
    "eyJ",
    "opaque-private",
    "private-body",
  ])
    assert.equal(excerpt.includes(value), false, value);
  assert.ok(excerpt.includes("tenant_id="));
  assert.ok(excerpt.includes("product_codes="));
  assert.ok(excerpt.includes("organization_id="));
});

test("non-string, empty, and oversized messages produce no excerpt", () => {
  for (const message of [undefined, {}, "", " ", "x".repeat(4_097)])
    assert.deepEqual(audiencePreviewOAuthReason(message, session), {});
  assert.ok(
    audiencePreviewOAuthReason("Denied " + "context ".repeat(100), session)
      .oauthReason!.length <= 240,
  );
});
