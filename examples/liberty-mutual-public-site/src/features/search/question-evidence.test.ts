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

test("keyword phrases receive the same support check while empty or generic browsing preserves native order", () => {
  assert.deepEqual(supported("auto home"), [bundle]);
  assert.deepEqual(supported("insurance"), candidates);
  assert.deepEqual(supported(""), candidates);
  for (const query of [
    "pet insurance",
    "motorcycle insurance",
    "life insurance",
    "small business insurance",
    "car insurance cyberextortion",
  ])
    assert.deepEqual(supported(query), [], query);
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

test("ordinary grammar, compound words, and savings phrasing do not hide genuine results", () => {
  const discount =
    "Are bundling and multi-policy savings the same thing? A Multi-Policy Discount can save money when you bundle auto and home insurance.";
  const lowerPremium =
    "Reduce home and auto insurance premiums by exploring an eligible bundle.";
  for (const query of [
    "Is there a multi-policy discount?",
    "What is a multipolicy discount?",
    "multi policy discount",
    "Are there cheaper home and car policies?",
    "How do I get cheaper home and car insurance?",
    "saving money on auto and home",
  ])
    assert.deepEqual(supported(query, [discount]), [discount], query);
  assert.deepEqual(
    supported("How can I lower my insurance costs?", [lowerPremium]),
    [lowerPremium],
  );
  assert.deepEqual(
    supported(
      "Are there cheaper home and car policies covering cyberextortion?",
      [discount],
    ),
    [],
  );
  assert.deepEqual(supported("Do you offer pet insurance?", [discount]), []);
  assert.deepEqual(supported("auto insurence", [discount]), [discount]);
  assert.deepEqual(supported("cyberextortion insurence", [discount]), []);
  assert.deepEqual(
    supported("multi-policy", ["A policyholder should compare the options."]),
    [],
  );
});

test("a support check filters candidates without changing their native relative order", () => {
  const another = "A bundle can offer savings on home and auto insurance.";
  assert.deepEqual(
    supported("cheaper home car", [texas, another, policy, bundle]),
    [another, bundle],
  );
});

test("negation, exceptions, and unknown subjects cannot be erased by synonym support", () => {
  const excluded =
    "Home insurance does not cover flooding without an endorsement.";
  const covered =
    "Home insurance covers flooding under a selected endorsement.";
  assert.deepEqual(
    supported(
      "Does home insurance not cover flooding without an endorsement?",
      [covered, excluded],
    ),
    [excluded],
  );
  assert.deepEqual(
    supported("pet insurance", ["Petroleum insurance information"]),
    [],
  );
  assert.deepEqual(
    supported("motorcycle insurance", ["Motor insurance information"]),
    [],
  );
});

test("explicit states use structured applicability, while relevant All-state content stays eligible", () => {
  const general = {
    id: "general",
    state: "All",
    text: "General auto insurance guidance; a Texas example illustrates a possible comparison.",
  };
  const florida = {
    id: "florida",
    state: "FL",
    text: "Florida auto insurance guidance compares requirements with Texas.",
  };
  const illinois = {
    id: "illinois",
    state: ["IL", "TX"],
    text: "Auto insurance guidance for Illinois and Texas.",
  };
  const home = { id: "home", state: "All", text: "Home insurance guidance." };
  const missing = {
    id: "missing",
    state: "",
    text: "Auto insurance guidance.",
  };
  const docs = [florida, general, illinois, home, missing];
  const check = (query: string) =>
    supportedQuestionResults(
      query,
      docs,
      (row) => row.text,
      (row) => row.state,
    );
  assert.deepEqual(check("Texas auto insurance"), [general, illinois]);
  assert.deepEqual(check("FL auto insurance"), [florida, general]);
  assert.deepEqual(check("auto insurance in Illinois"), [general, illinois]);
  assert.deepEqual(check("Oregon car insurance"), [general]);
  assert.deepEqual(check("OR auto insurance"), [general]);
  assert.deepEqual(check("Florida or Texas auto insurance"), [
    florida,
    general,
    illinois,
  ]);
  assert.deepEqual(check("Oregon motorcycle insurance"), []);
  assert.deepEqual(
    check("Does Oregon auto insurance cover cyberextortion?"),
    [],
  );
});

test("multi-word jurisdictions are recognized before shorter names and lowercase conjunctions are not state codes", () => {
  const general = {
    state: "All states",
    text: "Home and auto insurance guidance.",
  };
  const virginia = {
    state: "VA",
    text: "Virginia home and auto insurance guidance.",
  };
  const westVirginia = {
    state: "WV",
    text: "West Virginia home and auto insurance guidance.",
  };
  const docs = [virginia, general, westVirginia];
  const check = (query: string) =>
    supportedQuestionResults(
      query,
      docs,
      (row) => row.text,
      (row) => row.state,
    );
  assert.deepEqual(check("West Virginia auto insurance"), [
    general,
    westVirginia,
  ]);
  assert.deepEqual(check("home or auto insurance"), docs);
});
