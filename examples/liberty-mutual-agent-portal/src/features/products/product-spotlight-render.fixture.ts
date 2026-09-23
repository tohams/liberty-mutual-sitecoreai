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
import { Default as ProductDetails } from "@/components/product-details/ProductDetails";
import { Default as ProductSpotlight } from "@/components/product-spotlight/ProductSpotlight";
import type { ProductSpotlightProps } from "@/components/product-spotlight/product-spotlight.props";
import type { PortalBootstrap, ProductCatalogPage } from "@/contracts/portal";
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

const catalog: ProductCatalogPage[] = [
  {
    id: "11111111111111111111111111111111",
    href: "/products/Small-business-guidance",
    title: "CMS small business title",
    summary: "CMS summary for a published product page.",
    productIds: ["bop", "workers-comp"],
    channel: "all",
    image: {
      src: "https://example.com/cms-product.jpg",
      alt: "Published product image",
    },
  },
  {
    id: "22222222222222222222222222222222",
    href: "/products/household-guidance",
    title: "CMS household title",
    summary: "CMS household summary.",
    productIds: ["auto"],
    channel: "all",
  },
  {
    id: "33333333333333333333333333333333",
    href: "/products/wholesale-guidance",
    title: "Wholesale catalog page",
    summary: "Wholesale-only guidance.",
    productIds: ["specialty-casualty"],
    channel: "wholesale",
  },
];

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
  productCatalog = catalog,
  pageContentFor,
}: {
  query?: string;
  spotlight?: boolean;
  editing?: boolean;
  missingFields?: boolean;
  pageContent?: ReactNode;
  pageContentFor?: (page: Page) => ReactNode;
  productCatalog?: ProductCatalogPage[] | null;
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
  const authoredPageContent = pageContentFor?.(page) ?? pageContent;
  const app = createElement(PortalApp, {
    initialData: data,
    isEditing: editing,
    productCatalog,
    route: authoredPageContent ? "/products/workers-compensation" : "/products",
    workspaceEditorial: createElement("p", null, "Existing product editorial"),
    pageContent: authoredPageContent,
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

test("catalog cards use published CMS content and URLs while preserving operational references", () => {
  const html = render();
  assert.match(html, /<h2>CMS small business title<\/h2>/);
  assert.match(html, /CMS summary for a published product page/);
  assert.match(html, /src="https:\/\/example.com\/cms-product.jpg"/);
  assert.match(html, /alt="Published product image"/);
  assert.match(html, /href="\/products\/Small-business-guidance\?state=IL"/);
  assert.match(html, /<h2>CMS household title<\/h2>/);
  assert.doesNotMatch(
    html,
    /Wholesale catalog page|<h2>Businessowners policy<\/h2>/,
  );
  const firstCard = html
    .split('class="product-card"')[1]
    .split("</article>")[0];
  assert.match(firstCard, /Product to prepare/);
  assert.match(
    firstCard,
    /<option value="" selected="">Choose a product<\/option>/,
  );
  assert.match(
    firstCard,
    /<option value="bop">Businessowners policy<\/option>/,
  );
  assert.match(
    firstCard,
    /<option value="workers-comp">Workers compensation<\/option>/,
  );
  assert.match(
    firstCard,
    /disabled="" aria-label="Prepare account from CMS small business title"/,
  );
  const household = html
    .split('class="product-card"')[2]
    .split("</article>")[0];
  assert.doesNotMatch(household, /Prepare account|Product to prepare/);
});

test("a single eligible reference can prepare its exact operational product, and editing disables actions", () => {
  const productCatalog = [{ ...catalog[0], productIds: ["workers-comp"] }];
  const html = render({ productCatalog });
  assert.match(html, /aria-label="Prepare account for Workers compensation"/);
  assert.doesNotMatch(html, /Product to prepare/);
  assert.match(
    render({ productCatalog, editing: true }),
    /disabled="" aria-label="Prepare account for Workers compensation"/,
  );
});

test("empty or unavailable CMS catalogs do not restore fixture product cards", () => {
  const empty = render({ productCatalog: [] });
  assert.match(
    empty,
    /No product pages are available for this state and business line/,
  );
  const unavailable = render({ productCatalog: null });
  assert.match(unavailable, /Product pages are temporarily unavailable/);
  for (const html of [empty, unavailable]) {
    assert.doesNotMatch(
      html,
      /class="product-card"|Product to prepare|Prepare account for/,
    );
  }
});

test("ProductDetails renders the page title, summary, image and body without landing content", () => {
  const html = render({
    pageContentFor: (page) =>
      createElement(ProductDetails, {
        page,
        params: { RenderingIdentifier: "native-product-details" },
        rendering: { componentName: "ProductDetails" },
        fields: {
          Title: { value: "New authored product page" },
          catalogSummary: { value: "One summary shared with the catalog." },
          catalogImage: {
            value: {
              src: "https://example.com/product-details.jpg?width=1200",
              alt: "An authored product photo",
            },
          },
          catalogBody: {
            value: "<h2>Coverage guidance</h2><p>Native rich text content.</p>",
          },
        },
      }),
  });
  assert.match(html, /id="native-product-details"/);
  assert.match(html, /<h1>New authored product page<\/h1>/);
  assert.match(html, /One summary shared with the catalog/);
  assert.match(
    html,
    /src="https:\/\/example.com\/product-details.jpg\?width=1200"/,
  );
  assert.match(html, /alt="An authored product photo"/);
  assert.match(
    html,
    /<h2>Coverage guidance<\/h2><p>Native rich text content.<\/p>/,
  );
  assert.doesNotMatch(html, /class="product-grid"|id="product-spotlight"/);
});
