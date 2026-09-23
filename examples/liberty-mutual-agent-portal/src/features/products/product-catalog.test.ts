import assert from "node:assert/strict";
import test from "node:test";
import type { RouteData } from "@sitecore-content-sdk/nextjs";
import type { ProductCatalogPage } from "@/contracts/portal";
import { fixtures } from "@/server/data/fixtures";
import {
  availableProductCatalog,
  canAccessProductPage,
} from "@/server/data/product-page-access";
import { PRODUCT_PAGE_TEMPLATE_ID } from "@/server/data/cms-products";
import {
  productPagesForState,
  type ProductCatalogContext,
} from "./product-catalog";

const at = "2026-09-23T12:00:00Z";
const page: ProductCatalogPage = {
  id: "123456781234123412341234567890ab",
  href: "/products/household-guidance",
  title: "Household guidance",
  summary: "Published household guidance.",
  productIds: ["auto", "recreation"],
  channel: "all",
};
function context(agentId = "daniel"): ProductCatalogContext {
  const agent = fixtures.agents.find((item) => item.id === agentId)!;
  return structuredClone({
    agent,
    agency: fixtures.agencies.find((item) => item.id === agent.agencyId)!,
    products: fixtures.products,
    eligibility: fixtures.eligibility,
  });
}

test("published pages use explicit references and stay visible when another referenced product is available", () => {
  const data = context();
  const illinois = productPagesForState([page], data, "IL", "all", at);
  assert.deepEqual(
    illinois.map((item) => item.page),
    [page],
  );
  assert.deepEqual(
    illinois[0].products.map((item) => item.id),
    ["auto"],
  );
  assert.deepEqual(
    illinois[0].eligibleProducts.map((item) => item.id),
    ["auto"],
  );
  const texas = productPagesForState([page], data, "TX", "all", at);
  assert.deepEqual(
    texas[0].eligibleProducts.map((item) => item.id),
    ["auto", "recreation"],
  );
  assert.deepEqual(
    productPagesForState([page], data, "TX", "commercial", at),
    [],
  );
  assert.deepEqual(productPagesForState([], data, "TX", "all", at), []);
});

test("browsing is separate from transaction authority and surety never opens a submission", () => {
  const jordan = context("jordan");
  const available = productPagesForState([page], jordan, "TX", "all", at);
  assert.equal(available.length, 1);
  assert.equal(available[0].products.length, 2);
  assert.deepEqual(available[0].eligibleProducts, []);
  const marcus = context("marcus");
  const surety = { ...page, productIds: ["contract-surety"] };
  assert.equal(
    productPagesForState([surety], marcus, "TX", "all", at)[0].products.length,
    1,
  );
  assert.deepEqual(
    productPagesForState([surety], marcus, "TX", "all", at)[0].eligibleProducts,
    [],
  );
  const expiredAppointment = context();
  for (const record of expiredAppointment.eligibility.carrierAppointments)
    record.status = "revoked";
  const readable = productPagesForState(
    [page],
    expiredAppointment,
    "TX",
    "all",
    at,
  );
  assert.equal(readable.length, 1);
  assert.deepEqual(readable[0].eligibleProducts, []);
});

test("unlicensed states, unknown references, withdrawn products, and channel mismatches fail closed", () => {
  const data = context();
  assert.deepEqual(productPagesForState([page], data, "FL", "all", at), []);
  assert.deepEqual(productPagesForState([page], data, "", "all", at), []);
  assert.deepEqual(
    productPagesForState(
      [{ ...page, productIds: ["auto", "unknown"] }],
      data,
      "TX",
      "all",
      at,
    ),
    [],
  );
  assert.deepEqual(
    productPagesForState([{ ...page, productIds: [] }], data, "TX", "all", at),
    [],
  );
  assert.deepEqual(
    productPagesForState(
      [{ ...page, channel: "wholesale" }],
      data,
      "TX",
      "all",
      at,
    ),
    [],
  );
  for (const rule of data.eligibility.productRules) rule.status = "suspended";
  assert.deepEqual(productPagesForState([page], data, "TX", "all", at), []);
});

test("published CMS order and reference order survive deduplication and channel selection", () => {
  const data = context("elena");
  const wholesale = {
    ...page,
    id: "wholesale",
    channel: "wholesale" as const,
    productIds: [
      "professional-liability",
      "specialty-casualty",
      "professional-liability",
    ],
  };
  const independent = {
    ...wholesale,
    id: "independent",
    channel: "independent" as const,
  };
  const all = { ...wholesale, id: "all", channel: "all" as const };
  const result = productPagesForState(
    [wholesale, independent, all],
    data,
    "TX",
    "all",
    at,
  );
  assert.deepEqual(
    result.map((item) => item.page.id),
    ["wholesale", "all"],
  );
  assert.deepEqual(
    result[0].products.map((item) => item.id),
    ["professional-liability", "specialty-casualty"],
  );
});

test("direct product URLs enforce catalog publication, channel, and the selected licensed risk state", () => {
  const route: RouteData = {
    name: "household-guidance",
    itemId: page.id,
    templateId: PRODUCT_PAGE_TEMPLATE_ID,
    placeholders: {},
  };
  const data = context();
  assert.equal(canAccessProductPage(route, [page], data, "TX", false), true);
  assert.equal(
    canAccessProductPage(route, [page], data, undefined, false),
    true,
  );
  assert.equal(canAccessProductPage(route, [page], data, "FL", false), false);
  assert.equal(
    canAccessProductPage(route, [page], data, "invalid", false),
    false,
  );
  assert.equal(canAccessProductPage(route, [], data, "TX", false), false);
  assert.equal(canAccessProductPage(route, null, data, "TX", false), false);
  assert.equal(
    canAccessProductPage(
      route,
      [{ ...page, channel: "wholesale" }],
      data,
      "TX",
      false,
    ),
    false,
  );
  assert.equal(
    canAccessProductPage(
      route,
      [{ ...page, productIds: ["recreation"] }],
      data,
      "IL",
      false,
    ),
    false,
  );
  assert.equal(canAccessProductPage(route, null, data, "FL", true), true);
  assert.equal(
    canAccessProductPage(
      { ...route, templateId: "portal-page" },
      [],
      data,
      "TX",
      false,
    ),
    true,
  );
});

test("the browser catalog payload contains only pages available for the selected licensed state and channel", () => {
  const data = context();
  const unavailable = {
    ...page,
    id: "unavailable",
    productIds: ["recreation"],
  };
  const wholesale = { ...page, id: "wholesale", channel: "wholesale" as const };
  const catalog = [page, unavailable, wholesale];
  assert.deepEqual(availableProductCatalog(catalog, data, "IL"), [page]);
  assert.deepEqual(availableProductCatalog(catalog, data, "TX"), [
    page,
    unavailable,
  ]);
  assert.deepEqual(availableProductCatalog(catalog, data, "FL"), []);
  assert.deepEqual(availableProductCatalog(catalog, data, ""), []);
  assert.deepEqual(
    availableProductCatalog(
      catalog,
      { ...data, agent: { ...data.agent, licensedStates: [] } },
      undefined,
    ),
    [],
  );
  assert.equal(
    catalog.length,
    3,
    "filtering must not mutate the published catalog",
  );
});
