import assert from "node:assert/strict";
import test from "node:test";
import {
  initialRiskState,
  readRiskState,
  riskStateOptions,
  withRiskState,
} from "./risk-state-navigation";

test("risk-state hints reject unsupported and unlicensed states", () => {
  for (const value of [null, "", "FL", "CA", "tx", "TX,IL"])
    assert.equal(readRiskState(value, ["TX", "IL"]), undefined);
  assert.equal(readRiskState("IL", ["TX", "IL"]), "IL");
});

test("product detail, back link and intake preserve the chosen state and existing URL data", () => {
  assert.equal(
    withRiskState("/products/small-commercial", "IL"),
    "/products/small-commercial?state=IL",
  );
  assert.equal(withRiskState("/products?state=TX", "IL"), "/products?state=IL");
  assert.equal(
    withRiskState("/quote?new=1#intake", "IL"),
    "/quote?new=1&state=IL#intake",
  );
  assert.equal(
    withRiskState("/resources?q=bond&stateScope=all", "IL"),
    "/resources?q=bond&stateScope=all&state=IL",
  );
});

test("context is never appended to external, authentication, API or unsafe links", () => {
  for (const href of [
    "https://example.com/products",
    "//example.com/products",
    "/api/portal/actions",
    "/login",
    "/auth/callback",
    "#requirements",
    "mailto:team@example.com",
    "/\\example.com/products",
    "/products\n",
  ])
    assert.equal(withRiskState(href, "TX"), href);
});

test("a saved Florida draft stays Florida for a Texas/Illinois actor; invalid hints require explicit choice", () => {
  const context = {
    homeState: "TX" as const,
    licensedStates: ["TX", "IL"] as const,
  };
  assert.equal(
    initialRiskState({ ...context, savedState: "FL", queryState: "TX" }),
    "FL",
  );
  assert.equal(initialRiskState({ ...context, queryState: "FL" }), "");
  assert.equal(initialRiskState({ ...context, queryState: "CA" }), "");
  assert.equal(initialRiskState({ ...context, queryState: "IL" }), "IL");
  assert.equal(initialRiskState(context), "TX");
  assert.equal(initialRiskState({ homeState: "TX", licensedStates: [] }), "");
  assert.deepEqual(riskStateOptions(["TX", "IL"], "FL"), [
    { state: "FL", available: false },
    { state: "TX", available: true },
    { state: "IL", available: true },
  ]);
  assert.deepEqual(riskStateOptions([], "FL"), [
    { state: "FL", available: false },
  ]);
  assert.deepEqual(riskStateOptions([], ""), []);
});
