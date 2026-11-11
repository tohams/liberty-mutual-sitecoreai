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
