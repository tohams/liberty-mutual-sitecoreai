#!/usr/bin/env node
"use strict";
/** Configure only the existing Agency priorities rendering's dependency list.
 * Capture: ENV --snapshot /absolute/before.json
 * Review: ENV --baseline /absolute/before.json
 * Apply: ENV --baseline /absolute/before.json --apply --journal /absolute/after.json
 * This script never changes content, audiences, layouts, global settings, or publishing.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { connection, writePrivate } = require("./campaign-native-client.cjs");
const { readItem, semantic } = require("./configure-resource-page-authoring.cjs");
const ID = "a2e85f2d-7dbc-5640-8040-0b688d7912a6";
const ITEM_PATH = "/sitecore/layout/Renderings/Project/LibertyMutualPublic/AgencyPriorities";
const FIELD = "Content Dependencies";
const FIELD_ID = "b4bbc0be76194678b2f7947d84aa77a9";
const DEPENDENCIES = Object.freeze([
  "{07BB8ABE-7A1D-4AF2-B7D6-BF5140AAAF21}", // Related Items: selected recommendation cards.
  "{15F0229E-41E0-442B-94C5-243CBA793465}", // Siblings: the peer collections selected by personalization.
  "{5E13EE6F-522F-41CA-8929-AEE8EE103862}", // Recursive Related Items: links within those collections.
]);
const normalize = (value) => value.replace(/[{}-]/g, "").toLowerCase();
function businessState(item) {
  const result = semantic(item);
  // The first database override of a resource-backed definition receives its
  // own creation provenance. Preserve that native timestamp and actor; record
  // them in the journal instead of restoring the inherited resource metadata.
  for (const version of result.versions) version.fields = version.fields.filter(([, name]) => !["__Created", "__Created by"].includes(name));
  return result;
}

function planned(item) {
  assert.equal(normalize(item.itemId), normalize(ID));
  assert.equal(item.path, ITEM_PATH);
  const values = item.versions.map((version) => {
    const field = version.fields.find((entry) => normalize(entry.fieldId) === FIELD_ID);
    assert.equal(field?.name, FIELD);
    return field.value;
  });
  assert.equal(new Set(values).size, 1, "Shared dependency field differs across versions.");
  const existing = values[0].split(/[|\r\n]+/).filter(Boolean);
  assert(existing.every((id) => /^\{[a-f\d-]{36}\}$/i.test(id)), "Unexpected dependency selection; preserve and review.");
  const after = [...existing];
  for (const required of DEPENDENCIES) {
    if (!after.some((id) => normalize(id) === normalize(required))) after.push(required);
  }
  return { before: values[0], after: after.join("|") };
}

async function main() {
  const [environment, mode, file, ...args] = process.argv.slice(2);
  const apply = args.includes("--apply");
  const journal = args[2];
  assert(environment && ["--snapshot", "--baseline"].includes(mode) && path.isAbsolute(file || ""));
  assert(!args.length || (mode === "--baseline" && args.length === 3 && args[0] === "--apply" && args[1] === "--journal" && path.isAbsolute(journal || "")));
  if (apply) assert(!fs.existsSync(journal), "Preserve the existing journal and read native state before retrying.");
  const api = connection(environment, apply);
  const before = await readItem(api.query, ID);
  const change = planned(before);
  if (mode === "--snapshot") {
    assert(!fs.existsSync(file), "Preserve the existing before-image.");
    writePrivate(file, { capturedAt: new Date().toISOString(), origin: api.origin, item: before, change });
    console.log("Captured the single rendering and its proposed dependency selection. No writes.");
    return;
  }
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(snapshot.origin, api.origin);
  assert.deepEqual(semantic(before), semantic(snapshot.item), "Rendering changed after capture; preserve it and recapture.");
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", path: ITEM_PATH, field: FIELD, ...change }, null, 2));
  if (!apply) return;
  const current = await readItem(api.query, ID);
  assert.deepEqual(semantic(current), semantic(before), "Rendering changed before write.");
  if (change.before !== change.after) {
    await api.query("mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}", {
      input: { database: "master", language: "en", itemId: ID, fields: [{ name: FIELD, value: change.after }] },
    });
  }
  const after = await readItem(api.query, ID);
  const expected = structuredClone(before);
  for (const version of expected.versions) version.fields.find((entry) => entry.name === FIELD).value = change.after;
  assert.deepEqual(businessState(after), businessState(expected), "Readback detected an unrelated business field or version change.");
  writePrivate(journal, { completedAt: new Date().toISOString(), origin: api.origin, before, after, change });
  console.log("Verified the one-field update and all preserved rendering fields. No publication performed.");
}
module.exports = { businessState, planned, DEPENDENCIES };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
