#!/usr/bin/env node
"use strict";
// Local contract checks against the actual archived import schema. No network,
// native configuration, identity updates, or production targeting takes place.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(__dirname, "custom-values/agency-product-priorities.js"), "utf8");
const rows = fs.readFileSync(path.join(root, "examples/liberty-mutual-agent-portal/fixtures/udl/liberty-mutual-profiles.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
const mapping = JSON.parse(fs.readFileSync(path.join(root, "examples/liberty-mutual-agent-portal/fixtures/udl/profile-identity-map.json"), "utf8")).mapping;
function profile(agent) {
  const entry = mapping.find((row) => row.username === `${agent}.01` && row.generation === 0);
  assert(entry, "Archived profile identity is missing.");
  const row = rows.find((row) => row.identifiers.some((identity) => identity.id === entry.identifier));
  assert(row, "Archived accepted-schema profile is missing.");
  return { type: "identified", identifiers: row.identifiers, extensions: row.extensions };
}
function evaluate(input) { return vm.runInNewContext(source, input, { timeout: 1000 }); }
const avery = profile("avery"), daniel = profile("daniel");
const changed = (original, attributes) => ({ profile: { ...structuredClone(original), extensions: { ...original.extensions, ...attributes } } });
const cases = [
  ["Avery actual archived profile attributes", { profile: avery }, "agency-growth"],
  ["Daniel actual archived profile attributes", { profile: daniel }, "producer-priorities"],
  ["Jordan also meets the producer criteria", { profile: profile("jordan") }, "producer-priorities"],
  ...["maya", "priya", "marcus", "elena"].map((agent) => [`${agent} retains original collection`, { profile: profile(agent) }, "neutral"]),
  ["missing profile", {}, "neutral"],
  ["null profile", { profile: null }, "neutral"],
  ["anonymous profile", { profile: { ...avery, type: "anonymous" } }, "neutral"],
  ["wrong provider", { profile: { ...avery, identifiers: [{ provider: "unrelated" }] } }, "neutral"],
  ["missing identifiers", { profile: { type: "identified", extensions: avery.extensions } }, "neutral"],
  ["principal not licensed in Texas", changed(avery, { licensedInTexas: false }), "neutral"],
  ["producer not licensed in Illinois", changed(daniel, { licensedInIllinois: false }), "neutral"],
  ["string license is not boolean true", changed(daniel, { licensedInIllinois: "true" }), "neutral"],
  ["no individual production", changed(daniel, { agentSmallCommercialWrittenPremiumCents: 0 }), "neutral"],
  ["no small-commercial specialization", changed(daniel, { specializesInSmallCommercial: false }), "neutral"],
  ["wrong monetary currency", changed(avery, { productionCurrency: "CAD" }), "neutral"],
  ["wrong agency metric scope", changed(avery, { productionMetricScope: "agent" }), "neutral"],
  ["exactly twenty percent does not qualify", changed(avery, { agencyPersonalWrittenPremiumCents: 800, agencySmallCommercialWrittenPremiumCents: 200 }), "neutral"],
  ["below twenty percent qualifies", changed(avery, { agencyPersonalWrittenPremiumCents: 801, agencySmallCommercialWrittenPremiumCents: 199 }), "agency-growth"],
  ["empty agency production cannot qualify", changed(avery, { agencyPersonalWrittenPremiumCents: 0, agencySmallCommercialWrittenPremiumCents: 0 }), "neutral"],
  ["string monetary value cannot qualify", changed(avery, { agencyPersonalWrittenPremiumCents: "287500000" }), "neutral"],
  ["negative monetary value cannot qualify", changed(avery, { agencySmallCommercialWrittenPremiumCents: -1 }), "neutral"],
  ["invalid monetary value cannot qualify", changed(daniel, { agentSmallCommercialWrittenPremiumCents: Infinity }), "neutral"],
  ["fractional cents cannot qualify", changed(daniel, { agentSmallCommercialWrittenPremiumCents: 1.2 }), "neutral"],
  ["agency IDs and persona IDs do not choose the result", changed(avery, { agentId: "any-other-principal", agencyId: "different-agency", agencyName: "Different agency" }), "agency-growth"],
];
for (const [name, input, expected] of cases) {
  const before = structuredClone(input);
  assert.equal(evaluate(input), expected, name);
  assert.deepEqual(input, before, "Native expression must not modify profile context.");
}
assert.doesNotMatch(source, /agentId|agencyId|Cedar Ridge|Prairie Oak|\bavery\b|\bdaniel\b/);
console.log(`Passed ${cases.length} local agency-priority custom-value checks. Native tests and publication remain separate acceptance steps.`);
module.exports = { profile, evaluate };
