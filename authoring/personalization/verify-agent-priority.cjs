#!/usr/bin/env node
"use strict";

// Execute saved native Custom Value source with synthetic profile data. No network,
// configuration writes, profile changes, or live targeting occurs in this check.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(__dirname, "custom-values/agent-priority.js"), "utf8");
const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, "custom-values/agent-priority.metadata.json"), "utf8"));
const rows = fs.readFileSync(path.join(root, "examples/liberty-mutual-agent-portal/fixtures/udl/liberty-mutual-profiles.jsonl"), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line));
const mapping = JSON.parse(fs.readFileSync(path.join(root, "examples/liberty-mutual-agent-portal/fixtures/udl/profile-identity-map.json"), "utf8")).mapping;

function archivedProfile(agent) {
  const entry = mapping.find((item) => item.username === `${agent}.01` && item.generation === 0);
  assert(entry, `Archived ${agent} identity is missing.`);
  const row = rows.find((item) => item.identifiers.some((identity) => identity.id === entry.identifier));
  assert(row, `Archived ${agent} profile is missing.`);
  return { type: "identified", identifiers: row.identifiers, extensions: row.extensions };
}

function evaluate(context, expression = source) {
  const before = structuredClone(context);
  const result = vm.runInNewContext(expression, context, { timeout: 1000 });
  assert.deepEqual(context, before, "The native Custom Value must not change profile data.");
  assert(Object.hasOwn(metadata.results, result), `Unexpected priority label: ${result}`);
  return result;
}

// The just-published Boolean conditions are the behavioral baseline. Substitute
// their documented defaults, then compare the new, readable String classification.
const conditionSources = Object.fromEntries(["agency-growth-opportunity", "producer-priorities"].map((name) => {
  const condition = fs.readFileSync(path.join(__dirname, `conditions/${name}.js`), "utf8");
  const defaults = JSON.parse(fs.readFileSync(path.join(__dirname, `conditions/${name}.metadata.json`), "utf8")).defaults;
  return [name, condition.replace(/\[\[([^\]]+)\]\]/g, (_marker, declaration) => {
    const key = declaration.split("|")[0].trim();
    assert(Object.hasOwn(defaults, key), `Missing baseline parameter: ${key}`);
    return String(defaults[key]).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  })];
}));

function baseline(context) {
  if (vm.runInNewContext(conditionSources["agency-growth-opportunity"], context, { timeout: 1000 })) return "Agency growth";
  if (vm.runInNewContext(conditionSources["producer-priorities"], context, { timeout: 1000 })) return "Producer priorities";
  return "Standard";
}

const avery = archivedProfile("avery");
const daniel = archivedProfile("daniel");
const withAttributes = (visitor, attributes) => ({
  profile: { ...structuredClone(visitor), extensions: { ...visitor.extensions, ...attributes } },
});
const cases = [
  ["Avery qualifies for agency growth", { profile: avery }, "Agency growth"],
  ["Daniel qualifies for producer priorities", { profile: daniel }, "Producer priorities"],
  ["Jordan also qualifies through the producer criteria", { profile: archivedProfile("jordan") }, "Producer priorities"],
  ...["maya", "priya", "marcus", "elena"].map((agent) => [`${agent} retains standard content`, { profile: archivedProfile(agent) }, "Standard"]),
  ["missing profile", {}, "Standard"],
  ["undefined profile", { profile: undefined }, "Standard"],
  ["null profile", { profile: null }, "Standard"],
  ["anonymous profile", { profile: { ...avery, type: "anonymous" } }, "Standard"],
  ["unrecognized profile type", { profile: { ...avery, type: "visitor" } }, "Standard"],
  ["unrelated provider", { profile: { ...avery, identifiers: [{ provider: "other" }] } }, "Standard"],
  ["null identifier entries", { profile: { ...avery, identifiers: [null, { provider: "liberty-mutual-agent" }] } }, "Agency growth"],
  ["missing identifiers", { profile: { type: "identified", extensions: avery.extensions } }, "Standard"],
  ["non-array identifiers", { profile: { ...avery, identifiers: {} } }, "Standard"],
  ["empty identifiers", { profile: { ...avery, identifiers: [] } }, "Standard"],
  ["missing extensions", { profile: { ...avery, extensions: undefined } }, "Standard"],
  ["null extensions", { profile: { ...avery, extensions: null } }, "Standard"],
  ["principal missing Texas license", withAttributes(avery, { licensedInTexas: false }), "Standard"],
  ["Texas license is strict Boolean", withAttributes(avery, { licensedInTexas: "true" }), "Standard"],
  ["Florida license does not replace Texas license", withAttributes(avery, { licensedInTexas: false, licensedInFlorida: true }), "Standard"],
  ["producer missing Illinois license", withAttributes(daniel, { licensedInIllinois: false }), "Standard"],
  ["Illinois license is strict Boolean", withAttributes(daniel, { licensedInIllinois: "true" }), "Standard"],
  ["Texas license does not replace Illinois license", withAttributes(daniel, { licensedInIllinois: false, licensedInTexas: true }), "Standard"],
  ["no small-business specialization", withAttributes(daniel, { specializesInSmallCommercial: false }), "Standard"],
  ["specialization is strict Boolean", withAttributes(daniel, { specializesInSmallCommercial: "true" }), "Standard"],
  ["individual production of one cent qualifies", withAttributes(daniel, { agentSmallCommercialWrittenPremiumCents: 1 }), "Producer priorities"],
  ["zero individual production does not qualify", withAttributes(daniel, { agentSmallCommercialWrittenPremiumCents: 0 }), "Standard"],
  ["agency production does not replace individual production", withAttributes(daniel, { agentSmallCommercialWrittenPremiumCents: 0, agencySmallCommercialWrittenPremiumCents: 500000 }), "Standard"],
  ["below twenty percent qualifies", withAttributes(avery, { agencyPersonalWrittenPremiumCents: 801, agencySmallCommercialWrittenPremiumCents: 199 }), "Agency growth"],
  ["exactly twenty percent does not qualify", withAttributes(avery, { agencyPersonalWrittenPremiumCents: 800, agencySmallCommercialWrittenPremiumCents: 200 }), "Standard"],
  ["above twenty percent does not qualify", withAttributes(avery, { agencyPersonalWrittenPremiumCents: 799, agencySmallCommercialWrittenPremiumCents: 201 }), "Standard"],
  ["zero small-business share qualifies if total is positive", withAttributes(avery, { agencyPersonalWrittenPremiumCents: 1000, agencySmallCommercialWrittenPremiumCents: 0 }), "Agency growth"],
  ["empty production does not qualify", withAttributes(avery, { agencyPersonalWrittenPremiumCents: 0, agencySmallCommercialWrittenPremiumCents: 0 }), "Standard"],
  ["individual metrics do not replace agency metrics", withAttributes(avery, { agencyPersonalWrittenPremiumCents: undefined, agencySmallCommercialWrittenPremiumCents: undefined, agentPersonalWrittenPremiumCents: 1000, agentSmallCommercialWrittenPremiumCents: 10 }), "Standard"],
  ["unknown principal role does not qualify", withAttributes(avery, { role: "admin" }), "Standard"],
  ["role is case-sensitive", withAttributes(avery, { role: "Principal" }), "Standard"],
  ["missing role does not qualify", withAttributes(avery, { role: undefined }), "Standard"],
  ["persona and agency identity do not choose the result", withAttributes(avery, { agentId: "other", agencyId: "other", agencyName: "Other" }), "Agency growth"],
];

for (const visitor of [avery, daniel]) {
  for (const [field, value] of [["productionCurrency", "CAD"], ["productionCurrency", undefined], ["productionMetricScope", "agent"], ["productionMetricScope", undefined]]) {
    cases.push([`${visitor.extensions.role} requires valid ${field}`, withAttributes(visitor, { [field]: value }), "Standard"]);
  }
}
for (const [visitor, field] of [[avery, "agencyPersonalWrittenPremiumCents"], [avery, "agencySmallCommercialWrittenPremiumCents"], [daniel, "agentSmallCommercialWrittenPremiumCents"]]) {
  for (const value of [undefined, null, "1000", -1, 1.5, NaN, Infinity, -Infinity, 9007199254740992]) {
    cases.push([`${field} rejects ${String(value)}`, withAttributes(visitor, { [field]: value }), "Standard"]);
  }
}
cases.push(["combined agency total must be safe", withAttributes(avery, { agencyPersonalWrittenPremiumCents: 9007199254740991, agencySmallCommercialWrittenPremiumCents: 1 }), "Standard"]);

for (const [name, context, expected] of cases) {
  assert.equal(evaluate(context), expected, name);
  assert.equal(evaluate(context), baseline(context), `${name}: the readable classification must preserve the published condition behavior`);
}

const tenPercentSource = source.replace("var growthShareLimitPercent = 20;", "var growthShareLimitPercent = 10;");
assert.notEqual(tenPercentSource, source, "The marketer's percentage must have one clear setting.");
assert.equal(evaluate({ profile: avery }, tenPercentSource), "Standard", "Avery's 14.46% share is excluded at ten percent.");
assert.equal(evaluate({ profile: daniel }, tenPercentSource), "Producer priorities", "Changing the agency share setting does not alter producer eligibility.");
assert.equal(evaluate({ profile: avery }), "Agency growth", "The saved source must retain the twenty-percent baseline.");

for (const row of rows) {
  const context = { profile: { type: "identified", identifiers: row.identifiers, extensions: row.extensions } };
  assert.equal(evaluate(context), baseline(context), "Every archived profile must retain its published targeting.");
}
assert.equal(metadata.name, "Agent priority");
assert.equal(metadata.returnType, "String");
assert.deepEqual(Object.keys(metadata.results), ["Agency growth", "Producer priorities", "Standard"]);
assert.doesNotMatch(source, /agentId|agencyId|Cedar Ridge|Prairie Oak|\bavery\b|\bdaniel\b/);
assert.doesNotMatch(source, /\[\[/, "A custom value must not depend on Boolean-condition input substitution.");
console.log(`Passed ${cases.length + 3} local Agent priority checks and targeting parity for ${rows.length} archived profiles. Native tests, previews, publication, and live results are separate acceptance steps.`);
module.exports = { archivedProfile, evaluate };
