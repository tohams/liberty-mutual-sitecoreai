#!/usr/bin/env node
"use strict";
/** Public-only native editorial governance. Default actions are read-only.
 * --write-model generates only this workflow's serialization/module offline.
 * ENV --snapshot /abs/before.json
 * ENV --baseline /abs/before.json --report /abs/plan.json
 * ENV --baseline /abs/before.json --report /abs/result.json --apply --journal /abs/journal.json
 * Reuses installed Author/Approver roles. Never creates users, changes role
 * membership, publishes, or edits Basic/portal workflow definitions.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  ROOT,
  connection,
  read,
  value,
  writePrivate,
} = require("./campaign-native-client.cjs");
const { readRole } = require("./configure-workshop-editorial-workflow.cjs");
const {
  mergeAcl,
  ownedAcl,
  ROLES,
} = require("./workshop-editorial-workflow-model.cjs");
const { semantic, digest, norm, SITE } = require("./public-native-state.cjs");

const WF = "/sitecore/system/Workflows/Liberty Mutual Public Review";
const MODULE = "LibertyMutual.PublicWorkflow";
const MARKER = "Liberty Mutual public editorial review v1";
const IDS = Object.freeze({
  workflow: "1bb54766-6a38-5c47-b0ee-c57570679d14",
  draft: "ce5c0c95-af32-5457-849b-11e8efaf72d7",
  awaiting: "2598d5b1-953b-57ec-9086-14afb798ab06",
  approved: "44581197-9864-590b-92eb-6d620f36fbe1",
  submit: "189f8ec0-9217-5447-b2a9-f2ed7a4a70a2",
  approve: "54ff573a-a778-587b-823f-e7593fae4d38",
  reject: "7fc46cee-d4d5-5667-802a-7ccc71416009",
});
const BASIC = Object.freeze({
  workflow: "b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f",
  draft: "57cc7dce-e6b1-4564-9581-0e5850b8bdf2",
  approved: "f7fe5bdd-a991-4a58-9735-cd08f9b097ab",
});
const F = Object.freeze({
  security: "dec8d2d5-e3cf-48b6-a653-8e69e2716641",
  initial: "b5166b38-e4bf-4410-953c-2037f2bf6a56",
  final: "fb8abc73-7acf-45a0-898c-d3ccb889c3ee",
  next: "dcbebc58-6124-4100-a248-fc717d6c78d5",
  suppress: "82a7c02f-9a55-4bfe-b494-d1713d4be9ff",
  marker: "9541e67d-ce8c-4225-803d-33f7f29f09ef",
  sort: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e",
});
const T = Object.freeze({
  workflow: "1c0acc50-37be-4742-b43c-96a07a7410a5",
  state: "4b7e2da9-de43-4c83-88c3-02f042031d04",
  command: "cb01f9fc-c187-46b3-ab0b-97a8468d8303",
});
const READ = Object.freeze({
  "item:read": true,
  "item:write": false,
  "item:create": false,
  "item:delete": false,
  "item:rename": false,
  "item:admin": false,
});
const AUTHOR_CONTENT = Object.freeze({
  ...READ,
  "item:write": true,
  "item:create": true,
  "item:rename": true,
});
const APPROVER_CONTENT = Object.freeze({ ...READ, "item:write": true });
const ACL_ROOTS = [
  SITE + "/Home",
  SITE + "/Data/Promotions",
  SITE + "/Data/Disclosures",
  SITE + "/Data/Approved answers",
];
const PROTECTED_ROOTS = [
  "/sitecore/system/Workflows/Basic Workflow",
  "/sitecore/system/Workflows/Liberty Mutual Workshop Review",
];
const PORTAL_HOME =
  "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home";
const brace = (id) => `{${id.toUpperCase()}}`;
const field = (id, name, v) => ({ ID: id, Hint: name, Value: v });
const common = () =>
  [ROLES.author, ROLES.approver].map((role) => [role, READ, READ]);
const stateAcl = (author, approver) => [
  [
    ROLES.author,
    { ...READ, "workflowState:write": author, "workflowState:delete": false },
  ],
  [
    ROLES.approver,
    { ...READ, "workflowState:write": approver, "workflowState:delete": false },
  ],
];
const commandAcl = (author) => [
  [ROLES.author, { ...READ, "workflowCommand:execute": author }],
  [ROLES.approver, { ...READ, "workflowCommand:execute": !author }],
];

function specifications() {
  return [
    {
      key: "workflow",
      path: WF,
      parent: "05592656-56d7-4d85-aacf-30919ee494f9",
      template: T.workflow,
      fields: {
        "Initial state": brace(IDS.draft),
        "__Short description": MARKER,
        __Security: ownedAcl(common()),
      },
    },
    {
      key: "draft",
      path: WF + "/Draft",
      parent: IDS.workflow,
      template: T.state,
      fields: {
        Final: "",
        __Sortorder: "10",
        __Security: ownedAcl(stateAcl(true, false)),
      },
    },
    {
      key: "awaiting",
      path: WF + "/Awaiting approval",
      parent: IDS.workflow,
      template: T.state,
      fields: {
        Final: "",
        __Sortorder: "20",
        __Security: ownedAcl(stateAcl(false, true)),
      },
    },
    // Non-admin edits of final content create a new native version in Draft.
    {
      key: "approved",
      path: WF + "/Approved",
      parent: IDS.workflow,
      template: T.state,
      fields: {
        Final: "1",
        __Sortorder: "30",
        __Security: ownedAcl(stateAcl(true, false)),
      },
    },
    {
      key: "submit",
      path: WF + "/Draft/Submit",
      parent: IDS.draft,
      template: T.command,
      fields: {
        "Next state": brace(IDS.awaiting),
        "Suppress Comment": "",
        __Sortorder: "10",
        __Security: ownedAcl(commandAcl(true)),
      },
    },
    {
      key: "approve",
      path: WF + "/Awaiting approval/Approve",
      parent: IDS.awaiting,
      template: T.command,
      fields: {
        "Next state": brace(IDS.approved),
        "Suppress Comment": "",
        __Sortorder: "10",
        __Security: ownedAcl(commandAcl(false)),
      },
    },
    {
      key: "reject",
      path: WF + "/Awaiting approval/Return to author",
      parent: IDS.awaiting,
      template: T.command,
      fields: {
        "Next state": brace(IDS.draft),
        "Suppress Comment": "",
        __Sortorder: "20",
        __Security: ownedAcl(commandAcl(false)),
      },
    },
  ].map((spec) => ({ ...spec, id: IDS[spec.key] }));
}

function serialization() {
  const fieldIds = {
    "Initial state": F.initial,
    Final: F.final,
    "Next state": F.next,
    "Suppress Comment": F.suppress,
    __Sortorder: F.sort,
    __Security: F.security,
  };
  return specifications().map((spec) => ({
    ID: spec.id,
    Parent: spec.parent,
    Template: spec.template,
    Path: spec.path,
    SharedFields: Object.entries(spec.fields)
      .filter(([name]) => name !== "__Short description")
      .map(([name, v]) => field(fieldIds[name], name, v)),
    Languages: [
      {
        Language: "en",
        ...(spec.fields["__Short description"]
          ? {
              Fields: [
                field(
                  F.marker,
                  "__Short description",
                  spec.fields["__Short description"],
                ),
              ],
            }
          : {}),
        Versions: [
          {
            Version: 1,
            Fields: [
              field(
                "25bed78c-4957-4165-998a-ca1b52f67497",
                "__Created",
                "20261031T160000Z",
              ),
            ],
          },
        ],
      },
    ],
  }));
}

function serializedValue(field) {
  if (field.Value === "") return "|\n";
  // The SCS value reader preserves JSON escape characters inside quoted ACLs.
  // ACLs are safe YAML plain scalars and must contain the native single slash.
  if (field.Hint === "__Security") {
    assert(
      /^ar\|/.test(field.Value) && !/[\r\n]/.test(field.Value),
      "Unexpected ACL scalar.",
    );
    return field.Value;
  }
  return JSON.stringify(field.Value);
}
function isEscapedAclArtifact(actual, expected) {
  return actual !== expected && actual === expected.replaceAll("\\", "\\\\");
}

function nativeProvenanceChanges(before, after, actor) {
  assert(
    typeof actor === "string" && actor.startsWith("sitecore\\"),
    "Use the verified current native setup actor.",
  );
  const changes = [];
  for (const name of ["__Owner", "__Created by"]) {
    const previous = value(before, name),
      current = value(after, name);
    if (previous === current) continue;
    const permittedSeed =
      name === "__Owner"
        ? previous.trim() === ""
        : previous.trim() === "" ||
          previous.trim().toLowerCase() === "sitecore\\admin";
    assert(
      permittedSeed && current === actor,
      `Unexpected native provenance change: ${name}. Preserve and inspect the journal.`,
    );
    changes.push({ name, before: previous, after: current });
  }
  return changes;
}

const STANDARD_PROPAGATION_FIELDS = [
  "__Owner",
  "__Created by",
  "__Default workflow",
  "Page Design",
];
function standardValuePropagation(before, current, standard, provenance) {
  if (norm(before.template.templateId) !== norm(standard.template.templateId))
    return [];
  return STANDARD_PROPAGATION_FIELDS.filter(
    (name) =>
      value(before, name) !== value(current, name) &&
      provenance[name]?.containsStandardValue === true &&
      provenance[name].value === value(current, name) &&
      value(current, name) === value(standard, name),
  ).map((name) => ({
    name,
    before: value(before, name),
    after: value(current, name),
    standardValuesId: standard.itemId,
  }));
}
async function fieldProvenance(query, item) {
  const { item: result } = await query(
    'query($where:ItemQueryInput!){item(where:$where){revision:field(name:"__Revision"){value} owner:field(name:"__Owner"){value containsStandardValue} creator:field(name:"__Created by"){value containsStandardValue} workflow:field(name:"__Default workflow"){value containsStandardValue} design:field(name:"Page Design"){value containsStandardValue}}}',
    {
      where: {
        database: "master",
        itemId: item.itemId,
        language: item.language.name,
        version: item.version,
      },
    },
  );
  assert(
    result?.revision?.value === value(item, "__Revision"),
    "Item changed while verifying Standard Values provenance.",
  );
  return {
    __Owner: result.owner,
    "__Created by": result.creator,
    "__Default workflow": result.workflow,
    "Page Design": result.design,
  };
}

function writeModel() {
  const base = path.join(ROOT, "authoring/items/liberty-mutual-public");
  const module = {
    $schema: "../../../.sitecore/schemas/ModuleFile.schema.json",
    namespace: MODULE,
    description:
      "Public-only three-state review; reuses scoped Author and Approver roles; administrator publishes separately.",
    items: {
      includes: [
        {
          name: "workflow",
          path: WF,
          allowedPushOperations: "CreateAndUpdate",
        },
      ],
    },
  };
  fs.writeFileSync(
    path.join(base, MODULE + ".module.json"),
    JSON.stringify(module, null, 2) + "\n",
  );
  const emitFields = (fields, indent = "") =>
    fields.flatMap((f) => [
      `${indent}- ID: ${f.ID}`,
      `${indent}  Hint: ${f.Hint}`,
      `${indent}  Value: ${serializedValue(f)}`,
    ]);
  for (const item of serialization()) {
    const language = item.Languages[0];
    const lines = [
      "---",
      `ID: ${item.ID}`,
      `Parent: ${item.Parent}`,
      `Template: ${item.Template}`,
      `Path: ${item.Path}`,
      "SharedFields:",
      ...emitFields(item.SharedFields),
      "Languages:",
      "- Language: en",
    ];
    if (language.Fields)
      lines.push("  Fields:", ...emitFields(language.Fields, "  "));
    lines.push(
      "  Versions:",
      "  - Version: 1",
      "    Fields:",
      ...emitFields(language.Versions[0].Fields, "    "),
    );
    const file = path.join(
      base,
      "items/workflow",
      item.Path.split("/sitecore/system/Workflows/")[1] + ".yml",
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, lines.join("\n") + "\n");
  }
  console.log(
    "Prepared seven public workflow definitions and their focused module. No Sitecore operations.",
  );
}

async function tree(query, root, maximum = 500) {
  const rows = [],
    pending = [root];
  while (pending.length) {
    assert(rows.length < maximum, "Native tree exceeded its declared bound.");
    const item = await read(query, { path: pending.shift() });
    assert(item, "Expected native tree is missing.");
    assert(
      item.path === root || item.path.startsWith(root + "/"),
      "Native inventory left its root.",
    );
    rows.push(item);
    pending.push(...item.children.map((child) => child.path));
  }
  return rows;
}
function contract() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "authoring/items/liberty-mutual-public/public-contract.json",
      ),
      "utf8",
    ),
  );
}
function stateFor(workflow, state) {
  if (norm(workflow) === norm(IDS.workflow)) {
    assert(
      [IDS.draft, IDS.awaiting, IDS.approved].map(norm).includes(norm(state)),
      "Unexpected existing public workflow state.",
    );
    return state;
  }
  assert(
    norm(workflow) === norm(BASIC.workflow),
    "An editorial item uses another workflow; preserve it and inspect.",
  );
  if (norm(state) === norm(BASIC.draft)) return brace(IDS.draft);
  if (norm(state) === norm(BASIC.approved)) return brace(IDS.approved);
  throw new Error(
    "Existing Basic Workflow state is unexpected; inspect before changing it.",
  );
}
async function capture(query, { allowEscapedAcl = false } = {}) {
  const { currentUser: actor } = await query(
    "query { currentUser { name isAdministrator } }",
  );
  assert(
    actor?.name?.startsWith("sitecore\\") && actor.isAdministrator === true,
    "Initial public governance setup requires the verified existing administrator.",
  );
  const model = contract(),
    templates = new Set(
      Object.entries(model.templateIds)
        .filter(([name]) => name !== "PublicRenderingParameters")
        .map(([, id]) => norm(id)),
    );
  const publicItems = await tree(query, SITE);
  const content = [];
  for (const item of publicItems.filter((row) =>
    templates.has(norm(row.template.templateId)),
  )) {
    assert(
      value(item, "__Workflow"),
      "Owned editorial item has no explicit workflow.",
    );
    const versions = [];
    for (const version of item.versions) {
      assert(
        version.language.name === "en",
        "This initial public setup supports English content only.",
      );
      const full = await read(query, {
        itemId: item.itemId,
        language: "en",
        version: version.version,
      });
      stateFor(value(full, "__Workflow"), value(full, "__Workflow state"));
      versions.push(full);
    }
    assert(versions.length, "Owned editorial item has no language version.");
    content.push({ itemId: item.itemId, path: item.path, versions });
  }
  const defaults = [];
  for (const record of model.records.filter(
    (row) =>
      row.path.startsWith("/sitecore/templates/Project/LibertyMutualPublic/") &&
      row.path.endsWith("/__Standard Values") &&
      templates.has(norm(row.template)),
  )) {
    const item = await read(query, { itemId: record.id });
    assert(item, "Public template standard values are missing.");
    assert(
      [BASIC.workflow, IDS.workflow]
        .map(norm)
        .includes(norm(value(item, "__Default workflow"))),
      "Public template has another default workflow.",
    );
    defaults.push(item);
  }
  const acl = ACL_ROOTS.map((p) => {
    const item = publicItems.find((row) => row.path === p);
    assert(item, "Required public content library is missing.");
    return item;
  });
  const roles = [];
  for (const name of [ROLES.author, ROLES.approver]) {
    const role = await readRole(query, name);
    assert(
      role &&
        JSON.stringify(role.memberOf) ===
          JSON.stringify([
            "sitecore\\Sitecore Client Authoring",
            "sitecore\\Sitecore Client Users",
          ]),
      "Reuse only the verified non-publishing Author/Approver role inheritance.",
    );
    roles.push(role);
  }
  const workflow = [],
    serializationRepairIds = [];
  for (const spec of specifications()) {
    const item = await read(query, { path: spec.path });
    if (item) {
      assert(
        norm(item.itemId) === norm(spec.id) &&
          norm(item.template.templateId) === norm(spec.template),
        "Owned workflow identity changed.",
      );
      if (spec.key === "workflow")
        assert(
          value(item, "__Short description") === MARKER,
          "Existing workflow is not owned by this setup.",
        );
      for (const [name, expected] of Object.entries(spec.fields)) {
        const actual = value(item, name);
        if (
          name === "__Security" &&
          allowEscapedAcl &&
          isEscapedAclArtifact(actual, expected)
        )
          serializationRepairIds.push(spec.id);
        else
          assert.equal(
            actual,
            expected,
            "Owned workflow differs from source; inspect before any push.",
          );
      }
      assert.deepEqual(
        item.children.map((row) => row.path).sort(),
        specifications()
          .filter((row) => row.parent === spec.id)
          .map((row) => row.path)
          .sort(),
        "Owned workflow contains an unexpected command or action.",
      );
    }
    workflow.push({ spec, item });
  }
  const protectedItems = [await read(query, { path: PORTAL_HOME })];
  for (const p of PROTECTED_ROOTS)
    protectedItems.push(...(await tree(query, p, 30)));
  return {
    schemaVersion: 1,
    actor,
    contractDigest: digest(model),
    content,
    defaults,
    acl,
    roles,
    workflow,
    serializationRepairIds,
    protectedItems,
  };
}
function comparable(snapshot) {
  return {
    ...snapshot,
    content: snapshot.content.map((row) => ({
      ...row,
      versions: row.versions.map(semantic),
    })),
    defaults: snapshot.defaults.map(semantic),
    acl: snapshot.acl.map(semantic),
    workflow: snapshot.workflow.map((row) => ({
      spec: row.spec,
      item: semantic(row.item),
    })),
    protectedItems: snapshot.protectedItems.map(semantic),
  };
}
function plan(before) {
  return {
    schemaVersion: 1,
    workflowPath: WF,
    workflowIds: IDS,
    module: MODULE,
    repairsEscapedAclIds: before.serializationRepairIds || [],
    autoPublish: false,
    publisher: "Existing administrator; no new publishing role is granted.",
    states: ["Draft", "Awaiting approval", "Approved"],
    commands: { author: ["Submit"], approver: ["Approve", "Return to author"] },
    contentItems: before.content.length,
    contentVersions: before.content.reduce(
      (n, row) => n + row.versions.length,
      0,
    ),
    templateDefaults: before.defaults.length,
    aclRoots: ACL_ROOTS,
    createsAccounts: false,
    changesRoleMembership: false,
    changesSettingsOrPresentationPermissions: false,
    protectedRoots: [...PROTECTED_ROOTS, PORTAL_HOME],
    acceptance:
      "Test actual non-admin Page Builder sessions: Author edits and submits; Author cannot approve; Approver approves or returns; approval alone does not publish; administrator publishes. Edit an approved item and verify a new Draft version. Verify local/shared datasource workflow as well as the page.",
  };
}
async function run({
  environment,
  api,
  before,
  apply = false,
  record = () => {},
}) {
  const now = await capture(api.query, {
    allowEscapedAcl: before.serializationRepairIds?.length > 0,
  });
  assert.deepEqual(
    comparable(now),
    comparable(before),
    "Native content, roles, workflow, or protected configuration changed; recapture before applying.",
  );
  if (!apply) return plan(before);
  const result = spawnSync(
    "dotnet",
    ["sitecore", "ser", "push", "-n", environment, "-i", MODULE],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert(
    result.status === 0,
    "The focused workflow push was not confirmed. Inspect before retrying.",
  );
  for (const spec of specifications()) {
    const item = await read(api.query, { itemId: spec.id });
    assert(
      item &&
        item.path === spec.path &&
        norm(item.template.templateId) === norm(spec.template),
      "Workflow definition identity differs.",
    );
    for (const [name, expected] of Object.entries(spec.fields))
      assert.equal(
        value(item, name),
        expected,
        `Workflow readback differs: ${name}.`,
      );
    assert.deepEqual(
      item.children.map((row) => row.path).sort(),
      specifications()
        .filter((row) => row.parent === spec.id)
        .map((row) => row.path)
        .sort(),
      "Unexpected action/command under public workflow.",
    );
  }
  const shared = new Map(),
    versioned = new Map(),
    standards = new Map();
  const replace = (item, updates) => {
    const copy = structuredClone(item);
    for (const [name, v] of Object.entries(updates)) {
      const f = copy.fields.find((row) => row.name === name);
      assert(f, "A configured native field is absent.");
      f.value = v;
    }
    return copy;
  };
  const expected = (item) =>
    replace(item, {
      ...(shared.get(item.itemId) || {}),
      ...(versioned.get(
        `${item.itemId}:${item.language.name}:${item.version}`,
      ) || {}),
    });
  const update = async (original, desired, sharedNames = []) => {
    let intended = expected(original);
    const current = await read(api.query, {
      itemId: original.itemId,
      language: original.language.name,
      version: original.version,
    });
    const standard = standards.get(norm(original.template.templateId));
    const inherited =
      standard && !original.path.endsWith("/__Standard Values")
        ? standardValuePropagation(
            intended,
            current,
            standard,
            await fieldProvenance(api.query, current),
          )
        : [];
    if (inherited.length)
      intended = replace(
        intended,
        Object.fromEntries(inherited.map((row) => [row.name, row.after])),
      );
    assert.deepEqual(
      semantic(current),
      semantic(intended),
      "Native item changed before the scoped update.",
    );
    const changes = Object.fromEntries(
      Object.entries(desired).filter(([name, v]) => value(current, name) !== v),
    );
    if (!Object.keys(changes).length) return current;
    record({
      phase: "field-update-intent",
      itemId: current.itemId,
      path: current.path,
      language: current.language.name,
      version: current.version,
      fields: changes,
    });
    await api.query(
      "mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}",
      {
        input: {
          database: "master",
          itemId: current.itemId,
          language: current.language.name,
          version: current.version,
          fields: [
            ...Object.entries(changes).map(([name, v]) => ({ name, value: v })),
            { name: "__Created", value: value(current, "__Created") },
          ],
        },
      },
    );
    const after = await read(api.query, {
      itemId: current.itemId,
      language: current.language.name,
      version: current.version,
    });
    const provenance = nativeProvenanceChanges(
      current,
      after,
      before.actor.name,
    );
    const compare = replace(
      after,
      Object.fromEntries(provenance.map((row) => [row.name, row.before])),
    );
    assert.deepEqual(
      semantic(compare),
      semantic(replace(current, changes)),
      "A native field changed outside the scoped update.",
    );
    for (const [name, v] of Object.entries(changes)) {
      const map = sharedNames.includes(name) ? shared : versioned,
        key = sharedNames.includes(name)
          ? current.itemId
          : `${current.itemId}:${current.language.name}:${current.version}`;
      map.set(key, { ...map.get(key), [name]: v });
    }
    if (provenance.length) {
      const key = `${current.itemId}:${current.language.name}:${current.version}`;
      versioned.set(key, {
        ...versioned.get(key),
        ...Object.fromEntries(provenance.map((row) => [row.name, row.after])),
      });
      record({
        phase: "native-seed-provenance-initialized",
        itemId: current.itemId,
        path: current.path,
        version: current.version,
        actor: before.actor.name,
        fields: provenance,
      });
    }
    if (inherited.length) {
      const key = `${current.itemId}:${current.language.name}:${current.version}`;
      versioned.set(key, {
        ...versioned.get(key),
        ...Object.fromEntries(inherited.map((row) => [row.name, row.after])),
      });
      record({
        phase: "verified-standard-values-propagation",
        itemId: current.itemId,
        path: current.path,
        version: current.version,
        fields: inherited,
      });
    }
    record({
      phase: "field-update-verified",
      itemId: after.itemId,
      path: after.path,
      version: after.version,
    });
    return after;
  };
  for (const item of before.defaults) {
    const after = await update(
      item,
      { "__Default workflow": brace(IDS.workflow) },
      ["__Default workflow"],
    );
    standards.set(norm(item.template.templateId), after);
  }
  for (const item of before.content)
    for (const version of item.versions)
      await update(
        version,
        {
          __Workflow: brace(IDS.workflow),
          "__Workflow state": stateFor(
            value(version, "__Workflow"),
            value(version, "__Workflow state"),
          ),
        },
        ["__Workflow"],
      );
  const aclEntries = [
    [ROLES.author, AUTHOR_CONTENT, AUTHOR_CONTENT],
    [ROLES.approver, APPROVER_CONTENT, APPROVER_CONTENT],
  ];
  for (const item of before.acl)
    await update(
      item,
      { __Security: mergeAcl(value(item, "__Security"), aclEntries) },
      ["__Security"],
    );
  for (const item of before.protectedItems)
    assert.deepEqual(
      semantic(await read(api.query, { itemId: item.itemId })),
      semantic(item),
      "Basic, portal, or Workshop Review configuration changed.",
    );
  for (const role of before.roles)
    assert.deepEqual(
      await readRole(api.query, role.name),
      role,
      "Role inheritance changed.",
    );
  return { ...plan(before), applied: true, published: false };
}
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--write-model") {
    assert(args.length === 1);
    writeModel();
    return;
  }
  const environment = args.shift(),
    options = {};
  while (args.length) {
    const key = args.shift();
    assert(
      [
        "--snapshot",
        "--baseline",
        "--report",
        "--apply",
        "--journal",
        "--allow-serialization-repair",
      ].includes(key) && !Object.hasOwn(options, key),
      "Invalid or repeated argument.",
    );
    options[key] = ["--apply", "--allow-serialization-repair"].includes(key)
      ? true
      : args.shift();
  }
  assert(
    environment && !!options["--snapshot"] !== !!options["--baseline"],
    "Use ENV --snapshot /abs/file OR ENV --baseline /abs/file --report /abs/file [--apply --journal /abs/file].",
  );
  const api = connection(environment, options["--apply"] === true);
  if (options["--snapshot"]) {
    assert(
      !options["--apply"] &&
        !options["--baseline"] &&
        !options["--report"] &&
        !options["--journal"] &&
        path.isAbsolute(options["--snapshot"]) &&
        !fs.existsSync(options["--snapshot"]),
      "Capture to a new absolute private snapshot.",
    );
    const before = await capture(api.query, {
      allowEscapedAcl: options["--allow-serialization-repair"] === true,
    });
    writePrivate(options["--snapshot"], {
      origin: api.origin,
      capturedAt: new Date().toISOString(),
      before,
    });
    console.log(JSON.stringify(plan(before)));
    return;
  }
  assert(
    !options["--allow-serialization-repair"],
    "A repair exception must be explicitly captured in a fresh snapshot, never added at apply time.",
  );
  assert(
    path.isAbsolute(options["--baseline"]) &&
      path.isAbsolute(options["--report"] || ""),
    "Use absolute private baseline/report paths.",
  );
  const paths = [
    options["--baseline"],
    options["--report"],
    ...(options["--journal"] ? [options["--journal"]] : []),
  ].map((file) => path.resolve(file));
  assert(
    new Set(paths).size === paths.length &&
      !fs.existsSync(options["--report"]) &&
      paths.every((file) => file !== ROOT && !file.startsWith(ROOT + path.sep)),
    "Use distinct baseline, new report, and new journal paths.",
  );
  const baseline = JSON.parse(fs.readFileSync(options["--baseline"], "utf8"));
  assert(baseline.origin === api.origin, "Baseline environment changed.");
  let record = () => {};
  if (options["--apply"]) {
    assert(
      path.isAbsolute(options["--journal"] || "") &&
        !fs.existsSync(options["--journal"]),
      "Use a new absolute private journal path.",
    );
    const journal = {
      schemaVersion: 1,
      origin: api.origin,
      baselineDigest: digest(baseline),
      events: [],
    };
    record = (event) => {
      journal.events.push({ at: new Date().toISOString(), ...event });
      writePrivate(options["--journal"], journal);
    };
    record({ phase: "workflow-setup-intent" });
  }
  const result = await run({
    environment,
    api,
    before: baseline.before,
    apply: options["--apply"] === true,
    record,
  });
  writePrivate(options["--report"], result);
  console.log(JSON.stringify(result));
}
module.exports = {
  WF,
  MODULE,
  MARKER,
  IDS,
  BASIC,
  F,
  T,
  ACL_ROOTS,
  PROTECTED_ROOTS,
  READ,
  AUTHOR_CONTENT,
  APPROVER_CONTENT,
  specifications,
  serialization,
  serializedValue,
  isEscapedAclArtifact,
  nativeProvenanceChanges,
  standardValuePropagation,
  writeModel,
  stateFor,
  capture,
  comparable,
  plan,
  run,
};
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
