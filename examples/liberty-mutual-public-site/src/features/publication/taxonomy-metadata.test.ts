import assert from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_ROOT,
  ANSWER_TEMPLATE,
  mapPublishedAnswer,
  publishedTaxonomy,
  searchDocument,
  type NativeTaxonomyField,
  type NativeTaxonomyOption,
} from "./content";
import { LiveContent } from "./live-content";
import { contentGet } from "./content-http";

const origin = "https://public.example.com";
const id = "11111111-2222-5333-8444-555555555555";
const optionTemplate = "9dc18d3c-9944-507a-aeab-9787c8fc4d9c";
const taxonomy =
  "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Taxonomy";
const text = (value: unknown) => ({ jsonValue: { value } });
function options(folder: string, names: string[]): NativeTaxonomyField {
  const targetItems = names.map((name, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-2222-5333-8444-555555555555`,
    name,
    path: `${taxonomy}/${folder}/${name}`,
    template: { id: optionTemplate },
  }));
  return {
    value: targetItems.map((item) => `{${item.id}}`).join("|"),
    targetIds: targetItems.map((item) => item.id),
    targetItems,
  };
}
function answer() {
  return {
    id,
    path: `${ANSWER_ROOT}/Bundle car and home`,
    version: 6,
    template: { id: ANSWER_TEMPLATE },
    question: text("Can I bundle my car and home insurance?"),
    answer: text("Review eligible products and coverage."),
    canonicalUrl: text("/insurance-resources/bundle-car-and-home"),
    state: options("States", ["TX", "FL", "IL"]),
    product: options("Products", ["home", "auto", "condo"]),
    audience: options("Audiences", ["customer", "prospective-customer"]),
  };
}

test("native Checklist references reach Search and schema 1.0 API as stable independent tokens", async () => {
  const transport: typeof fetch = async (_input, init) => {
    const { query } = JSON.parse(String(init?.body));
    assert.match(query, /\.\.\. on MultilistField/);
    assert.match(
      query,
      /targetIds targetItems \{ id name path template \{ id \} \}/,
    );
    return Response.json({
      data: {
        item: {
          path: ANSWER_ROOT,
          children: { results: [answer()], pageInfo: { hasNext: false } },
        },
      },
    });
  };
  const reader = new LiveContent("live-only", origin, transport);
  const [published] = await reader.readAll();
  assert.equal(published.state, "FL,IL,TX");
  assert.equal(published.product, "auto,condo,home");
  assert.equal(published.audience, "customer,prospective-customer");
  assert.equal(searchDocument(published).fields?.product, "auto,condo,home");
  const response = await contentGet(
    new Request(`${origin}/api/content/v1/answers`),
    undefined,
    reader,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.schemaVersion, "1.0");
  assert.equal(body.data[0].product, "auto,condo,home");
  assert(!JSON.stringify(body.data[0]).includes(optionTemplate));
});

test("legacy published strings are unchanged while compound native product refs expand", () => {
  for (const value of ["auto-home", "auto-condo", "auto-renters", "auto,home"])
    assert.equal(publishedTaxonomy(text(value), "product"), value);
  assert.equal(publishedTaxonomy(text("All"), "state"), "All");
  assert.equal(
    publishedTaxonomy(
      { value: "auto-home", targetIds: [], targetItems: [], jsonValue: [] },
      "product",
    ),
    "auto-home",
  );
  assert.equal(
    publishedTaxonomy(
      { value: "All", targetIds: ["All"], targetItems: [], jsonValue: [] },
      "state",
    ),
    "All",
  );
  assert.equal(publishedTaxonomy(undefined, "audience"), "");
  assert.equal(
    publishedTaxonomy(options("Products", ["auto-home", "condo"]), "product"),
    "auto,condo,home",
  );
  assert.equal(
    publishedTaxonomy({ targetIds: [], targetItems: [] }, "product"),
    "",
  );
});

test("Checklist ordering cannot alter the published fingerprint", () => {
  const first = answer();
  const second = structuredClone(first);
  second.product.targetIds!.reverse();
  second.product.targetItems!.reverse();
  assert.equal(
    mapPublishedAnswer(first, origin).revision,
    mapPublishedAnswer(second, origin).revision,
  );
});

test("unpublished, unknown, foreign, or mismatched references fail rather than exposing GUIDs", () => {
  const missing = options("Products", ["auto", "home"]);
  missing.targetItems!.pop();
  assert.throws(
    () => publishedTaxonomy(missing, "product"),
    /MISSING_PUBLISHED_TAXONOMY/,
  );
  const absent = options("Products", ["auto"]);
  absent.targetItems = [null];
  assert.throws(
    () => publishedTaxonomy(absent, "product"),
    /MISSING_PUBLISHED_TAXONOMY/,
  );
  for (const change of [
    (item: NativeTaxonomyOption) => {
      item.path = `${taxonomy}/States/auto`;
    },
    (item: NativeTaxonomyOption) => {
      item.path = `${taxonomy}/Products/nested/auto`;
    },
    (item: NativeTaxonomyOption) => {
      item.template.id = id;
    },
    (item: NativeTaxonomyOption) => {
      item.id = id;
    },
    (item: NativeTaxonomyOption) => {
      item.name = "auto|home";
    },
  ]) {
    const invalid = options("Products", ["auto"]);
    change(invalid.targetItems![0]!);
    assert.throws(
      () => publishedTaxonomy(invalid, "product"),
      /INVALID_PUBLISHED_TAXONOMY/,
    );
  }
  for (const value of [
    id,
    id.replaceAll("-", ""),
    `auto,${id}`,
    "auto|home",
    "auto,{unresolved}",
  ])
    assert.throws(
      () => publishedTaxonomy(text(value), "product"),
      /INVALID_PUBLISHED_TAXONOMY/,
    );
  assert.throws(
    () => publishedTaxonomy({ jsonValue: [{ id }] }, "product"),
    /INVALID_PUBLISHED_TAXONOMY/,
  );
  const mismatch = options("Products", ["auto"]);
  mismatch.value = id;
  assert.throws(
    () => publishedTaxonomy(mismatch, "product"),
    /INVALID_PUBLISHED_TAXONOMY/,
  );
});

test("All states and All products cannot be mixed with narrower native selections", () => {
  assert.equal(publishedTaxonomy(options("States", ["All"]), "state"), "All");
  assert.throws(
    () => publishedTaxonomy(options("States", ["All", "TX"]), "state"),
    /INVALID_PUBLISHED_TAXONOMY/,
  );
  assert.throws(
    () => publishedTaxonomy(options("Products", ["all", "auto"]), "product"),
    /INVALID_PUBLISHED_TAXONOMY/,
  );
});

test("All consumers excludes narrower consumer audiences but can include independent agents", () => {
  for (const narrower of ["customer", "prospective-customer"])
    assert.throws(
      () =>
        publishedTaxonomy(
          options("Audiences", ["consumer", narrower]),
          "audience",
        ),
      /INVALID_PUBLISHED_TAXONOMY/,
    );
  assert.equal(
    publishedTaxonomy(
      options("Audiences", ["consumer", "independent-agent"]),
      "audience",
    ),
    "consumer,independent-agent",
  );
});
