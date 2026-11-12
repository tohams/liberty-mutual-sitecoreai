import assert from "node:assert/strict";
import test from "node:test";
import { nativeMetadataReader } from "./native-metadata";

const first = "3127968e4b2150c3ad79b6bbbe5303b8";
const second = "077bbcf9ce805f76ae6a8a8b5580f1c0";
async function configured(run: () => Promise<void>) {
  const context = process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID;
  const app = process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID;
  process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID =
    "personalization-test-context";
  process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID =
    "77777777-7777-4777-8777-777777777777";
  try {
    await run();
  } finally {
    if (context === undefined)
      delete process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID;
    else process.env.PERSONALIZATION_PREVIEW_SITECORE_CONTEXT_ID = context;
    if (app === undefined)
      delete process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID;
    else process.env.PERSONALIZATION_PREVIEW_MARKETPLACE_APP_ID = app;
  }
}

test("native labels use a single delegated GraphQL query restricted to exact referenced item IDs and name fields", () =>
  configured(async () => {
    let calls = 0;
    const read = nativeMetadataReader("delegated-author-token", (async (
      input,
      init,
    ) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.origin, "https://edge-platform.sitecorecloud.io");
      assert.equal(url.pathname, "/v1/authoring/graphql");
      assert.equal(
        url.searchParams.get("sitecoreContextId"),
        "personalization-test-context",
      );
      assert.equal(init?.method, "POST");
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      const headers = new Headers(init?.headers);
      assert.equal(
        headers.get("authorization"),
        "Bearer delegated-author-token",
      );
      assert.equal(headers.get("sc-marketplace-auth"), "interactive/v1");
      const body = JSON.parse(String(init?.body));
      assert.match(body.query, /^query NativeContentNames/);
      assert.equal(body.query.includes("mutation"), false);
      assert.equal(body.query.includes("children"), false);
      assert.deepEqual(body.variables, {
        where0: { database: "master", itemId: first, language: "en" },
        where1: { database: "master", itemId: second, language: "en" },
      });
      return Response.json({
        data: {
          m0: {
            itemId: first,
            name: "Agency growth priorities",
            displayName: { value: "Agency growth" },
          },
          m1: {
            itemId: second,
            name: "Producer priorities",
            displayName: { value: "" },
          },
        },
      });
    }) as typeof fetch);
    const names = await read([first, second, first], "en");
    assert.equal(calls, 1);
    assert.equal(names.get(first)?.displayName, "Agency growth");
    assert.equal(names.get(second)?.name, "Producer priorities");
  }));

test("rejects unauthorized, partial, oversized, or mismatched native-name lookups", () =>
  configured(async () => {
    for (const response of [
      new Response("Denied", { status: 403 }),
      Response.json({
        errors: [{ message: "Permission denied" }],
        data: { m0: null },
      }),
      Response.json({
        data: { m0: { itemId: second, name: "Unrelated content" } },
      }),
      Response.json({ data: { m0: null } }),
      new Response("{}", { headers: { "content-length": "1048577" } }),
    ]) {
      const read = nativeMetadataReader(
        "author-token",
        (async () => response) as typeof fetch,
      );
      await assert.rejects(read([first], "en"));
    }
    let called = false;
    const read = nativeMetadataReader("author-token", (async () => {
      called = true;
      return Response.json({});
    }) as typeof fetch);
    await assert.rejects(read(["query{secrets}"], "en"));
    assert.equal(called, false);
  }));

const namedContent = () =>
  Response.json({
    data: {
      m0: { itemId: first, name: "Agency growth priorities" },
    },
  });

test("a temporary native gateway failure recovers the exact requested content names without changing the request", (t) =>
  configured(async () => {
    t.mock.method(console, "warn", () => {});
    for (const status of [500, 502, 503, 504]) {
      const requests: {
        url: string;
        body: string;
        authorization: string | null;
      }[] = [];
      const read = nativeMetadataReader("delegated-author-token", (async (
        url,
        init,
      ) => {
        requests.push({
          url: String(url),
          body: String(init?.body),
          authorization: new Headers(init?.headers).get("authorization"),
        });
        return requests.length === 1
          ? new Response("Temporary gateway failure", { status })
          : namedContent();
      }) as typeof fetch);
      const names = await read([first], "en");
      assert.equal(names.get(first)?.name, "Agency growth priorities");
      assert.equal(requests.length, 2);
      assert.deepEqual(requests[1], requests[0]);
      assert.match(requests[0].body, /query NativeContentNames/);
      assert.equal(requests[0].body.includes("mutation"), false);
    }
  }));

test("a network failure or request timeout retries once without logging credentials or upstream messages", (t) =>
  configured(async () => {
    const warnings = t.mock.method(console, "warn", () => {});
    for (const error of [
      new TypeError("private upstream payload and delegated-author-token"),
      new DOMException("private request details", "TimeoutError"),
    ]) {
      let calls = 0;
      const read = nativeMetadataReader("delegated-author-token", (async () => {
        if (++calls === 1) throw error;
        return namedContent();
      }) as typeof fetch);
      assert.equal(
        (await read([first], "en")).get(first)?.name,
        "Agency growth priorities",
      );
      assert.equal(calls, 2);
    }
    const logged = JSON.stringify(
      warnings.mock.calls.map((call) => call.arguments),
    );
    assert.match(logged, /transport_or_timeout/);
    assert.equal(
      /delegated-author-token|private upstream|private request|Authorization|Bearer/.test(
        logged,
      ),
      false,
    );
  }));

test("a response-body timeout retries with a fresh deadline and returns the native content", (t) =>
  configured(async () => {
    t.mock.method(console, "warn", () => {});
    const deadlines: AbortController[] = [];
    t.mock.method(AbortSignal, "timeout", () => {
      const controller = new AbortController();
      deadlines.push(controller);
      return controller.signal;
    });
    let calls = 0;
    const read = nativeMetadataReader("author-token", (async () => {
      if (++calls > 1) return namedContent();
      return new Response(
        new ReadableStream({
          start(controller) {
            queueMicrotask(() => {
              const error = new DOMException(
                "The read timed out",
                "TimeoutError",
              );
              deadlines[0].abort(error);
              controller.error(error);
            });
          },
        }),
      );
    }) as typeof fetch);
    assert.equal(
      (await read([first], "en")).get(first)?.name,
      "Agency growth priorities",
    );
    assert.equal(calls, 2);
    assert.equal(deadlines.length, 2);
    assert.equal(deadlines[0].signal.aborted, true);
    assert.equal(deadlines[1].signal.aborted, false);
  }));

test("permission, GraphQL, and malformed responses never gain a second chance that could mask a denial", (t) =>
  configured(async () => {
    t.mock.method(console, "warn", () => {});
    const failures = [
      () => new Response("Bad request", { status: 400 }),
      () => new Response("Sign in", { status: 401 }),
      () => new Response("Denied", { status: 403 }),
      () => new Response("Rate limited", { status: 429 }),
      () =>
        Response.json({
          errors: [{ message: "Permission denied" }],
          data: { m0: null },
        }),
      () => new Response("not JSON"),
      () =>
        Response.json({
          data: { m0: { itemId: second, name: "Unrelated content" } },
        }),
    ];
    for (const failure of failures) {
      let calls = 0;
      const read = nativeMetadataReader("author-token", (async () => {
        return ++calls === 1 ? failure() : namedContent();
      }) as typeof fetch);
      await assert.rejects(read([first], "en"));
      assert.equal(calls, 1);
    }
  }));

test("persistent native transport and server failures remain bounded and do not produce a preview label", (t) =>
  configured(async () => {
    t.mock.method(console, "warn", () => {});
    for (const fail of [
      () => new Response("Unavailable", { status: 503 }),
      () => {
        throw new TypeError("Network unavailable");
      },
    ]) {
      let calls = 0;
      const read = nativeMetadataReader("author-token", (async () => {
        calls++;
        return fail();
      }) as typeof fetch);
      await assert.rejects(read([first], "en"));
      assert.equal(calls, 2);
    }
  }));
