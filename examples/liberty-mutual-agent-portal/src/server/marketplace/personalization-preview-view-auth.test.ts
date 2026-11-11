import "server-only";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import { NextRequest, NextResponse } from "next/server";
import { personalizationPreviewAuthConfiguration } from "./personalization-preview-config";
import { bindPersonalizationPreviewSession } from "./personalization-preview-session";
import {
  isPersonalizationPreviewViewPath,
  preflightPersonalizationPreviewView,
} from "./personalization-preview-view-auth";

const configuration = personalizationPreviewAuthConfiguration({
  PERSONALIZATION_PREVIEW_AUTH0_CLIENT_ID: "synthetic-client",
  PERSONALIZATION_PREVIEW_AUTH0_CLIENT_SECRET: "synthetic-client-secret",
  PERSONALIZATION_PREVIEW_AUTH0_SECRET: "a".repeat(64),
  PERSONALIZATION_PREVIEW_APP_BASE_URL: "https://portal.example",
  PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID:
    "11111111-1111-4111-8111-111111111111",
})!;
const session: SessionData = bindPersonalizationPreviewSession(
  {
    user: { sub: "synthetic-author" },
    internal: { sid: "synthetic-session", createdAt: 100 },
    tokenSet: {
      accessToken: "private-access-token",
      refreshToken: "private-refresh-token",
      expiresAt: 1_000,
    },
  },
  configuration,
);

test("token preflight targets only an opaque preview-view route", () => {
  assert.equal(
    isPersonalizationPreviewViewPath(
      "/apps/personalization-preview/view/opaque",
    ),
    true,
  );
  for (const path of [
    "/apps/personalization-preview",
    "/apps/personalization-preview/auth/login",
    "/apps/personalization-preview/view/",
    "/api/personalization-preview",
    "/api/personalization-preview/context",
    "/apps/personalization-preview/view/opaque/extra",
  ])
    assert.equal(isPersonalizationPreviewViewPath(path), false, path);
});

test("the SDK request/response refresh keeps its cookie update before server rendering", async () => {
  const request = new NextRequest(
    "https://portal.example/apps/personalization-preview/view/opaque",
  );
  const response = NextResponse.next();
  let calls = 0;
  const result = await preflightPersonalizationPreviewView(
    request,
    response,
    {
      getSession: async (supplied) => {
        assert.equal(supplied, request);
        return session;
      },
      getAccessToken: async (...args) => {
        calls++;
        assert.deepEqual(args, [request, response]);
        args[1].cookies.set(
          "personalization_preview_session",
          "synthetic-refreshed-encrypted-session",
          { httpOnly: true, secure: true, sameSite: "none" },
        );
        return { token: "private-refreshed-token" };
      },
    },
    configuration,
  );
  assert.equal(calls, 1);
  assert.equal(result, response);
  assert.equal(
    result.cookies.get("personalization_preview_session")?.value,
    "synthetic-refreshed-encrypted-session",
  );
  assert.equal(result.headers.get("x-middleware-next"), "1");
});

test("missing or differently bound sessions fail before token retrieval", async () => {
  const warn = mock.method(console, "warn", () => undefined);
  try {
    for (const selected of [
      null,
      { ...session, personalizationPreviewTenantId: "another-tenant" },
    ]) {
      let calls = 0;
      const result = await preflightPersonalizationPreviewView(
        new NextRequest(
          "https://portal.example/apps/personalization-preview/view/opaque",
        ),
        NextResponse.next(),
        {
          getSession: async () => selected,
          getAccessToken: async () => {
            calls++;
            return { token: "must-not-be-used" };
          },
        },
        configuration,
      );
      assert.equal(result.status, 401);
      assert.equal(result.headers.has("x-middleware-next"), false);
      assert.equal(calls, 0);
    }
    assert.equal(warn.mock.callCount(), 2);
  } finally {
    mock.restoreAll();
  }
});

test("refresh failure stops rendering and never reflects provider details", async () => {
  const warn = mock.method(console, "warn", () => undefined);
  try {
    const result = await preflightPersonalizationPreviewView(
      new NextRequest(
        "https://portal.example/apps/personalization-preview/view/opaque",
      ),
      NextResponse.next(),
      {
        getSession: async () => session,
        getAccessToken: async () => {
          throw {
            code: "failed_to_refresh_token",
            message: "private-provider-message",
            token: "private-token",
          };
        },
      },
      configuration,
    );
    assert.equal(result.status, 401);
    assert.equal(result.headers.has("x-middleware-next"), false);
    const rendered = await result.text();
    assert.equal(rendered.includes("private"), false);
    assert.equal(
      JSON.stringify(warn.mock.calls[0].arguments).includes("private"),
      false,
    );
    assert.equal(
      (warn.mock.calls[0].arguments[1] as { code: string }).code,
      "failed_to_refresh_token",
    );
  } finally {
    mock.restoreAll();
  }
});
