import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSearchQuestion } from "./normalize-search-question";

test("keeps the subject of an unsupported natural-language question", () => {
  assert.equal(
    normalizeSearchQuestion("How do I renew my passport?"),
    "renew passport",
  );
});
test("preserves every product and subject word in the bundle question", () => {
  assert.equal(
    normalizeSearchQuestion("Can I bundle auto and renters insurance?"),
    "bundle auto renters insurance",
  );
});
test("preserves negation, exceptions, timing, and negative contractions", () => {
  assert.equal(
    normalizeSearchQuestion(
      "My policy does not cover flooding without an endorsement before renewal.",
    ),
    "policy not cover flooding without endorsement before renewal",
  );
  assert.equal(
    normalizeSearchQuestion("Doesn’t my policy cover damage?"),
    "Doesn't policy cover damage",
  );
});
test("handles punctuation while retaining acronyms and numeric content", () => {
  assert.equal(
    normalizeSearchQuestion("What's AUTO, renters—insurance in OR, for 2026?!"),
    "AUTO renters insurance OR 2026",
  );
});
test("empty, punctuation-only, and filler-only inputs have no subject terms", () => {
  for (const question of ["", "   ", ",!?", "How do I?", "What is the?"]) {
    assert.equal(normalizeSearchQuestion(question), "");
  }
});
