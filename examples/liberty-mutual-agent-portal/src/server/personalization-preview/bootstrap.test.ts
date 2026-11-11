import assert from "node:assert/strict";
import test from "node:test";
import { getPersonalizationPreviewBootstrap } from "./bootstrap";

test("the native content preview shell has no visitor identity, saved work, or actionable business data", () => {
  const data = getPersonalizationPreviewBootstrap();
  assert.equal(data.agent.id, "personalization-preview");
  assert.equal(data.agent.name, "Content Preview");
  assert.deepEqual(data.agent.licensedStates, ["TX", "FL", "IL"]);
  assert.equal(data.udlIdentity, null);
  assert.equal(data.session.profileId, "");
  assert.equal(data.session.runId, "editor");
  assert.deepEqual(data.actionEligibility, {
    submissions: {},
    bondRequests: {},
  });
  for (const key of [
    "products",
    "policies",
    "submissions",
    "bondRequests",
    "tasks",
    "resources",
    "learning",
    "contacts",
    "activity",
    "favorites",
    "registrations",
  ] as const)
    assert.deepEqual(data[key], []);
  assert.deepEqual(
    data.agency.production.map((line) => line.writtenPremiumCents),
    [85_000_000, 15_000_000],
  );
  data.agent.licensedStates.pop();
  assert.deepEqual(getPersonalizationPreviewBootstrap().agent.licensedStates, [
    "TX",
    "FL",
    "IL",
  ]);
});
