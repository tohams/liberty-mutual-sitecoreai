import assert from "node:assert/strict";
import test from "node:test";
import { getAudiencePreviewBootstrap } from "./bootstrap";

test("the read-only rendering context contains only generic identities and selector-derived production", () => {
  const data = getAudiencePreviewBootstrap({
    role: "producer",
    licensedStates: ["IL"],
    specializesInSmallCommercial: true,
    agencySmallCommercialSharePercent: 25,
    agencyTotalWrittenPremiumUsd: 1_000_000,
    agentSmallCommercialWrittenPremiumUsd: 60_000,
  });
  assert.equal(data.agent.name, "Audience Preview");
  assert.equal(data.agent.role, "producer");
  assert.equal(data.agent.roleLabel, "Producer");
  assert.deepEqual(data.agent.licensedStates, ["IL"]);
  assert.equal(data.agency.name, "Independent agency");
  assert.equal(
    data.agency.production.find((line) => line.line === "small-commercial")
      ?.writtenPremiumCents,
    25_000_000,
  );
  assert.equal(data.agent.production[0].writtenPremiumCents, 6_000_000);
  assert.equal(data.session.runId, "editor");
  assert.equal(data.session.profileId, "");
  assert.equal(data.udlIdentity, null);
  for (const key of [
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
  assert.deepEqual(data.eligibility.agentAuthorities, []);
  assert.deepEqual(data.eligibility.carrierAppointments, []);
  assert.doesNotMatch(
    JSON.stringify(data),
    /Avery|Daniel|Cedar Ridge|Prairie Oak|avery|daniel/,
  );
});

test("a no-license preview preserves its empty licensed-state list and does not grant transactional authority", () => {
  const data = getAudiencePreviewBootstrap({
    role: "principal",
    licensedStates: [],
    specializesInSmallCommercial: false,
    agencySmallCommercialSharePercent: 0,
    agencyTotalWrittenPremiumUsd: 0,
    agentSmallCommercialWrittenPremiumUsd: 0,
  });
  assert.deepEqual(data.agent.licensedStates, []);
  assert.equal(data.agent.state, "TX");
  assert.deepEqual(data.agent.specializations, []);
  assert.deepEqual(data.agency.appointedLines, []);
  assert.deepEqual(data.actionEligibility, {
    submissions: {},
    bondRequests: {},
  });
});
