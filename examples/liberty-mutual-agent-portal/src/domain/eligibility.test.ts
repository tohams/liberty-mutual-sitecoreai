import assert from "node:assert/strict";
import test from "node:test";
import agentsJson from "../../fixtures/agents.json";
import agenciesJson from "../../fixtures/agencies.json";
import productsJson from "../../fixtures/products.json";
import eligibilityJson from "../../fixtures/eligibility.json";
import type {
  Agent,
  Agency,
  Product,
  EligibilitySnapshot,
} from "../contracts/portal";
import {
  activeLicensedStates,
  eligibleProductStates,
  evaluateProductAvailability,
  evaluateProductEligibility,
  resolveBondProductId,
  type ProductEligibilityInput,
} from "./eligibility";

const agents = agentsJson as Agent[];
const agencies = agenciesJson as Agency[];
const products = productsJson as Product[];
const fixture = eligibilityJson as EligibilitySnapshot;
const at = "2026-09-10T12:00:00Z";
function input(
  agentId = "daniel",
  productId = "bop",
  state: ProductEligibilityInput["state"] = "IL",
): ProductEligibilityInput {
  const agent = agents.find((entry) => entry.id === agentId)!;
  return {
    agent,
    agency: agencies.find((entry) => entry.id === agent.agencyId)!,
    product: products.find((entry) => entry.id === productId)!,
    state,
    eligibility: structuredClone(fixture),
    at,
    effectiveDate: "2026-10-01",
  };
}

test("current state licenses, legal authority, product and both appointments determine transaction states", () => {
  const data = input();
  assert.deepEqual(eligibleProductStates(data), ["IL", "TX"]);
  assert.equal(
    evaluateProductEligibility({ ...data, state: "FL" }).allowed,
    false,
  );
  assert.deepEqual(activeLicensedStates(data.agent, data.eligibility, at), [
    "IL",
    "TX",
  ]);
  assert.equal(
    evaluateProductEligibility(input("maya", "bop", "TX")).allowed,
    false,
  );
  assert.equal(
    evaluateProductEligibility(input("avery", "bop", "FL")).allowed,
    true,
  );
});

test("educational product availability does not grant transaction rights to another specialty", () => {
  const data = input("maya", "bop", "TX");
  assert.equal(evaluateProductAvailability(data).allowed, true);
  assert.equal(evaluateProductEligibility(data).allowed, false);
  assert.equal(
    evaluateProductAvailability(input("daniel", "recreation", "IL")).allowed,
    false,
  );
});

test("revoked, suspended, expired, future, missing and wrong legal authority fail closed", () => {
  for (const change of [
    { status: "revoked" as const },
    { status: "suspended" as const },
    { validThrough: "2026-09-09" },
    { validFrom: "2026-09-11" },
    { linesOfAuthority: ["property"] as const },
  ]) {
    const data = input();
    Object.assign(
      data.eligibility.agentAuthorities.find(
        (entry) => entry.agentId === "daniel" && entry.state === "IL",
      )!,
      change,
    );
    assert.equal(
      evaluateProductEligibility(data).allowed,
      false,
      JSON.stringify(change),
    );
  }
  const missing = input();
  missing.eligibility.agentAuthorities = [];
  assert.deepEqual(
    activeLicensedStates(missing.agent, missing.eligibility, at),
    [],
  );
  assert.equal(evaluateProductEligibility(missing).allowed, false);
});

test("agency and individual producer appointments are independently required and carrier/state specific", () => {
  for (const subject of [undefined, "daniel"]) {
    for (const change of [
      { status: "revoked" as const },
      { validThrough: "2026-09-09" },
      { validFrom: "2026-09-11" },
      { carrierId: "another-carrier" },
      { state: "FL" as const },
      { linesOfAuthority: ["property"] as const },
    ]) {
      const data = input();
      const appointment = data.eligibility.carrierAppointments.find(
        (entry) =>
          entry.agencyId === "prairie-oak" &&
          entry.agentId === subject &&
          entry.state === "IL",
      )!;
      Object.assign(appointment, change);
      assert.equal(
        evaluateProductEligibility(data).allowed,
        false,
        `${subject ?? "agency"}: ${JSON.stringify(change)}`,
      );
      assert.deepEqual(
        activeLicensedStates(data.agent, data.eligibility, at),
        ["IL", "TX"],
        "An appointment does not change a state license",
      );
    }
  }
  const otherProducer = input();
  otherProducer.eligibility.carrierAppointments.find(
    (entry) => entry.agentId === "daniel" && entry.state === "IL",
  )!.agentId = "avery";
  assert.equal(evaluateProductEligibility(otherProducer).allowed, false);
});

test("authority uses current UTC date; product rules also cover the proposed policy effective date", () => {
  const data = input();
  assert.equal(
    evaluateProductEligibility({
      ...data,
      at: "2029-01-01",
      effectiveDate: "2026-10-01",
    }).allowed,
    false,
  );
  assert.equal(
    evaluateProductEligibility({ ...data, effectiveDate: "2029-01-01" })
      .allowed,
    false,
  );
  assert.equal(
    evaluateProductEligibility({ ...data, effectiveDate: "2026-02-30" })
      .allowed,
    false,
  );
  assert.equal(
    evaluateProductEligibility({ ...data, at: "not-a-date" }).allowed,
    false,
  );
  assert.equal(
    evaluateProductEligibility({
      ...data,
      at: "2028-12-31T23:59:59Z",
      effectiveDate: "2028-12-31",
    }).allowed,
    true,
  );
});

test("missing, duplicate, malformed and withdrawn product-state rules fail closed", () => {
  const missing = input();
  missing.eligibility.productRules = [];
  assert.equal(evaluateProductEligibility(missing).allowed, false);
  const duplicated = input();
  duplicated.eligibility.productRules.push(
    structuredClone(
      duplicated.eligibility.productRules.find(
        (entry) => entry.productId === "bop" && entry.state === "IL",
      )!,
    ),
  );
  assert.equal(evaluateProductEligibility(duplicated).allowed, false);
  for (const change of [
    { status: "suspended" as const },
    { requirements: [] },
    { industries: [] },
    { validFrom: "2026-02-30" },
    { requiredLinesOfAuthority: [] },
  ]) {
    const data = input();
    Object.assign(
      data.eligibility.productRules.find(
        (entry) => entry.productId === "bop" && entry.state === "IL",
      )!,
      change,
    );
    assert.equal(evaluateProductEligibility(data).allowed, false);
  }
});

test("synthetic state appetite and checklist variations are explicit and leave source product lists intact", () => {
  assert.equal(
    evaluateProductEligibility(input("daniel", "recreation", "IL")).allowed,
    false,
  );
  assert.equal(
    evaluateProductEligibility(input("daniel", "recreation", "TX")).allowed,
    true,
  );
  const florida = evaluateProductEligibility(
    input("avery", "recreation", "FL"),
  );
  assert.ok(
    florida.requirements.includes(
      "Seasonal storage and storm preparation details",
    ),
  );
  const texas = evaluateProductEligibility(input("daniel", "farm-ranch", "TX"));
  assert.ok(texas.industries.includes("Ranching"));
  assert.ok(
    texas.requirements.includes("Livestock and grazing operations summary"),
  );
  assert.ok(
    !evaluateProductEligibility(
      input("daniel", "farm-ranch", "IL"),
    ).industries.includes("Ranching"),
  );
  assert.ok(
    !products
      .find((entry) => entry.id === "farm-ranch")!
      .industries.includes("Ranching"),
  );
});

test("explicit bond mapping recognizes current and legacy types while rejecting unknown input", () => {
  assert.equal(
    resolveBondProductId("Performance and payment", fixture),
    "contract-surety",
  );
  assert.equal(
    resolveBondProductId("Contract performance", fixture),
    "contract-surety",
  );
  assert.equal(
    resolveBondProductId("License and permit", fixture),
    "commercial-surety",
  );
  assert.equal(resolveBondProductId("Unconfigured bond", fixture), undefined);
  assert.equal(resolveBondProductId("__proto__", fixture), undefined);
});
