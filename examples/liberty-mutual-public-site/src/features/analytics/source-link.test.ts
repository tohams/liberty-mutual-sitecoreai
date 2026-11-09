import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutServicePageState } from "@sitecore-content-sdk/nextjs";
import { Default as ResourceContent } from "../../components/public-resource-content/PublicResourceContent";
import type { PublicResourceContentProps } from "../../components/public-resource-content/public-resource-content.props";

function renderAnswer(
  target?: string,
  linkState: "authored" | "omitted" | "empty" = "authored",
) {
  return renderToStaticMarkup(
    createElement(ResourceContent, {
      params: {},
      rendering: { componentName: "PublicResourceContent" },
      page: {
        locale: "en",
        layout: { sitecore: { context: {}, route: null } },
        mode: {
          name: LayoutServicePageState.Normal,
          designLibrary: { isVariantGeneration: false },
          isNormal: true,
          isPreview: false,
          isEditing: false,
          isDesignLibrary: false,
        },
      },
      fields: {
        question: { value: "Can I bundle my car and home insurance?" },
        answer: { value: "Authored answer" },
        ...(linkState === "omitted"
          ? {}
          : {
              sourceLink: {
                value:
                  linkState === "empty"
                    ? {}
                    : {
                        href: "https://www.libertymutual.com/bundling",
                        text: "Liberty Mutual: bundling auto and home",
                        ...(target === undefined ? {} : { target }),
                      },
              },
              nextStep: {
                value:
                  linkState === "empty"
                    ? {}
                    : { href: "/get-a-quote", text: "Explore a bundled quote" },
              },
            }),
        // A new native branch page can omit empty link properties from its
        // delivered fields even though the SDK Link's static type requires one.
      } as NonNullable<PublicResourceContentProps["fields"]>,
    }),
  );
}

test("the native authored source opens separately and remains eligible for the existing CTA tracker", () => {
  const markup = renderAnswer();
  const source = markup.match(
    /<a\b[^>]*>Liberty Mutual: bundling auto and home<\/a>/,
  )?.[0];
  assert.ok(source, "The native SDK Link must preserve the authored source");
  assert.match(source, /href="https:\/\/www\.libertymutual\.com\/bundling"/);
  assert.match(source, /class="public-text-link"/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(markup, /<a class="public-button" href="\/get-a-quote">/);
});

test("a newly created native resource page renders its question when optional links are absent or blank", () => {
  for (const state of ["omitted", "empty"] as const) {
    const markup = renderAnswer(undefined, state);
    assert.match(markup, /<h2>Can I bundle my car and home insurance\?<\/h2>/);
    assert.match(markup, /Authored answer/);
    assert.doesNotMatch(markup, /<a\b/);
  }
});

test("an explicitly authored source target is preserved", () => {
  for (const target of ["_self", "_blank", "reference-window"])
    assert.match(renderAnswer(target), new RegExp(`target="${target}"`));
});

test("CTA events remain disabled without optional consent and when GPC is enabled", async () => {
  const serverContext = process.env.SITECORE_EDGE_CONTEXT_ID;
  const browserContext = process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;
  process.env.SITECORE_EDGE_CONTEXT_ID ||= "analytics-test-context";
  process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID ||= "analytics-test-context";
  const documentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    throw new Error("Optional measurement must not send without consent");
  };
  try {
    const { recordPublicEvent } = await import("./public-analytics");
    for (const [cookie, globalPrivacyControl] of [
      ["", false],
      ["lm_public_consent_v1=essential", false],
      ["lm_public_consent_v1=all", true],
    ] as const) {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: { cookie },
      });
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { globalPrivacyControl },
      });
      await recordPublicEvent("CTA_CLICK", {
        label: "Liberty Mutual: bundling auto and home",
        destination: "/bundling",
        contentId: "answer-page",
      });
    }
    assert.equal(requests, 0);
  } finally {
    if (serverContext === undefined)
      delete process.env.SITECORE_EDGE_CONTEXT_ID;
    else process.env.SITECORE_EDGE_CONTEXT_ID = serverContext;
    if (browserContext === undefined)
      delete process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;
    else process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID = browserContext;
    globalThis.fetch = previousFetch;
    if (documentDescriptor)
      Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
    if (navigatorDescriptor)
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
