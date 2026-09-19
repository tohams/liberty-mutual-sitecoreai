"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const B = require("./content-baseline.cjs");
const item = (overrides = {}) => ({
  ID: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  Template: "ae9e45ca-f127-4abe-9ca7-2ff109981999",
  Path: B.SITE + "/Home",
  Languages: [
    {
      Language: "en",
      Versions: [
        { Version: 1, Fields: [] },
        { Version: 3, Fields: [] },
      ],
    },
    { Language: "fr-CA", Versions: [{ Version: 2, Fields: [] }] },
  ],
  ...overrides,
});
test("default restore module creates and updates only exact owned scopes", () => {
  const module = B.moduleConfig();
  assert.equal(module.items.includes.length, 9);
  assert.deepEqual(
    module.items.includes.map((include) => [include.name, include.path]),
    B.SCOPES,
  );
  assert(
    module.items.includes.every(
      (include) =>
        include.allowedPushOperations === "CreateAndUpdate" && !include.rules,
    ),
  );
  assert(!module.users && !module.roles);
});
test("deliberate remove-added flag permits deletion only inside the exact site", () => {
  const module = B.moduleConfig(true);
  const rules = module.items.includes.filter((include) => include.rules);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].path, "/sitecore/content/LibertyMutual");
  assert.deepEqual(rules[0].rules, [
    {
      path: "/liberty-mutual-agent-portal",
      scope: "ItemAndDescendants",
      allowedPushOperations: "CreateUpdateAndDelete",
    },
  ]);
  assert(
    module.items.includes.every(
      (include) => include.allowedPushOperations === "CreateAndUpdate",
    ),
  );
});
test("capture config does not include normal deployment modules, users, or roles", () => {
  const config = B.rootConfig();
  assert.deepEqual(config.modules, ["Baseline.module.json"]);
  assert.equal(config.serialization.removeOrphansForUsers, false);
  assert.equal(config.serialization.removeOrphansForRoles, false);
  assert.equal(config.serialization.excludedFields.length, 4);
});
test("inventory preserves the observed language and version numbers", () => {
  const result = B.inspectItem(item(), "home.yml");
  assert.deepEqual(result.languages, [
    { language: "en", versions: [1, 3] },
    { language: "fr-CA", versions: [2] },
  ]);
});
test("inventory rejects outside roots and look-alike customer prefixes", () => {
  for (const Path of [
    "/sitecore/content/Other/Home",
    "/sitecore/content/LibertyMutualOther/Home",
  ])
    assert.throws(
      () => B.inspectItem(item({ Path }), "bad.yml"),
      /Out-of-scope/,
    );
});
test("inventory rejects personal metadata, email values, and credentials without echoing them", () => {
  const cases = [
    { ID: B.EXCLUDED_FIELDS[0][0], Hint: "__Owner", Value: "private" },
    { ID: "other", Hint: "Body", Value: "person@example.test" },
    { ID: "other", Hint: "Editing secret", Value: "fixture-secret" },
    { ID: "other", Hint: "Body", Value: "Bearer fixtureabcdefghijklmnopqr" },
  ];
  for (const field of cases)
    assert.throws(
      () => B.inspectItem(item({ SharedFields: [field] }), "fixture.yml"),
      (error) => !error.message.includes(field.Value),
    );
});
test("capture cannot accept mutation flags, ambiguous flags, or duplicates", () => {
  for (const args of [
    ["capture", "--apply"],
    ["verify", "--remove-added-site-content"],
    ["restore", "--force"],
    ["restore", "--environment", "demo", "--environment", "other"],
  ])
    assert.throws(() => B.argumentsFor(args));
  assert.deepEqual(
    B.argumentsFor([
      "restore",
      "--environment",
      "demo",
      "--baseline",
      "/private/baseline",
    ]).options,
    { "--environment": "demo", "--baseline": "/private/baseline" },
  );
});
test("capture refuses overwriting a durable baseline", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const destination = path.join(parent, "snapshot");
  assert.equal(
    B.externalDestination(destination),
    path.join(fs.realpathSync(parent), "snapshot"),
  );
  fs.mkdirSync(destination);
  assert.throws(() => B.externalDestination(destination), /overwrite/);
});
test("inventory rejects a symlink at the items root as well as within the tree", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-links-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "actual"));
  fs.symlinkSync(path.join(directory, "actual"), path.join(directory, "items"));
  assert.throws(
    () => B.filesBelow(path.join(directory, "items")),
    /symbolic links/,
  );
  assert.throws(() => B.filesBelow(directory), /symbolic links/);
});
test("a partially failed CLI session installation removes the temporary authentication link", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-session-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const original = fs.symlinkSync;
  fs.symlinkSync = (...args) => {
    original(...args);
    throw new Error("fixture failure after creating authentication symlink");
  };
  try {
    assert.throws(() => B.installSession(directory), /fixture failure/);
    assert.equal(fs.existsSync(path.join(directory, ".sitecore")), false);
  } finally {
    fs.symlinkSync = original;
  }
});
