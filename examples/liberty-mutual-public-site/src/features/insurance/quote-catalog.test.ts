import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { productContextKey, productKeys } from "./public-context";

const nativeRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../authoring/items/liberty-mutual-public/items",
);
const item = (path: string) => readFileSync(join(nativeRoot, path), "utf8");

function field(source: string, name: string) {
  const fields = source.replaceAll("\r\n", "\n").split("    - ID:");
  const selected = fields.find((value) =>
    value.includes(`      Hint: ${name}\n`),
  );
  assert(selected, `Missing native field ${name}`);
  return selected.slice(selected.indexOf("      Value:") + 12).trim();
}
const references = (source: string) =>
  [...field(source, "products").matchAll(/\{([a-f\d-]{36})\}/gi)].map(
    ([, id]) => id.toLowerCase(),
  );
const catalogue = new Map(
  readdirSync(join(nativeRoot, "data/Data/Product options"))
    .filter((name) => name.endsWith(".yml"))
    .map((name) => {
      const source = item(`data/Data/Product options/${name}`);
      const id = source.match(/^ID: ([a-f\d-]{36})/im)?.[1];
      assert(id, `Missing native product ID in ${name}`);
      return [id.toLowerCase(), source];
    }),
);

test("every Home quote choice has a visible quote-page choice and an authored handoff", () => {
  const home = references(item("home/Home/Data/Product choices.yml"));
  const choices = references(
    item("home/Home/get-a-quote/Data/Product choices.yml"),
  );
  const handoffs = references(item("home/Home/get-a-quote/Data/Next step.yml"));
  const agentHandoffs = references(
    item("home/Home/contact-an-agent/Data/Next step.yml"),
  );
  assert(home.length > 0);
  for (const id of home) {
    const product = catalogue.get(id);
    assert(product, `Missing native product ${id}`);
    const key = field(product, "productKey");
    assert.equal(productContextKey(productKeys(key)), key);
    assert(choices.includes(id), `${key} is absent from the quote selector`);
    assert(handoffs.includes(id), `${key} has no quote handoff`);
    assert(
      agentHandoffs.includes(id),
      `${key} is absent from the agent-contact summary`,
    );
    const quote = field(product, "quoteLink").match(/\burl="([^"]+)"/);
    assert(quote, `${key} has no authored quote destination`);
    assert.equal(new URL(quote[1]).protocol, "https:");
  }
});

test("existing auto and property bundle combinations retain their native quote handoffs", () => {
  const handoffs = references(item("home/Home/get-a-quote/Data/Next step.yml"));
  const keys = handoffs.map((id) => field(catalogue.get(id)!, "productKey"));
  for (const key of ["auto-home", "auto-renters", "auto-condo"])
    assert(keys.includes(key), `Missing native ${key} quote handoff`);
});
