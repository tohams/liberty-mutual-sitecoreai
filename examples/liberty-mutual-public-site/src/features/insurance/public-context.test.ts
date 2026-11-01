import assert from "node:assert/strict";
import test from "node:test";
import {
  contextualInternalHref,
  productContextKey,
  productKeys,
  publicContext,
} from "./public-context";

test("normalizes supported bundle and standalone product choices", () => {
  assert.deepEqual(productKeys("HOME,AUTO"), ["auto", "home"]);
  assert.deepEqual(productKeys("auto-renters"), ["auto", "renters"]);
  assert.deepEqual(productKeys("auto-condo"), ["auto", "condo"]);
  assert.deepEqual(productKeys("home,renters"), ["home"]);
  for (const key of ["pet", "motorcycle", "life", "small-business"])
    assert.equal(productContextKey(productKeys(key)), key);
  assert.deepEqual(productKeys("unsupported-product"), []);
});

test("keeps valid journey context without treating ZIP Code as coverage eligibility", () => {
  const context = publicContext(
    new URLSearchParams({
      product: "auto-home",
      state: "tx",
      zip: "75001",
      source: "bundling",
      question: "Can I bundle?",
    }),
  );
  assert.deepEqual(context, {
    products: ["auto", "home"],
    state: "TX",
    zip: "75001",
    source: "bundling",
    question: "Can I bundle?",
  });
  const zipOnly = publicContext(new URLSearchParams({ zip: "75001" }));
  assert.equal(zipOnly.state, "");
});

test("rejects malformed location/source values and bounds free text", () => {
  const context = publicContext(
    new URLSearchParams({
      state: "ZZ",
      zip: "75001-1234",
      source: "https://external.test",
      question: "\u0000" + "x".repeat(300),
    }),
  );
  assert.equal(context.state, "");
  assert.equal(context.zip, "");
  assert.equal(context.source, "");
  assert.equal(context.question.length, 250);
  assert.ok(!context.question.includes("\u0000"));
});

test("preserves context on the actual native internal destination and never adds it to external systems", () => {
  const context = publicContext(
    new URLSearchParams({
      product: "auto-home",
      state: "TX",
      zip: "75001",
      source: "bundling",
    }),
  );
  assert.equal(
    contextualInternalHref(
      "/get-a-quote?existing=yes#options",
      "https://public.test",
      context,
    ),
    "/get-a-quote?existing=yes&product=auto-home&state=TX&source=bundling&zip=75001#options",
  );
  assert.equal(
    contextualInternalHref(
      "https://www.libertymutual.com/get-a-quote",
      "https://public.test",
      context,
    ),
    null,
  );
  assert.equal(
    contextualInternalHref(
      "javascript:alert(1)",
      "https://public.test",
      context,
    ),
    null,
  );
  assert.equal(
    contextualInternalHref(
      "//external.test/quote",
      "https://public.test",
      context,
    ),
    null,
  );
});
