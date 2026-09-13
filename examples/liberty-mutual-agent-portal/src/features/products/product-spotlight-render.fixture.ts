import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SitecoreProviderReactContext,
  type Page,
} from "@sitecore-content-sdk/nextjs";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { Default as ProductSpotlight } from "@/components/product-spotlight/ProductSpotlight";
import type { ProductSpotlightProps } from "@/components/product-spotlight/product-spotlight.props";
import type { PortalBootstrap } from "@/contracts/portal";
import { PortalApp } from "../portal/PortalApp";
import agents from "../../../fixtures/agents.json";
import agencies from "../../../fixtures/agencies.json";
import products from "../../../fixtures/products.json";
import eligibility from "../../../fixtures/eligibility.json";
import growthCampaign from "../../../fixtures/growth-campaign.json";

const agent = agents.find((item) => item.id === "jordan")!;
const data = {
  agent,
  agency: agencies.find((item) => item.id === agent.agencyId),
  products,
  eligibility,
  growthCampaign,
  asOfDate: "2026-09-10T12:00:00Z",
  productionPeriod: {
    start: "2025-09-01",
    end: "2026-08-31",
    label: "Past year",
    currency: "USD",
  },
  session: {
    stateVersion: 0,
    runId: "spotlight-render-test",
    profileId: "",
    profileGeneration: 0,
    expiresAt: "2026-09-11T12:00:00Z",
  },
  udlIdentity: null,
  policies: [],
  submissions: [],
  bondRequests: [],
  tasks: [],
  resources: [],
  learning: [],
  contacts: [],
  activity: [],
  favorites: [],
  registrations: [],
  actionEligibility: { submissions: {}, bondRequests: {} },
} as PortalBootstrap;

const fields: ProductSpotlightProps["fields"] = {
  eyebrow: { value: "PREPARE FOR YOUR NEXT CONVERSATION" },
  headline: { value: "Workers compensation, with a clearer next step" },
  body: { value: "<p>Explore practical preparation guidance.</p>" },
  actionLink: {
    value: {
      href: "/resources/workers-compensation-guide",
      text: "Explore the preparation guide",
      querystring: "source=spotlight",
      anchor: "prepare",
    },
  },
};

function render({
  query = "state=IL",
  spotlight = true,
  editing = false,
  missingFields = false,
  pageContent,
}: {
  query?: string;
  spotlight?: boolean;
  editing?: boolean;
  missingFields?: boolean;
  pageContent?: ReactNode;
} = {}) {
  const page = {
    locale: "en",
    layout: { sitecore: { context: {}, route: { name: "products" } } },
    mode: {
      name: editing ? "edit" : "normal",
      isEditing: editing,
      isPreview: false,
      isNormal: !editing,
      isDesignLibrary: false,
      designLibrary: { isVariantGeneration: false },
    },
  } as Page;
  const app = createElement(PortalApp, {
    initialData: data,
    route: pageContent ? "/products/workers-compensation" : "/products",
    workspaceEditorial: createElement("p", null, "Existing product editorial"),
    pageContent,
    productsSpotlight: spotlight
      ? createElement(ProductSpotlight, {
          page,
          params: { RenderingIdentifier: "product-spotlight" },
          rendering: { componentName: "ProductSpotlight" },
          fields: missingFields ? undefined : fields,
        })
      : undefined,
  });
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      {
        value: {
          back() {},
          forward() {},
          refresh() {},
          push() {},
          replace() {},
          prefetch() {},
          bfcacheId: "spotlight-test",
        },
      },
      createElement(
        PathnameContext.Provider,
        { value: "/products" },
        createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams(query) },
          createElement(
            SitecoreProviderReactContext.Provider,
            {
              value: {
                page,
                componentMap: new Map(),
                loadImportMap: async () => ({ default: [] }),
              },
            },
            app,
          ),
        ),
      ),
    ),
  );
}

test("the CMS spotlight replaces only the static hero and leaves the product catalog and editorial intact", () => {
  const baseline = render({ spotlight: false });
  const authored = render();
  assert.match(baseline, /Protection built around/);
  assert.doesNotMatch(authored, /Protection built around/);
  assert.equal((authored.match(/id="product-spotlight"/g) ?? []).length, 1);
  assert.match(authored, /Workers compensation, with a clearer next step/);
  assert.match(authored, /Existing product editorial/);
  const catalog = (html: string) =>
    html
      .split('<div class="product-grid">')[1]
      ?.split('<div class="source-note">')[0];
  assert.ok(catalog(baseline));
  assert.equal(catalog(authored), catalog(baseline));
  assert.ok(
    authored.indexOf('id="product-spotlight"') <
      authored.indexOf('class="product-grid"'),
  );
});

test("spotlight links use the same selected or initial risk state as the product catalog", () => {
  for (const [query, state] of [
    ["state=IL", "IL"],
    ["", "TX"],
  ]) {
    const html = render({ query });
    assert.match(html, new RegExp(`<option value="${state}" selected="">`));
    assert.match(
      html,
      new RegExp(
        `href="/resources/workers-compensation-guide\\?state=${state}&amp;source=spotlight#prepare"`,
      ),
    );
    assert.doesNotMatch(html, /%3F/);
  }
  const invalid = render({ query: "state=FL" });
  assert.match(
    invalid,
    /The requested state is not available for your license/,
  );
  assert.match(
    invalid,
    /href="\/resources\/workers-compensation-guide\?source=spotlight#prepare"/,
  );
  assert.doesNotMatch(invalid, />Prepare account<\/button>/);
});

test("missing CMS content keeps the original hero while editors receive a datasource prompt", () => {
  assert.match(render({ missingFields: true }), /Protection built around/);
  assert.match(
    render({ missingFields: true, editing: true }),
    /Select a Product Spotlight content item/,
  );
  const editing = render({ editing: true });
  assert.match(
    editing,
    /href="\/resources\/workers-compensation-guide\?source=spotlight#prepare"/,
  );
  assert.equal(fields?.actionLink?.value.querystring, "source=spotlight");
});

test("product detail content does not acquire the landing-page spotlight", () => {
  const html = render({
    pageContent: createElement("article", null, "Product detail content"),
  });
  assert.match(html, /Product detail content/);
  assert.doesNotMatch(
    html,
    /id="product-spotlight"|Existing product editorial|Protection built around/,
  );
});
