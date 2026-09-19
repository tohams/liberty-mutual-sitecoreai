#!/usr/bin/env node
"use strict";
/** One-time replacement of the untouched, unpublished ResourcePage practice seed.
 * Capture: ENV --content-manifest /absolute/old-content.json --template-manifest /absolute/new-template.json --snapshot /absolute/before.json
 * Review:  ENV --baseline /absolute/before.json
 * Apply:   ENV --baseline /absolute/before.json --apply --receipt /absolute/recycled.json
 *
 * Recycles only the original 28-item owned subtree, never permanently deletes.
 * Preserve the old manifest and baseline; re-provision with a NEW manifest.
 * This tool is not a participant-content reset mechanism.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { connection, read, value, writePrivate, ROOT } = require("./campaign-native-client.cjs");
const R = require("./resource-page-authoring-model.cjs");
const W = require("./workshop-editorial-workflow-model.cjs");
const M = require("./workshop-practice-content-model.cjs");
const T = require("./configure-workshop-practice-template.cjs");
const { identity, assertFields, emptyLock, validateManifest } = require("./provision-workshop-practice-content.cjs");
const digest = data => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

function validateOriginal(items, manifest, origin) {
  validateManifest(manifest, origin);
  assert(!manifest.template && manifest.items.length === 28 && manifest.items.every(item => item.complete === true), "Only the completed original ResourcePage seed can be recycled by this tool.");
  const specs = M.targets(manifest.workflow, R.IDS.pageTemplate);
  assert(items.length === specs.length, "The original practice inventory must contain exactly 28 items.");
  const records = new Map(manifest.items.map(item => [item.path, item]));
  for (const spec of specs) {
    const item = items.find(item => item?.path === spec.path);
    identity(item, spec, records.get(spec.path)); emptyLock(item);
    assert(item.version === 1 && item.language.name === "en" && item.versions.length === 1 && item.versions[0].version === 1 && item.versions[0].language.name === "en", "Only untouched one-version English practice content may be recycled.");
    const fields = { ...spec.fields };
    if (["root", "page"].includes(spec.kind)) {
      const image = spec.kind === "page" ? records.get(spec.path + "/Data/Resource image") : undefined;
      fields.__Renderings = M.pageLayout(spec.path, item.itemId, image?.itemId);
    }
    assertFields(item, fields);
    const expectedChildren = specs.filter(child => child.parentPath === spec.path).map(child => child.path).sort();
    assert.deepEqual(item.children.map(child => child.path).sort(), expectedChildren, "Practice content has additional or missing descendants.");
    assert(item.children.every(child => R.norm(child.itemId) === R.norm(records.get(child.path)?.itemId)), "A practice descendant identity changed.");
  }
}
async function capture(query, origin, manifest, templateManifest) {
  T.validateManifest(templateManifest, origin);
  assert(templateManifest.complete === true, "Provision the replacement template before preparing a recycle.");
  const replacement = await T.verifyTemplate(query, templateManifest.template, await T.sourceDefinition(query));
  const items = [];
  for (const spec of M.targets(manifest.workflow, R.IDS.pageTemplate)) items.push(await read(query, { path: spec.path }));
  validateOriginal(items, manifest, origin);
  const snapshot = { schemaVersion: 1, origin, originalManifest: manifest, replacement, items };
  return { ...snapshot, sha256: digest(snapshot) };
}
function validateSnapshot(before, origin) {
  assert(before?.schemaVersion === 1 && before.origin === origin && before.replacement?.path === M.TEMPLATE_PATH, "Recycle baseline has an unexpected origin or scope.");
  const { sha256, ...snapshot } = before;
  assert(sha256 === digest(snapshot), "Recycle baseline checksum differs.");
  validateOriginal(before.items, before.originalManifest, origin);
}
async function run({ query, origin, before, apply = false, record = () => {} }) {
  validateSnapshot(before, origin);
  assert.deepEqual(await T.verifyTemplate(query, before.replacement, await T.sourceDefinition(query)), before.replacement, "Replacement template changed after capture.");
  for (const item of before.items) assert.deepEqual(await read(query, { itemId: item.itemId }), item, "Practice content changed after capture; do not recycle author work.");
  const root = before.items.find(item => item.path === W.CONTENT_ROOT);
  const plan = { root: { path: root.path, itemId: root.itemId }, itemCount: before.items.length, replacementTemplate: before.replacement, permanently: false, publishes: false };
  if (!apply) return { mode: "read-only", ...plan };
  record({ phase: "recycle-intent", ...plan });
  const result = await query("mutation($input:DeleteItemInput!){deleteItem(input:$input){successful}}", { input: { database: "master", itemId: root.itemId, permanently: false } });
  assert(result.deleteItem?.successful === true, "Recycle operation was not confirmed. Inspect the native root and recycle bin before retrying.");
  assert(await read(query, { path: W.CONTENT_ROOT }) === null, "The original practice root still exists after recycle.");
  for (const item of before.items) assert(await read(query, { itemId: item.itemId }) === null, "A recorded practice item still exists after recycle.");
  record({ phase: "recycle-verified", ...plan });
  return { mode: "recycled", ...plan };
}
async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args, options = {};
  assert(environment && !environment.startsWith("--"), "Specify the Sitecore environment.");
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i]; assert(!Object.hasOwn(options, key), "Duplicate option.");
    if (key === "--apply") options[key] = true;
    else { assert(["--content-manifest", "--template-manifest", "--snapshot", "--baseline", "--receipt"].includes(key) && rest[i + 1], "Unknown or incomplete option."); const file = rest[++i]; assert(path.isAbsolute(file) && !path.resolve(file).startsWith(ROOT + path.sep), "Native records must stay outside the repository."); options[key] = file; }
  }
  const apply = options["--apply"] === true;
  const { query, origin } = connection(environment, apply);
  if (options["--snapshot"]) {
    assert(!apply && !options["--baseline"] && !options["--receipt"] && options["--content-manifest"] && options["--template-manifest"], "Capture requires only both manifests and a fresh snapshot path.");
    assert(!fs.existsSync(options["--snapshot"]), "Preserve the original snapshot.");
    const before = await capture(query, origin, JSON.parse(fs.readFileSync(options["--content-manifest"], "utf8")), JSON.parse(fs.readFileSync(options["--template-manifest"], "utf8")));
    writePrivate(options["--snapshot"], before);
    console.log(JSON.stringify({ mode: "captured", itemCount: before.items.length, snapshot: options["--snapshot"] })); return;
  }
  assert(options["--baseline"] && !options["--content-manifest"] && !options["--template-manifest"], "Review or apply requires a captured baseline.");
  const before = JSON.parse(fs.readFileSync(options["--baseline"], "utf8"));
  if (apply) assert(options["--receipt"] && !fs.existsSync(options["--receipt"]), "Apply requires a fresh receipt file; never blindly retry a recycle.");
  const receipt = { schemaVersion: 1, origin, baselineSha256: before.sha256, events: [] };
  const record = event => { receipt.events.push({ at: new Date().toISOString(), ...event }); writePrivate(options["--receipt"], receipt); };
  console.log(JSON.stringify(await run({ query, origin, before, apply, record }), null, 2));
}
module.exports = { digest, validateOriginal, capture, validateSnapshot, run, main };
if (require.main === module) main().catch(error => { console.error("Original workshop practice recycle: " + (error?.message || "Operation failed.")); process.exitCode = 1; });
