import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { LayoutServicePageState } from "@sitecore-content-sdk/content/layout";
import { LayoutKind } from "@sitecore-content-sdk/content/editing";

test("versioned SDK preview uses the CM context without changing the normal delivery client", async () => {
  const keys = [
    "SITECORE_EDGE_CONTEXT_ID",
    "SITECORE_PREVIEW_CONTEXT_ID",
    "AUDIENCE_PREVIEW_EDGE_CONTEXT_ID",
  ] as const;
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  process.env.SITECORE_EDGE_CONTEXT_ID = "synthetic-live-context";
  process.env.SITECORE_PREVIEW_CONTEXT_ID = "synthetic-cm-preview-context";
  process.env.AUDIENCE_PREVIEW_EDGE_CONTEXT_ID =
    "synthetic-older-preview-context";
  try {
    const { getSitecorePreviewClient } =
      await import("./sitecore-preview-client");
    const { default: deliveryClient } = await import("./sitecore-client");
    const calls: Array<{
      url: URL;
      headers: Headers;
      body: Record<string, unknown>;
    }> = [];
    const transport: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const body = JSON.parse(String(init?.body));
      calls.push({ url, headers: new Headers(init?.headers), body });
      return Response.json({
        data: {
          item: {
            rendered: {
              sitecore: {
                context: {
                  language: "en",
                  site: { name: "liberty-mutual-agent-portal" },
                },
                route: {
                  name: "Home",
                  itemId: "11111111-1111-4111-8111-111111111111",
                  itemLanguage: "en",
                  itemVersion: 1,
                  placeholders: {},
                },
              },
            },
          },
          layout: {
            item: {
              rendered: {
                sitecore: {
                  context: {
                    language: "en",
                    site: { name: "liberty-mutual-agent-portal" },
                  },
                  route: { name: "Home", placeholders: {} },
                },
              },
            },
          },
        },
      });
    };
    mock.method(globalThis, "fetch", transport);
    await getSitecorePreviewClient().getPreview(
      {
        site: "liberty-mutual-agent-portal",
        itemId: "11111111-1111-4111-8111-111111111111",
        language: "en",
        version: "1",
        variantId: "_default",
        mode: LayoutServicePageState.Edit,
        layoutKind: LayoutKind.Final,
      },
      { fetch: transport },
    );
    const preview = calls[0];
    assert.equal(
      preview.headers.get("x-sitecore-contextid"),
      "synthetic-cm-preview-context",
    );
    assert.equal(preview.headers.get("sc_editMode"), "true");
    assert.equal(
      (preview.body.variables as Record<string, unknown>).version,
      "1",
    );
    await getSitecorePreviewClient("synthetic-app-specific-preview").getPreview(
      {
        site: "liberty-mutual-agent-portal",
        itemId: "11111111-1111-4111-8111-111111111111",
        language: "en",
        version: "1",
        variantId: "_default",
        mode: LayoutServicePageState.Preview,
        layoutKind: LayoutKind.Final,
      },
      { fetch: transport },
    );
    assert.equal(
      calls[1].headers.get("x-sitecore-contextid"),
      "synthetic-app-specific-preview",
    );
    await deliveryClient.getPage(
      "/",
      { site: "liberty-mutual-agent-portal", locale: "en" },
      { fetch: transport },
    );
    assert.equal(
      calls[2].headers.get("x-sitecore-contextid"),
      "synthetic-live-context",
    );
    assert.equal(calls[2].headers.has("sc_editMode"), false);
  } finally {
    mock.restoreAll();
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
