#!/usr/bin/env node
"use strict";

// These checks execute saved native-condition source with synthetic profile data.
// Native rule tests, publication, and browser previews are separate acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const directory = path.join(__dirname, "conditions");
const sources = Object.fromEntries(["agency-growth-opportunity", "producer-priorities"].map((name) => [
  name,
  fs.readFileSync(path.join(directory, `${name}.js`), "utf8"),
]));
const metadata = Object.fromEntries(Object.keys(sources).map((name) => [
  name,
  JSON.parse(fs.readFileSync(path.join(directory, `${name}.metadata.json`), "utf8")),
]));
const rows = fs.readFileSync(path.join(root, "examples/liberty-mutual-agent-portal/fixtures/udl/liberty-mutual-profiles.jsonl"), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line));
const mapping = JSON.parse(fs.readFileSync(path.join(root, "examples/liberty-mutual-agent-portal/fixtures/udl/profile-identity-map.json"), "utf8")).mapping;

function profile(agent) {
  const entry = mapping.find((row) => row.username === `${agent}.01` && row.generation === 0);
  assert(entry, `Archived ${agent} profile identity is missing.`);
  const row = rows.find((item) => item.identifiers.some((identity) => identity.id === entry.identifier));
  assert(row, `Archived ${agent} accepted-schema profile is missing.`);
  return { type: "identified", identifiers: row.identifiers, extensions: row.extensions };
}

// The native condition editor substitutes its declared, typed parameters before
// execution. This local helper supplies the same values in the saved expression.
function evaluate(condition, context, parameters = {}) {
  const defaults = metadata[condition].defaults;
  const expression = sources[condition].replace(/\[\[([^\]]+)\]\]/g, (_marker, declaration) => {
    const name = declaration.split("|")[0].trim();
    assert(Object.hasOwn(defaults, name), `Undocumented condition parameter: ${name}`);
    const value = Object.hasOwn(parameters, name) ? parameters[name] : defaults[name];
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  });
  const before = structuredClone(context);
  const result = vm.runInNewContext(expression, context, { timeout: 1000 });
  assert.deepEqual(context, before, "Native conditions must not modify profile data.");
  assert.equal(typeof result, "boolean", "Condition output must remain Boolean.");
  return result;
}

const avery = profile("avery");
const daniel = profile("daniel");
const changed = (original, attributes) => ({
  profile: { ...structuredClone(original), extensions: { ...original.extensions, ...attributes } },
});
const growth = "agency-growth-opportunity";
const producer = "producer-priorities";
const cases = [];
const add = (name, condition, context, expected, parameters = {}) => cases.push({ name, condition, context, expected, parameters });

for (const agent of ["avery", "daniel", "jordan", "maya", "priya", "marcus", "elena"]) {
  add(`${agent} default agency-growth qualification`, growth, { profile: profile(agent) }, agent === "avery");
  add(`${agent} default producer qualification`, producer, { profile: profile(agent) }, ["daniel", "jordan"].includes(agent));
}

for (const [label, storedRole] of Object.entries({
  "Agency principal": "principal",
  "Producer": "producer",
  "Account manager": "account-manager",
  "Account executive": "account-executive",
  "Surety specialist": "surety-specialist",
  "Wholesale broker": "wholesale-broker",
})) {
  add(`supported ${label} label matches stored role`, growth, changed(avery, { role: storedRole }), true, { "Agent role": label });
  add(`supported ${label} label matches stored role`, producer, changed(daniel, { role: storedRole }), true, { "Agent role": label });
}

for (const condition of [growth, producer]) {
  const valid = condition === growth ? avery : daniel;
  add("missing profile", condition, {}, false);
  add("null profile", condition, { profile: null }, false);
  add("anonymous profile", condition, { profile: { ...valid, type: "anonymous" } }, false);
  add("missing identifiers", condition, { profile: { type: "identified", extensions: valid.extensions } }, false);
  add("unrelated identity provider", condition, { profile: { ...valid, identifiers: [{ provider: "unrelated" }] } }, false);
  add("missing extensions", condition, { profile: { type: "identified", identifiers: valid.identifiers } }, false);
  add("wrong monetary currency", condition, changed(valid, { productionCurrency: "CAD" }), false);
  add("wrong production scope", condition, changed(valid, { productionMetricScope: "agent" }), false);
  add("unsupported role selection", condition, { profile: valid }, false, { "Agent role": "Administrator" });
  add("unsupported state selection", condition, { profile: valid }, false, { "Licensed state": "Oregon" });
  add("unknown profile role", condition, changed(valid, { role: "administrator" }), false);
  add("role selection is configurable", condition, { profile: valid }, false, { "Agent role": condition === growth ? "Producer" : "Agency principal" });
  add("profile names do not select the result", condition, changed(valid, { agentId: "different-agent", agencyId: "other-agency", agencyName: "Other agency" }), true);
}

add("principal needs selected Texas license", growth, changed(avery, { licensedInTexas: false }), false);
add("string Texas license does not qualify", growth, changed(avery, { licensedInTexas: "true" }), false);
add("Florida state selection uses licensed-state data", growth, { profile: avery }, true, { "Licensed state": "Florida" });
add("Florida selection requires a Florida license", growth, changed(avery, { licensedInFlorida: false }), false, { "Licensed state": "Florida" });
add("state location does not replace a license", growth, changed(avery, { state: "TX", licensedInTexas: false }), false);
add("Illinois selection uses the Illinois license", growth, { profile: avery }, true, { "Licensed state": "Illinois" });
add("ten-percent threshold excludes Avery", growth, { profile: avery }, false, { "Share threshold": 10 });
add("fifteen-percent threshold includes Avery", growth, { profile: avery }, true, { "Share threshold": 15 });
add("exactly twenty percent is excluded", growth, changed(avery, { agencyPersonalWrittenPremiumCents: 800, agencySmallCommercialWrittenPremiumCents: 200 }), false);
add("just below twenty percent qualifies", growth, changed(avery, { agencyPersonalWrittenPremiumCents: 801, agencySmallCommercialWrittenPremiumCents: 199 }), true);
add("small-business share is calculated from agency totals", growth, changed(avery, { agencyPersonalWrittenPremiumCents: 800, agencySmallCommercialWrittenPremiumCents: 200, agentSmallCommercialWrittenPremiumCents: 0 }), false);
add("empty agency production is excluded", growth, changed(avery, { agencyPersonalWrittenPremiumCents: 0, agencySmallCommercialWrittenPremiumCents: 0 }), false);
add("string personal premium is excluded", growth, changed(avery, { agencyPersonalWrittenPremiumCents: "287500000" }), false);
add("negative agency premium is excluded", growth, changed(avery, { agencySmallCommercialWrittenPremiumCents: -1 }), false);
add("fractional cents are excluded", growth, changed(avery, { agencySmallCommercialWrittenPremiumCents: 0.5 }), false);
add("non-finite agency premium is excluded", growth, changed(avery, { agencyPersonalWrittenPremiumCents: Infinity }), false);
add("unsafe integer sum is excluded", growth, changed(avery, { agencyPersonalWrittenPremiumCents: Number.MAX_SAFE_INTEGER, agencySmallCommercialWrittenPremiumCents: 1 }), false);
for (const threshold of [-1, 101, Infinity, "not a number"]) {
  add(`invalid share threshold ${String(threshold)}`, growth, { profile: avery }, false, { "Share threshold": threshold });
}

add("producer needs selected Illinois license", producer, changed(daniel, { licensedInIllinois: false }), false);
add("string Illinois license does not qualify", producer, changed(daniel, { licensedInIllinois: "true" }), false);
add("Florida selection excludes unlicensed Daniel", producer, { profile: daniel }, false, { "Licensed state": "Florida" });
add("Texas selection includes licensed Daniel", producer, { profile: daniel }, true, { "Licensed state": "Texas" });
add("small-business specialization is required", producer, changed(daniel, { specializesInSmallCommercial: false }), false);
add("specialization must be Boolean", producer, changed(daniel, { specializesInSmallCommercial: "true" }), false);
add("positive individual production is required", producer, changed(daniel, { agentSmallCommercialWrittenPremiumCents: 0 }), false);
add("agency premium does not replace individual premium", producer, changed(daniel, { agentSmallCommercialWrittenPremiumCents: 0, agencySmallCommercialWrittenPremiumCents: 100000000 }), false);
add("minimum is expressed in USD, not cents", producer, changed(daniel, { agentSmallCommercialWrittenPremiumCents: 10001 }), true, { "Minimum premium": 100 });
add("exact minimum is excluded", producer, changed(daniel, { agentSmallCommercialWrittenPremiumCents: 10000 }), false, { "Minimum premium": 100 });
add("minimum supports fractional dollars", producer, changed(daniel, { agentSmallCommercialWrittenPremiumCents: 30 }), true, { "Minimum premium": 0.29 });
add("minimum rejects fractional cents", producer, { profile: daniel }, false, { "Minimum premium": 0.001 });
for (const premium of [-1, Infinity, "39700000", 0.5]) {
  add(`invalid individual production ${String(premium)}`, producer, changed(daniel, { agentSmallCommercialWrittenPremiumCents: premium }), false);
}
for (const minimum of [-1, Infinity, "not a number"]) {
  add(`invalid minimum ${String(minimum)}`, producer, { profile: daniel }, false, { "Minimum premium": minimum });
}

for (const { name, condition, context, expected, parameters } of cases) {
  assert.equal(evaluate(condition, context, parameters), expected, `${condition}: ${name}`);
}

const legacy = fs.readFileSync(path.join(__dirname, "custom-values/agency-product-priorities.js"), "utf8");
for (const row of rows) {
  const context = { profile: { type: "identified", identifiers: row.identifiers, extensions: row.extensions } };
  const expected = vm.runInNewContext(legacy, context, { timeout: 1000 });
  const result = evaluate(growth, context)
    ? "agency-growth"
    : evaluate(producer, context) ? "producer-priorities" : "neutral";
  assert.equal(result, expected, "Default configurable conditions must preserve every archived profile's existing targeting.");
}

for (const [condition, source] of Object.entries(sources)) {
  const parameterNames = [...source.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].split("|")[0].trim());
  assert.deepEqual(parameterNames.sort(), Object.keys(metadata[condition].defaults).sort());
  for (const name of parameterNames) assert(metadata[condition].output.includes(`[[${name}]]`));
  assert.doesNotMatch(source, /agentId|agencyId|Cedar Ridge|Prairie Oak|\bavery\b|\bdaniel\b/);
}

console.log(`Passed ${cases.length} local marketer-configurable agency-priority checks and baseline-targeting parity for ${rows.length} archived profiles. Native rule execution and browser previews are separate acceptance steps.`);
module.exports = { evaluate, profile };
