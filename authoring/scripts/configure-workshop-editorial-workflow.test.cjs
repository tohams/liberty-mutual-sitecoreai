"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const M = require("./workshop-editorial-workflow-model.cjs");
const C = require("./configure-workshop-editorial-workflow.cjs");

function fakeNative() {
  const items = new Map(), roles = new Map(), mutations = [];
  const common = ["__Created", "__Revision", "__Lock", "__Security", "__Workflow", "__Workflow state", "__Short description", "Initial state", "Next state", "Final", "Description", "Default Comment Dialog Height", "Default Comment Template", "Suppress Comment", "__Sortorder", "Title", "summary"];
  const create = (path, template, fields = {}) => {
    const itemId = crypto.randomUUID().replaceAll("-", "");
    const parentPath = path.split("/").slice(0, -1).join("/");
    const item = { itemId, name: path.split("/").at(-1), path, version: 1, language: { name: "en" }, parent: { itemId: items.get(parentPath)?.itemId || "f".repeat(32), path: parentPath }, template: { templateId: template, name: "Test template" }, revision: { value: crypto.randomUUID() }, versions: [{ version: 1, language: { name: "en" } }], children: [], fields: [] };
    item.fields = common.map((name, i) => ({ fieldId: (i + 1).toString(16).padStart(32, "0"), name, value: fields[name] ?? (name === "__Created" ? "20260918T000000Z" : name === "__Revision" ? item.revision.value : "") }));
    for (const [name, value] of Object.entries(fields)) if (!item.fields.some(x => x.name === name)) item.fields.push({ fieldId: crypto.randomUUID(), name, value });
    items.set(path, item);
    const parent = items.get(parentPath);
    if (parent) parent.children.push({ itemId, name: item.name, path, template: item.template });
    return item;
  };
  create("/sitecore/system/Workflows", "0".repeat(32));
  const resolve = where => where.path ? items.get(where.path) : [...items.values()].find(x => M.norm(x.itemId) === M.norm(where.itemId));
  const query = async (source, variables = {}) => {
    if (source.startsWith("mutation")) mutations.push({ source, input: structuredClone(variables.input) });
    if (source.includes("role(roleName:")) {
      const role = roles.get(variables.name);
      return { role: role ? { name: role.name, memberOf: { nodes: role.memberOf.map(name => ({ name })), pageInfo: { hasNextPage: false } } } : null };
    }
    if (source.includes("createRole(input:")) {
      const role = { name: variables.input.roleName, memberOf: [] };
      assert(!roles.has(role.name)); roles.set(role.name, role);
      return { createRole: { role: { name: role.name } } };
    }
    if (source.includes("addRoleToRoles(input:")) {
      roles.get(variables.input.roleName).memberOf.push(...variables.input.parentRoles);
      return { addRoleToRoles: { successful: true } };
    }
    if (source.includes("deleteRoleFromRoles(input:")) {
      const role = roles.get(variables.input.roleName);
      role.memberOf = role.memberOf.filter(name => !variables.input.parentRoles.includes(name));
      return { deleteRoleFromRoles: { successful: true } };
    }
    if (source.includes("createItem(input:")) {
      const input = variables.input, parent = resolve({ itemId: input.parent });
      assert(parent);
      const item = create(parent.path + "/" + input.name, input.templateId, Object.fromEntries(input.fields.map(x => [x.name, x.value])));
      return { createItem: { item: { itemId: item.itemId } } };
    }
    if (source.includes("updateItem(input:")) {
      const item = resolve({ itemId: variables.input.itemId });
      for (const field of variables.input.fields) item.fields.find(x => x.name === field.name).value = field.value;
      item.revision.value = crypto.randomUUID();
      item.fields.find(x => x.name === "__Revision").value = item.revision.value;
      return { updateItem: { item: { itemId: item.itemId } } };
    }
    if (source.includes("item(where:")) {
      const item = resolve(variables.where);
      if (!item) return { item: null };
      const copy = structuredClone(item);
      copy.children = { nodes: copy.children, pageInfo: { hasNextPage: false } };
      copy.fields = { nodes: copy.fields, pageInfo: { hasNextPage: false, endCursor: null } };
      return { item: copy };
    }
    throw new Error("Unexpected fake native operation");
  };
  return { query, create, items, roles, mutations };
}

function practiceTemplate(native) {
  const item = native.create(M.PRACTICE_TEMPLATE_PATH, M.TEMPLATES.definition, { "__Base template": M.brace(M.TEMPLATES.portalPage) });
  return { path: item.path, itemId: item.itemId };
}

test("workflow owns a separate root, three states, separate commands and scoped automatic publication", () => {
  const ids = Object.fromEntries(Object.keys(M.PATHS).map(key => [key, crypto.randomUUID()]));
  const specs = M.workflowSpecs(ids);
  assert.equal(specs.length, 8);
  assert(specs.every(x => x.path.startsWith(M.WORKFLOW_ROOT)));
  assert.equal(specs.find(x => x.key === "workflow").fields["Initial state"], M.brace(ids.draft));
  assert.equal(specs.find(x => x.key === "submit").fields["Next state"], M.brace(ids.awaiting));
  assert.equal(specs.find(x => x.key === "approve").fields["Next state"], M.brace(ids.approved));
  assert.equal(specs.find(x => x.key === "reject").fields["Next state"], M.brace(ids.draft));
  assert.equal(specs.find(x => x.key === "approved").fields.Final, "1");
  const publish = specs.find(x => x.key === "publish");
  assert.equal(publish.parent, M.PATHS.approved);
  assert.equal(publish.template, M.TEMPLATES.action);
  assert.equal(publish.fields.Type, "Sitecore.Workflows.Simple.PublishAction, Sitecore.Kernel");
  const options = new URLSearchParams(publish.fields.Parameters);
  assert.deepEqual(Object.fromEntries(options), { deep: "0", related: "0", smart: "1", targets: "experienceedge", alllanguages: "0", languages: "en", itemlanguage: "0" });
});

test("native compact IDs become canonical field references", () => {
  assert.equal(M.brace("b4f49b234bba4c79ba22f89f5f0d4e4f"), "{B4F49B23-4BBA-4C79-BA22-F89F5F0D4E4F}");
  assert.throws(() => M.brace("Draft"));
});

test("author and approver remain independent and inherit no administration or broad site role", () => {
  const roles = M.roleSpecs(["01", "02"]);
  assert(!roles.some(x => x.memberOf.some(name => /Developer|Designer|Site Managing|Account Managing|Securing|Local Administrators|\\Author$/.test(name))));
  assert(!roles.find(x => x.name === M.ROLES.author).memberOf.some(x => /Publishing/.test(x)));
  assert(!roles.some(x => x.memberOf.includes("sitecore\\Sitecore Client Publishing")));
  assert(!roles.some(x => x.memberOf.includes(M.ROLES.author) || x.memberOf.includes(M.ROLES.approver)));
});

test("ACL gives only author Submit and only approver review commands", () => {
  const specs = M.workflowSpecs();
  const right = (key, role, permission) => specs.find(x => x.key === key).acl.find(([name]) => name === role)[1][permission];
  assert.equal(right("submit", M.ROLES.author, "workflowCommand:execute"), true);
  assert.equal(right("submit", M.ROLES.approver, "workflowCommand:execute"), false);
  for (const key of ["approve", "reject"]) {
    assert.equal(right(key, M.ROLES.author, "workflowCommand:execute"), false);
    assert.equal(right(key, M.ROLES.approver, "workflowCommand:execute"), true);
  }
  assert.equal(right("awaiting", M.ROLES.author, "workflowState:write"), false);
  assert.equal(right("awaiting", M.ROLES.approver, "workflowState:write"), true);
});

test("ACL merge preserves unrelated users and roles byte-for-byte and is idempotent", () => {
  const other = "au|sitecore\\ServicesAPI|pd|+item:read|^*|pe|+item:read|^*|ar|sitecore\\Existing Team|pe|+item:read|";
  const entries = [[M.ROLES.author, M.READ_ONLY, M.READ_ONLY]];
  const once = M.mergeAcl(other, entries);
  assert(once.startsWith(other));
  assert.equal(M.mergeAcl(once, entries), once);
  assert.throws(() => M.mergeAcl("unrecognized ACL", entries));
  assert.throws(() => M.aclEntry("sitecore\\Everyone", M.EDIT_PAGE));
});

test("only exact recorded practice pages can receive per-pair rights", () => {
  const template = { path: M.PRACTICE_TEMPLATE_PATH, itemId: crypto.randomUUID() };
  const spec = M.contentSpec({ pair: "02", path: M.pagePath("02"), itemId: crypto.randomUUID() }, template);
  assert.equal(spec.acl[0][0], M.pairRole("02"));
  assert.equal(spec.acl[0][1]["item:write"], true);
  assert.equal(spec.acl[0][2]["item:write"], false);
  assert.equal(spec.template, template.itemId);
  assert.throws(() => M.contentSpec({ pair: "02", path: M.SITE + "/Home", itemId: crypto.randomUUID() }, template));
  assert.throws(() => M.contentSpec({ pair: "02", path: M.pagePath("03"), itemId: crypto.randomUUID() }, template));
  assert.throws(() => M.contentSpec({ pair: "10", path: M.CONTENT_ROOT + "/pair-10", itemId: crypto.randomUUID() }, template));
});

test("old ResourcePage manifests and unrecorded or unrelated templates are refused", () => {
  const pages = [{ pair: "02", path: M.pagePath("02"), itemId: crypto.randomUUID() }];
  assert.throws(() => C.contentPages({ pages }), /dedicated WorkshopPracticePage/);
  assert.throws(() => C.contentPages({ pages, template: { path: "/sitecore/templates/Project/LibertyMutual/ResourcePage", itemId: crypto.randomUUID() } }), /dedicated WorkshopPracticePage/);
  assert.throws(() => M.contentTemplate({ path: M.PRACTICE_TEMPLATE_PATH, itemId: "not-an-id" }), /recorded native item ID/);
  assert.throws(() => M.contentTemplate({ path: M.PRACTICE_TEMPLATE_PATH, itemId: M.TEMPLATES.portalPage }), /cannot use ResourcePage or PortalPage/);
});

test("native practice template must have only the direct PortalPage base", async () => {
  for (const bases of ["", "{E9573E8D-00D6-5FD9-9015-2F0AEC4A0B60}", M.brace(M.TEMPLATES.portalPage) + "|{E9573E8D-00D6-5FD9-9015-2F0AEC4A0B60}"]) {
    const native = fakeNative(), template = practiceTemplate(native);
    native.items.get(template.path).fields.find(x => x.name === "__Base template").value = bases;
    await assert.rejects(C.capture(native.query, { template, pages: [{ pair: "02", path: M.pagePath("02"), itemId: crypto.randomUUID() }] }), /directly and only from PortalPage/);
    assert.equal(native.mutations.length, 0);
  }
});

test("capture and default run perform no mutations", async () => {
  const native = fakeNative(), before = await C.capture(native.query);
  const result = await C.run({ query: native.query, before });
  assert.equal(result.mode, "read-only");
  assert.equal(native.mutations.length, 0);
  assert.equal(result.workflow.length, 8);
  assert.equal(result.roles.length, 12);
});

test("apply creates only owned workflow and roles and a repeat apply is idempotent", async () => {
  const native = fakeNative(), before = await C.capture(native.query);
  const result = await C.run({ query: native.query, before, apply: true });
  assert.equal(result.usersCreated, 0);
  assert.equal(result.usersAssigned, 0);
  assert.equal(result.published, false);
  assert.equal(native.items.size, 9);
  const root = native.items.get(M.WORKFLOW_ROOT);
  assert.equal(root.fields.find(x => x.name === "Initial state").value, M.brace(result.draftId));
  assert(native.mutations.every(x => !/createUser|addAccounts|publish|executeWorkflow/.test(x.source)));
  assert(result.approvalPublishing.actionId);
  assert.equal(result.approvalPublishing.manualPublishingRole, false);
  const writes = native.mutations.length;
  const stable = await C.capture(native.query);
  await C.run({ query: native.query, before: stable, apply: true });
  assert.equal(native.mutations.length, writes);
});

test("removing legacy global publishing requires an explicit migration baseline and preserves all other memberships", async () => {
  const native = fakeNative();
  await C.run({ query: native.query, before: await C.capture(native.query), apply: true });
  native.roles.get(M.ROLES.approver).memberOf.push(M.CLIENT_PUBLISHING);
  // Represent the already-installed initial workflow before Auto Publish existed.
  native.items.delete(M.PATHS.publish);
  native.items.get(M.PATHS.approved).children = [];
  const writes = native.mutations.length;
  await assert.rejects(C.capture(native.query), /--migrate-publishing/);
  assert.equal(native.mutations.length, writes);
  const before = await C.capture(native.query, null, { migratePublishing: true });
  const plan = await C.run({ query: native.query, before });
  assert.equal(native.mutations.length, writes);
  assert.equal(plan.migration, C.PUBLISHING_MIGRATION);
  assert.deepEqual(plan.roles.find(x => x.name === M.ROLES.approver).remove, [M.CLIENT_PUBLISHING]);
  const result = await C.run({ query: native.query, before, apply: true });
  const removals = native.mutations.slice(writes).filter(x => x.source.includes("deleteRoleFromRoles"));
  assert.deepEqual(removals.map(x => x.input), [{ roleName: M.ROLES.approver, parentRoles: [M.CLIENT_PUBLISHING] }]);
  assert.equal(native.mutations[writes].source.includes("deleteRoleFromRoles"), true, "Remove broad publishing before installing the automatic action");
  assert.deepEqual([...native.roles.get(M.ROLES.approver).memberOf].sort(), ["sitecore\\Sitecore Client Authoring", "sitecore\\Sitecore Client Users"]);
  assert.equal(result.published, false);
  assert.equal(native.items.get(M.PATHS.publish).fields.find(x => x.name === "Parameters").value, M.PUBLISH_ACTION.parameters);
  const stableWrites = native.mutations.length;
  await C.run({ query: native.query, before: await C.capture(native.query, null, { migratePublishing: true }), apply: true });
  assert.equal(native.mutations.length, stableWrites);
});

test("publishing migration never authorizes removal of arbitrary inherited roles", async () => {
  for (const parents of [
    ["sitecore\\Sitecore Client Users", M.CLIENT_PUBLISHING],
    ["sitecore\\Sitecore Client Users", "sitecore\\Sitecore Client Authoring", M.CLIENT_PUBLISHING, "sitecore\\Developer"],
  ]) {
    const native = fakeNative();
    native.roles.set(M.ROLES.approver, { name: M.ROLES.approver, memberOf: parents });
    await assert.rejects(C.capture(native.query, null, { migratePublishing: true }), /exact legacy Approver parent set/);
    assert.equal(native.mutations.length, 0);
  }
});

test("an existing automatic publish action cannot silently widen its target or descendants", async () => {
  const native = fakeNative();
  await C.run({ query: native.query, before: await C.capture(native.query), apply: true });
  native.items.get(M.PATHS.publish).fields.find(x => x.name === "Parameters").value = "deep=1&related=1";
  const writes = native.mutations.length;
  await assert.rejects(C.capture(native.query), /differs from the reviewed model/);
  assert.equal(native.mutations.length, writes);
});

test("practice ACL apply preserves participant content, workflow state and version", async () => {
  const native = fakeNative();
  const workflow = await C.run({ query: native.query, before: await C.capture(native.query), apply: true });
  const template = practiceTemplate(native);
  native.create(M.CONTENT_ROOT, "0".repeat(32));
  const item = native.create(M.pagePath("02"), template.itemId, { Title: "Keep this participant's text", summary: "Saved edit", "__Workflow": M.brace(workflow.workflowId), "__Workflow state": M.brace(workflow.awaitingId), "__Security": "ar|sitecore\\Existing Team|pe|+item:read|" });
  const before = await C.capture(native.query, { template, pages: [{ pair: "02", path: item.path, itemId: item.itemId }] });
  const original = structuredClone(item);
  await C.run({ query: native.query, before, apply: true });
  assert.equal(item.fields.find(x => x.name === "Title").value, "Keep this participant's text");
  assert.equal(item.fields.find(x => x.name === "__Workflow state").value, M.brace(workflow.awaitingId));
  assert.equal(item.version, original.version);
  assert(item.fields.find(x => x.name === "__Security").value.startsWith("ar|sitecore\\Existing Team|pe|+item:read|"));
});

test("template identity or definition change after capture stops before any ACL mutation", async () => {
  for (const change of ["identity", "definition"]) {
    const native = fakeNative();
    const workflow = await C.run({ query: native.query, before: await C.capture(native.query), apply: true });
    const template = practiceTemplate(native);
    const item = native.create(M.pagePath("02"), template.itemId, { "__Workflow": M.brace(workflow.workflowId), "__Workflow state": M.brace(workflow.draftId) });
    const before = await C.capture(native.query, { template, pages: [{ pair: "02", path: item.path, itemId: item.itemId }] });
    const writes = native.mutations.length;
    if (change === "identity") native.items.get(template.path).path += "-moved";
    else native.items.get(template.path).fields.find(x => x.name === "Title").value = "Concurrent definition edit";
    await assert.rejects(C.run({ query: native.query, before, apply: true }), /unexpected template or identity|Practice template changed/);
    assert.equal(native.mutations.length, writes);
  }
});

test("template is rechecked immediately before each practice ACL write", async () => {
  const native = fakeNative();
  const workflow = await C.run({ query: native.query, before: await C.capture(native.query), apply: true });
  const template = practiceTemplate(native);
  const item = native.create(M.pagePath("02"), template.itemId, { "__Workflow": M.brace(workflow.workflowId), "__Workflow state": M.brace(workflow.draftId) });
  const before = await C.capture(native.query, { template, pages: [{ pair: "02", path: item.path, itemId: item.itemId }] });
  let templateReads = 0;
  const query = async (source, variables) => {
    if (variables?.where?.itemId === template.itemId && ++templateReads === 2) native.items.get(template.path).fields.find(x => x.name === "__Base template").value = "{E9573E8D-00D6-5FD9-9015-2F0AEC4A0B60}";
    return native.query(source, variables);
  };
  const writes = native.mutations.length;
  await assert.rejects(C.run({ query, before, apply: true }), /directly and only from PortalPage/);
  assert.equal(native.mutations.length, writes);
});

test("changed role membership stops before any mutation", async () => {
  const native = fakeNative(), before = await C.capture(native.query);
  native.roles.set(M.ROLES.author, { name: M.ROLES.author, memberOf: ["sitecore\\Developer"] });
  await assert.rejects(C.run({ query: native.query, before, apply: true }), /Role membership changed/);
  assert.equal(native.mutations.length, 0);
});

test("pre-existing workflow-name collision and unexpected role rights are refused", async () => {
  const native = fakeNative();
  native.create(M.WORKFLOW_ROOT, M.TEMPLATES.workflow);
  await assert.rejects(C.capture(native.query), /unowned configuration/);
  assert.throws(() => C.validateRole({ name: M.ROLES.approver, memberOf: ["sitecore\\Sitecore Local Administrators"] }, M.roleSpecs(["01"])[1]), /unreviewed inherited privileges/);
});

test("tampered snapshot is rejected", async () => {
  const native = fakeNative(), before = await C.capture(native.query);
  before.roles[0].spec.memberOf.push("sitecore\\Developer");
  assert.throws(() => C.plan(before), /checksum differs/);
  assert.equal(native.mutations.length, 0);
});
