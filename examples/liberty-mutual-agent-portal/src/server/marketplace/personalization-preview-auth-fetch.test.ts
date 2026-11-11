import "server-only";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createPersonalizationPreviewAuthFetch } from "./personalization-preview-auth-fetch";
import { personalizationPreviewAuthorizationParameters } from "./personalization-preview-config";

const endpoint = "https://auth.sitecorecloud.io/oauth/token";
const marketplaceAppId = "11111111-1111-4111-8111-111111111111";
const configuration = {
  marketplaceAppId,
  marketplaceTenantId: "01f409b3-854f-4c33-4345-08df2a1d7525",
};
const fixed = personalizationPreviewAuthorizationParameters(configuration);

test("the native refresh grant receives only its fixed login context while preserving request and response contracts", async () => {
  const log = mock.method(console, "info", () => undefined);
  try {
    const body = new URLSearchParams([
      ["grant_type", "refresh_token"],
      ["refresh_token", "private-refresh"],
      ["client_id", "private-client"],
      ["client_secret", "private-secret"],
      ["organization_id", "untrusted-organization"],
      ["organization_id", "another-untrusted-organization"],
      ["tenant_id", "untrusted-tenant"],
      ["product_codes", "untrusted-product"],
      ["audience", "existing-audience"],
      ["scope", "openid profile"],
      ["resource", "first"],
      ["resource", "second"],
    ]);
    const original = body.toString();
    const headers = new Headers({
      Authorization: "Basic private-client-auth",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const signal = new AbortController().signal;
    const init: RequestInit = {
      method: "POST",
      body,
      headers,
      signal,
      redirect: "manual",
      cache: "no-store",
    };
    const response = Response.json({
      access_token: "private-access",
      refresh_token: "private-rotated",
    });
    const wrapped = createPersonalizationPreviewAuthFetch(
      configuration,
      async (input, forwarded) => {
        assert.equal(input, endpoint);
        assert.notEqual(forwarded, init);
        assert.equal(forwarded?.headers, headers);
        assert.equal(forwarded?.signal, signal);
        assert.equal(forwarded?.redirect, init.redirect);
        assert.equal(forwarded?.cache, init.cache);
        const parameters = forwarded?.body;
        assert.ok(parameters instanceof URLSearchParams);
        assert.notEqual(parameters, body);
        assert.deepEqual(parameters.getAll("organization_id"), [
          fixed.organization_id,
        ]);
        assert.deepEqual(parameters.getAll("tenant_id"), [fixed.tenant_id]);
        assert.deepEqual(parameters.getAll("product_codes"), [
          fixed.product_codes,
        ]);
        const expected = new URLSearchParams(original);
        expected.set("organization_id", fixed.organization_id);
        expected.set("tenant_id", fixed.tenant_id);
        expected.set("product_codes", fixed.product_codes);
        assert.deepEqual([...parameters], [...expected]);
        return response;
      },
    );
    assert.equal(await wrapped(endpoint, init), response);
    assert.equal(body.toString(), original);
    assert.equal(response.bodyUsed, false);
    assert.equal(log.mock.callCount(), 0);
  } finally {
    mock.restoreAll();
  }
});

test("the exact origin, endpoint, POST method, unique refresh grant, and native body type are required", async () => {
  const log = mock.method(console, "info", () => undefined);
  try {
    const refresh = () =>
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: "private",
      });
    const cases: Array<[RequestInfo | URL, RequestInit | undefined]> = [
      [
        "http://auth.sitecorecloud.io/oauth/token",
        { method: "POST", body: refresh() },
      ],
      [
        "https://auth.sitecorecloud.io.attacker.example/oauth/token",
        { method: "POST", body: refresh() },
      ],
      [
        "https://auth.sitecorecloud.io:444/oauth/token",
        { method: "POST", body: refresh() },
      ],
      [
        "https://user@auth.sitecorecloud.io/oauth/token",
        { method: "POST", body: refresh() },
      ],
      [`${endpoint}/extra`, { method: "POST", body: refresh() }],
      [endpoint, { method: "GET", body: refresh() }],
      [
        endpoint,
        {
          method: "POST",
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: "private",
          }),
        },
      ],
      [
        endpoint,
        {
          method: "POST",
          body: new URLSearchParams({ grant_type: "client_credentials" }),
        },
      ],
      [
        endpoint,
        {
          method: "POST",
          body: new URLSearchParams(
            "grant_type=refresh_token&grant_type=authorization_code",
          ),
        },
      ],
      [endpoint, { method: "POST", body: "grant_type=refresh_token" }],
      [endpoint, undefined],
      [new Request(endpoint, { method: "POST", body: refresh() }), undefined],
    ];
    for (const [input, init] of cases) {
      let calls = 0;
      const wrapped = createPersonalizationPreviewAuthFetch(
        configuration,
        async (forwardedInput, forwardedInit) => {
          calls++;
          assert.equal(forwardedInput, input);
          assert.equal(forwardedInit, init);
          return new Response(null);
        },
      );
      await wrapped(input, init);
      assert.equal(calls, 1);
      if (input instanceof Request) assert.equal(input.bodyUsed, false);
    }
    assert.equal(log.mock.callCount(), 0);
  } finally {
    mock.restoreAll();
  }
});

test("URL inputs and provider failures are returned unchanged without credential logging or retries", async () => {
  const log = mock.method(console, "info", () => undefined);
  try {
    const input = new URL(endpoint);
    const init = {
      method: "post",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: "private-refresh",
      }),
    };
    const response = Response.json(
      { error: "access_denied", error_description: "private-provider-message" },
      { status: 403 },
    );
    let calls = 0;
    const wrapped = createPersonalizationPreviewAuthFetch(
      configuration,
      async (supplied) => {
        calls++;
        assert.equal(supplied, input);
        return response;
      },
    );
    assert.equal(await wrapped(input, init), response);
    assert.equal(calls, 1);
    assert.equal(response.bodyUsed, false);
    assert.equal(log.mock.callCount(), 0);
    const failure = new Error("private-transport-message");
    await assert.rejects(
      createPersonalizationPreviewAuthFetch(configuration, async () => {
        throw failure;
      })(input, init),
      (error) => error === failure,
    );
    assert.equal(log.mock.callCount(), 0);
  } finally {
    mock.restoreAll();
  }
});
