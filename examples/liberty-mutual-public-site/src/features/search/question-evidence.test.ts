import assert from "node:assert/strict";
import test from "node:test";
import { supportedQuestionResults } from "./question-evidence";

const bundle =
  "Can I bundle my car and home insurance? Explore combining eligible auto and home policies. Bundling may qualify you for savings. Compare their coverages, limits, and deductibles.";
const texas =
  "What should I review when choosing auto insurance in Texas? Texas-specific information when reviewing car insurance.";
const policy =
  "Can this information confirm whether my particular loss is covered? General insurance information cannot determine whether your specific loss is covered. Review your policy and contact your agent.";
const candidates = [bundle, texas, policy];
const supported = (question: string, documents = candidates) =>
  supportedQuestionResults(question, documents, (text) => text);

test("retains native ordering for supported questions and product synonyms", () => {
  assert.deepEqual(supported("Can I bundle my car and home insurance?"), [
    bundle,
  ]);
  assert.deepEqual(supported("Can I combine home and car coverage?"), [bundle]);
  assert.deepEqual(
    supported("What should I know about auto insurance in Texas?"),
    [texas],
  );
  assert.deepEqual(
    supported("Is this particular loss covered under my policy?"),
    [policy],
  );
});

test("broad insurance words do not support an unknown subject or missing state", () => {
  assert.deepEqual(supported("Does insurance cover my pet dragon?"), []);
  assert.deepEqual(supported("Does my home policy cover a volcano?"), []);
  assert.deepEqual(
    supported("What should I know about auto insurance in Oregon?"),
    [],
  );
  assert.deepEqual(supported("How do I renew my passport?"), []);
});

test("new authored evidence supports its subject without a query exception or deployment", () => {
  const marine =
    "What should I review about sailboat insurance? Review sailboat eligibility and speak with an agent.";
  assert.deepEqual(
    supported("What should I review about sailboat insurance?"),
    [],
  );
  assert.deepEqual(
    supported("What should I review about sailboat insurance?", [
      ...candidates,
      marine,
    ]),
    [marine],
  );
});

test("keyword browsing keeps the native candidates and rank", () => {
  assert.deepEqual(supported("auto home"), candidates);
  assert.deepEqual(supported("insurance"), candidates);
  assert.deepEqual(supported(""), candidates);
});

test("support cannot be assembled by combining unrelated candidate documents", () => {
  assert.deepEqual(
    supported("Can I bundle auto and renters insurance?", [
      bundle,
      "Renters insurance protects belongings.",
    ]),
    [],
  );
});

test("html formatting and plurals do not conceal authored evidence", () => {
  assert.deepEqual(
    supported("How do deductibles affect collision coverage?", [
      "<h2>Collision coverage and deductibles</h2><p>The selected deductible affects cost.</p>",
    ]),
    [
      "<h2>Collision coverage and deductibles</h2><p>The selected deductible affects cost.</p>",
    ],
  );
});
