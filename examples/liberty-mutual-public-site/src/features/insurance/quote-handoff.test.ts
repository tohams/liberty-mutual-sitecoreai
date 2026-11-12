import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test, { before } from "node:test";
import {
  LayoutServicePageState,
  SitecoreProviderReactContext,
} from "@sitecore-content-sdk/nextjs";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { PublicQuoteHandoffProps } from "../../components/public-quote-handoff/public-quote-handoff.props";

let Default: typeof import("../../components/public-quote-handoff/PublicQuoteHandoff").Default;
let Agent: typeof import("../../components/public-quote-handoff/PublicQuoteHandoff").Agent;
before(async () => {
  process.env.SITECORE_EDGE_CONTEXT_ID ||= "synthetic-quote-context";
  process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID ||=
    "synthetic-quote-context";
  ({ Default, Agent } =
    await import("../../components/public-quote-handoff/PublicQuoteHandoff"));
});

const noop = () => {};
function renderHandoff(query = "", editing = false, agent = false) {
  const page: PublicQuoteHandoffProps["page"] = {
    locale: "en",
    layout: { sitecore: { context: {}, route: null } },
    mode: {
      name: editing
        ? LayoutServicePageState.Edit
        : LayoutServicePageState.Normal,
      designLibrary: { isVariantGeneration: false },
      isNormal: !editing,
      isEditing: editing,
      isPreview: false,
      isDesignLibrary: false,
    },
  };
  const content = createElement(agent ? Agent : Default, {
    params: {},
    rendering: { componentName: "PublicQuoteHandoff" },
    page,
    fields: {
      heading: { value: "Get your quote" },
      agentLink: {
        value: { href: "/contact-an-agent", text: "Find an agent" },
      },
      products: [
        {
          id: "auto",
          fields: {
            label: { value: "Auto" },
            productKey: { value: "auto" },
            quoteLink: {
              value: {
                href: "https://www.libertymutual.com/get-a-quote",
                text: "Get my price",
              },
            },
          },
        },
      ],
    },
  });
  return renderToStaticMarkup(
    createElement(
      SitecoreProviderReactContext.Provider,
      {
        value: {
          page,
          componentMap: new Map(),
          loadImportMap: async () => ({ default: [] }),
        },
      },
      createElement(
        AppRouterContext.Provider,
        {
          value: {
            back: noop,
            forward: noop,
            refresh: noop,
            push: noop,
            replace: noop,
            prefetch: noop,
            bfcacheId: "quote-test",
          },
        },
        createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams(query) },
          content,
        ),
      ),
    ),
  );
}

test("a generic quote entry asks for product choices before showing its next-step panel", () => {
  const markup = renderHandoff("zip=97201");
  assert.doesNotMatch(markup, /public-handoff|Get your quote|Get my price/);
});

test("a chosen product reveals its native quote action and carried ZIP Code", () => {
  const markup = renderHandoff("product=auto&zip=97201");
  assert.match(markup, /Get your quote/);
  assert.match(markup, /Auto/);
  assert.match(markup, /97201/);
  assert.match(markup, /https:\/\/www\.libertymutual\.com\/get-a-quote/);
  assert.match(markup, /Get my price/);
});

test("authors can still edit an unselected quote panel, and agent contact remains available", () => {
  assert.match(renderHandoff("", true), /Get your quote/);
  assert.match(
    renderHandoff("question=Can%20I%20bundle%3F", false, true),
    /Find an agent/,
  );
});
