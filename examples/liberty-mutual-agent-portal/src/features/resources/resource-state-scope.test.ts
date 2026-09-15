import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Agent, Resource } from "@/contracts/portal";
import {
  DEFAULT_RESOURCE_STATE_SCOPE,
  matchesResourceStateScope,
  selectRecommendedResources,
} from "./resource-state-scope";

const agents = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/agents.json", import.meta.url),
    "utf8",
  ),
) as Agent[];
const resources = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/resources.json", import.meta.url),
    "utf8",
  ),
) as Resource[];
const daniel = agents.find((agent) => agent.id === "daniel")!;
const resourceIdsFor = (agent: Agent) =>
  resources
    .filter((resource) =>
      matchesResourceStateScope(
        resource.states,
        agent.licensedStates,
        DEFAULT_RESOURCE_STATE_SCOPE,
      ),
    )
    .map((resource) => resource.id);

test("Daniel's default library includes both licenses and nationwide guidance, excluding Florida-only guidance", () => {
  assert.deepEqual(daniel.licensedStates, ["IL", "TX"]);
  const ids = resourceIdsFor(daniel);
  assert.ok(ids.includes("state-wc-il"));
  assert.ok(ids.includes("state-wc-tx"));
  assert.ok(!ids.includes("state-wc-fl"));
  assert.ok(ids.includes("small-business-checklist"));
});

test("licensed-state defaults follow the current profile rather than Daniel's or the home state", () => {
  const maya = agents.find((agent) => agent.id === "maya")!;
  assert.deepEqual(maya.licensedStates, ["TX", "FL", "IL"]);
  for (const state of ["tx", "fl", "il"])
    assert.ok(resourceIdsFor(maya).includes(`state-wc-${state}`));

  // No live account is FL-only; narrow Priya only for this boundary test.
  const floridaOnly: Agent = {
    ...agents.find((agent) => agent.id === "priya")!,
    licensedStates: ["FL"],
  };
  const ids = resourceIdsFor(floridaOnly);
  assert.ok(ids.includes("state-wc-fl"));
  assert.ok(!ids.includes("state-wc-il"));
  assert.ok(!ids.includes("state-wc-tx"));
  assert.ok(ids.includes("small-business-checklist"));
});

test("old All states and forged selections cannot expose out-of-license guidance", () => {
  const before = [...daniel.licensedStates];
  assert.ok(!matchesResourceStateScope(["FL"], daniel.licensedStates, "all"));
  assert.ok(!matchesResourceStateScope(["FL"], daniel.licensedStates, "FL"));
  assert.ok(matchesResourceStateScope(["TX"], daniel.licensedStates, "FL"));
  assert.ok(
    matchesResourceStateScope(["TX", "FL", "IL"], daniel.licensedStates, "FL"),
  );
  assert.deepEqual(daniel.licensedStates, before);
});

test("native All means nationwide-only, and absent licenses never broaden the default to state-specific content", () => {
  assert.ok(matchesResourceStateScope(["IL", "FL", "TX"], [], "All"));
  assert.ok(!matchesResourceStateScope(["FL"], ["FL"], "All"));
  assert.ok(matchesResourceStateScope(["IL", "FL", "TX"], [], "licensed"));
  assert.ok(!matchesResourceStateScope(["IL"], [], "licensed"));
  assert.ok(!matchesResourceStateScope([], [], "licensed"));
  assert.ok(!matchesResourceStateScope(["TX", "TX", "TX"], [], "licensed"));
});

test("Daniel's workspace represents both Illinois and Texas, preserving specialization eligibility", () => {
  const selected = selectRecommendedResources(resources, daniel);
  assert.equal(selected.length, 2);
  assert.deepEqual(
    new Set(selected.map((resource) => resource.id)),
    new Set(["state-wc-il", "state-wc-tx"]),
  );
  const maya = agents.find((agent) => agent.id === "maya")!;
  assert.deepEqual(
    selectRecommendedResources(resources, maya).map((resource) => resource.id),
    ["home-renewal", "auto-review"],
  );
});

test("equally relevant state-specific recommendations spread across licenses without mutating the library", () => {
  const texas = resources.find((resource) => resource.id === "state-wc-tx")!;
  const illinois = resources.find((resource) => resource.id === "state-wc-il")!;
  const duplicateTexas = { ...texas, id: "second-texas-guide" };
  const library = [texas, duplicateTexas, illinois];
  assert.deepEqual(
    selectRecommendedResources(library, daniel).map((resource) => resource.id),
    [texas.id, illinois.id],
  );
  assert.deepEqual(library, [texas, duplicateTexas, illinois]);
});
