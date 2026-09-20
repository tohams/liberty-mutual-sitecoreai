"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { run, validateManifest } = require("./provision-workshop-practice-content.cjs");
const M = require("./workshop-practice-content-model.cjs");
const R = require("./resource-page-authoring-model.cjs");
const W = require("./workshop-editorial-workflow-model.cjs");
const T = require("./configure-workshop-practice-template.cjs");
const Recycle = require("./recycle-original-workshop-practice.cjs");

function fakeNative({ workflow = true, template = true } = {}) {
  const store = new Map(), writes = [], reads = [];
  function put(path, templateId, values, itemId = R.uuidV5(path)) {
    const item = { itemId: R.norm(itemId), path, name: path.split("/").at(-1), template: { templateId: R.norm(templateId) }, version: 1, language: { name: "en" }, versions: [{ version: 1, language: { name: "en" } }], values: { "__Created": "20260919T000000Z", "__Revision": R.uuidV5(path + "/revision"), ...values } };
    store.set(path, item); return item;
  }
  put(W.SITE + "/Home", R.IDS.portalPageTemplate, {}, "ae9e45caf1274abe9ca72ff109981998");
  for (const [name, id] of Object.entries(M.TITLE_FIELDS)) put("/templates/" + name, "455a3e98-a627-4b40-8035-e683a0331ac7", { Shared: "", Unversioned: "" }, id);
  put(R.PROTOTYPE_PATH, R.IDS.pageTemplate, { "__Renderings": R.branchLayout(), ...Object.fromEntries(["summary", "body", "state", ...M.METADATA].map(name => [name, ""])) }, R.IDS.prototype);
  put(R.TEMPLATES + "/ResourcePage", "ab86861a-6030-46c5-b394-e8f99e8b87db", { "__Base template": M.idField(R.IDS.portalPageTemplate) }, R.IDS.pageTemplate);
  put(R.TEMPLATES + "/ResourcePage/Content", "e269fbb5-3750-427a-9149-7aa950b49301", {});
  const types = { summary: "Multi-Line Text", body: "Rich Text", reviewedAt: "Date", sourceLink: "General Link" };
  for (const name of T.FIELD_NAMES) put(R.TEMPLATES + "/ResourcePage/Content/" + name, "455a3e98-a627-4b40-8035-e683a0331ac7", { Type: types[name] || "Single-Line Text", Shared: "", Unversioned: "", Source: "", Title: name }, M.TITLE_FIELDS[name] || R.uuidV5("source-field/" + name));
  function makeTemplate(input) {
    const created = put(M.TEMPLATE_PATH, "ab86861a-6030-46c5-b394-e8f99e8b87db", { "__Base template": M.idField(input.baseTemplates[0]) });
    put(M.TEMPLATE_PATH + "/Content", "e269fbb5-3750-427a-9149-7aa950b49301", {});
    for (const definition of input.sections[0].fields) put(M.TEMPLATE_PATH + "/Content/" + definition.name, "455a3e98-a627-4b40-8035-e683a0331ac7", { Type: definition.type, Source: definition.source || "", Shared: "0", Unversioned: "0" });
    put(M.TEMPLATE_PATH + "/__Standard Values", created.itemId, {});
    return created;
  }
  const templateManifest = { schemaVersion: 1, origin: "https://test.sitecorecloud.io", complete: true, template: { path: M.TEMPLATE_PATH, itemId: R.norm(R.uuidV5(M.TEMPLATE_PATH)) }, events: [] };
  if (template) { const created = makeTemplate({ baseTemplates: [R.IDS.portalPageTemplate], sections: [{ fields: T.FIELD_NAMES.map(name => ({ name, type: types[name] || "Single-Line Text" })) }] }); created.values["__Short description"] = T.MARKER; }
  if (workflow) for (const key of ["workflow", "draft", "awaiting", "approved"]) put(W.PATHS[key], key === "workflow" ? W.TEMPLATES.workflow : W.TEMPLATES.state, { "__Short description": W.MARKER, Final: key === "approved" ? "1" : "" });
  function response(item) {
    if (!item) return { item: null };
    const parentPath = item.path.slice(0, item.path.lastIndexOf("/"));
    return { item: { ...structuredClone(item), values: undefined, parent: { itemId: store.get(parentPath)?.itemId || R.norm(R.uuidV5(parentPath)), path: parentPath }, revision: { value: item.values.__Revision }, fields: { nodes: Object.entries(item.values).map(([name, value]) => ({ name, value, fieldId: R.norm(R.uuidV5(name)) })), pageInfo: { hasNextPage: false } }, children: { nodes: [...store.values()].filter(child => child.path.slice(0, child.path.lastIndexOf("/")) === item.path).map(child => ({ itemId: child.itemId, name: child.name, path: child.path, template: child.template })), pageInfo: { hasNextPage: false } } } };
  }
  async function query(q, variables) {
    if (q.startsWith("query")) {
      const where = variables.where;
      reads.push(structuredClone(where));
      const item = where.path ? store.get(where.path) : [...store.values()].find(item => R.norm(item.itemId) === R.norm(where.itemId));
      return response(item);
    }
    const input = variables.input; writes.push({ q, input: structuredClone(input) });
    if (q.includes("createItemTemplate(")) return { createItemTemplate: { itemTemplate: { templateId: makeTemplate(input).itemId } } };
    if (q.includes("deleteItem(")) {
      assert.equal(input.permanently, false);
      const root = [...store.values()].find(item => item.itemId === R.norm(input.itemId));
      assert(root);
      for (const key of store.keys()) if (key === root.path || key.startsWith(root.path + "/")) store.delete(key);
      return { deleteItem: { successful: true } };
    }
    if (q.includes("createItem(")) {
      const parent = [...store.values()].find(item => item.itemId === R.norm(input.parent));
      assert(parent);
      const target = parent.path + "/" + input.name;
      assert(!store.has(target));
      const created = put(target, input.templateId, Object.fromEntries(input.fields.map(field => [field.name, field.value])));
      return { createItem: { item: { itemId: created.itemId } } };
    }
    assert(q.includes("updateItem("));
    const item = [...store.values()].find(item => item.itemId === R.norm(input.itemId));
    assert(item);
    Object.assign(item.values, Object.fromEntries(input.fields.map(field => [field.name, field.value])));
    return { updateItem: { item: { itemId: item.itemId } } };
  }
  return { query, store, writes, reads, put, templateManifest };
}
const origin = "https://test.sitecorecloud.io";

test("read-only plan inventories only four active Demo items without reading retired pairs or mutating without a workflow", async () => {
  const native = fakeNative({ workflow: false });
  const report = await run({ query: native.query, origin, templateManifest: native.templateManifest });
  assert.equal(report.plans.length, 4);
  assert.deepEqual(report.plans.map(item => item.path), [W.CONTENT_ROOT, W.pagePath("01"), W.pagePath("01") + "/Data", W.pagePath("01") + "/Data/Resource image"]);
  assert(native.reads.every(where => !/\/pair-0[2-9](?:\/|$)/.test(where.path || "")));
  assert.equal(report.missingWorkflow.length, 4);
  assert.equal(native.writes.length, 0);
  await assert.rejects(run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true }), /Provision and verify/);
  assert.equal(native.writes.length, 0);
});

test("fresh provisioning creates only Demo and its local data with the actual workflow, never retired pairs", async () => {
  const native = fakeNative(); let manifest;
  const report = await run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true, persist: state => { manifest = structuredClone(state); } });
  assert.equal(report.pages.length, 1);
  assert.equal(report.pages[0].pair, "01");
  assert.equal(report.itemCount, 4);
  assert.equal(report.published, false);
  assert.equal(native.writes.length, 6); // Four creates and root/Demo layout completions.
  assert.equal(native.writes.filter(write => write.q.includes("createItem(")).length, 4);
  assert.equal(manifest.items.length, 4);
  assert(native.reads.every(where => !/\/pair-0[2-9](?:\/|$)/.test(where.path || "")));
  assert([...native.store.keys()].every(path => !/\/pair-0[2-9](?:\/|$)/.test(path)));
  assert.equal(native.store.get(W.CONTENT_ROOT).values.summary, "See how an author prepares content and an approver reviews it before publication.");
  assert.match(native.store.get(W.CONTENT_ROOT).values.body, /Demo/);
  assert(manifest.items.every(item => item.complete));
  const workflow = native.store.get(W.PATHS.workflow);
  const draft = native.store.get(W.PATHS.draft);
  for (const page of report.pages) {
    const item = native.store.get(page.path);
    const image = native.store.get(page.path + "/Data/Resource image");
    assert.equal(item.values.__Workflow, M.idField(workflow.itemId));
    assert.equal(item.values["__Default workflow"], M.idField(workflow.itemId));
    assert.equal(item.values["__Workflow state"], M.idField(draft.itemId));
    assert.equal(item.values.__Renderings, M.pageLayout(page.path, item.itemId, image.itemId));
    assert.equal(item.values.state, "All");
    assert(M.METADATA.every(name => item.values[name] === ""));
    assert.equal(image.values.image, "");
  }
  assert(native.writes.every(write => !write.q.includes("publish")));
});

test("rerunning preserves participant edits, versions and current workflow state", async () => {
  const native = fakeNative(); let manifest;
  await run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true, persist: state => { manifest = structuredClone(state); } });
  native.writes.length = 0;
  const item = native.store.get(W.pagePath("01"));
  item.values.Title = "Customer-authored title";
  item.values["__Workflow state"] = M.idField(native.store.get(W.PATHS.awaiting).itemId);
  item.version = 2; item.versions.push({ version: 2, language: { name: "en" } });
  await run({ query: native.query, origin, manifest, templateManifest: native.templateManifest, apply: true });
  assert.equal(item.values.Title, "Customer-authored title");
  assert.equal(item.version, 2);
  assert.equal(native.writes.length, 0);
});

test("existing unrelated content blocks all writes before provisioning starts", async () => {
  const native = fakeNative();
  native.put(W.pagePath("01"), native.templateManifest.template.itemId, { "__Short description": M.MARKER });
  await assert.rejects(run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true }), /recorded manifest ID/);
  assert.equal(native.writes.length, 0);
});

test("invalid manifest paths and a shared editable field fail before writes", async () => {
  assert.throws(() => validateManifest({ schemaVersion: 1, origin, scope: W.CONTENT_ROOT, items: [{ path: W.SITE + "/Home/resources", itemId: R.IDS.resources }], events: [] }, origin), /unknown/);
  const native = fakeNative();
  native.store.get("/templates/body").values.Shared = "1";
  await assert.rejects(run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true }), /native versioned/);
  assert.equal(native.writes.length, 0);
});

test("layout targets are exact and compact native IDs become dashed GUID values", () => {
  assert.equal(M.idField("ae9e45caf1274abe9ca72ff109981998"), "{AE9E45CA-F127-4ABE-9CA7-2FF109981998}");
  assert.throws(() => M.pageLayout(W.CONTENT_ROOT + "/pair-99", R.IDS.prototype), /outside workshop/);
  assert.throws(() => M.pageLayout(W.CONTENT_ROOT, "invalid"), /recorded native IDs/);
});

test("isolated template is created from PortalPage with distinct versioned fields", async () => {
  const native = fakeNative({ template: false }); let manifest;
  const plan = await T.run({ query: native.query, origin });
  assert.equal(plan.fields.length, 9); assert.equal(native.writes.length, 0);
  const report = await T.run({ query: native.query, origin, apply: true, persist: state => { manifest = structuredClone(state); } });
  assert.equal(report.template.path, M.TEMPLATE_PATH);
  assert.equal(report.template.fields.length, 9);
  assert.equal(native.writes.length, 2);
  assert(manifest.complete);
  assert(report.template.fields.every(field => R.norm(field.itemId) !== R.norm(field.sourceFieldId)));
  assert.equal(native.store.get(M.TEMPLATE_PATH).values["__Base template"], M.idField(R.IDS.portalPageTemplate));
  native.writes.length = 0;
  await T.run({ query: native.query, origin, manifest, apply: true });
  assert.equal(native.writes.length, 0);
});

test("a template inheriting ResourcePage is rejected before any page creation", async () => {
  const native = fakeNative();
  native.store.get(M.TEMPLATE_PATH).values["__Base template"] = M.idField(R.IDS.pageTemplate);
  await assert.rejects(run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true }), /never ResourcePage/);
  assert.equal(native.writes.length, 0);
});

test("native zero-valued versioning flags are accepted but shared or unknown values are refused", async () => {
  for (const [field, unsafe] of [["Shared", "1"], ["Unversioned", "1"], ["Shared", "false"]]) {
    const native = fakeNative();
    native.store.get(M.TEMPLATE_PATH + "/Content/body").values[field] = unsafe;
    await assert.rejects(run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true }), /versioning differs/);
    assert.equal(native.writes.length, 0);
  }
});

test("a recorded incomplete native template is completed without recreating it", async () => {
  const native = fakeNative();
  native.store.get(M.TEMPLATE_PATH).values["__Short description"] = "";
  const manifest = { ...native.templateManifest, complete: false };
  const plan = await T.run({ query: native.query, origin, manifest });
  assert.equal(plan.action, "complete-owned-template-marker");
  assert.equal(native.writes.length, 0);
  const result = await T.run({ query: native.query, origin, manifest, apply: true });
  assert.equal(result.template.itemId, native.templateManifest.template.itemId);
  assert.equal(native.writes.length, 1);
  assert(native.writes[0].q.includes("updateItem("));
});

test("a historical 28-item manifest preserves retired inventory while absent pairs are neither read nor recreated", async () => {
  const native = fakeNative(); let manifest;
  await run({ query: native.query, origin, templateManifest: native.templateManifest, apply: true, persist: state => { manifest = structuredClone(state); } });
  const retired = M.targets(manifest.workflow, native.templateManifest.template.itemId).filter(spec => spec.pair && spec.pair !== "01");
  assert.equal(retired.length, 24);
  for (const spec of retired) {
    const item = native.put(spec.path, spec.templateId, { ...spec.fields });
    manifest.items.push({ path: spec.path, itemId: item.itemId, kind: spec.kind, pair: spec.pair, complete: true });
  }
  manifest.pages = manifest.items.filter(item => item.kind === "page").map(({ pair, path, itemId }) => ({ pair, path, itemId }));
  assert.equal(manifest.pages.length, 9);
  assert.equal(manifest.items.length, 28);
  validateManifest(manifest, origin);
  const historicalRoot = M.targets(manifest.workflow, native.templateManifest.template.itemId).find(spec => spec.kind === "root");
  assert.match(historicalRoot.fields.body, /assigned to your workshop pair/);
  Object.assign(native.store.get(W.CONTENT_ROOT).values, { summary: historicalRoot.fields.summary, body: historicalRoot.fields.body });
  const historicalInventory = structuredClone(manifest.items);
  const retiredPaths = new Set(retired.map(spec => spec.path));
  const retiredIds = new Set(manifest.items.filter(item => retiredPaths.has(item.path)).map(item => R.norm(item.itemId)));
  for (const path of retiredPaths) native.store.delete(path);
  native.writes.length = 0;
  native.reads.length = 0;
  const before = structuredClone([...native.store.entries()]);

  const plan = await run({ query: native.query, origin, manifest, templateManifest: native.templateManifest });
  assert.equal(plan.plans.length, 4);
  assert(plan.plans.every(item => item.action === "preserve-existing"));
  const report = await run({ query: native.query, origin, manifest, templateManifest: native.templateManifest, apply: true, persist: state => { manifest = structuredClone(state); } });
  assert.equal(report.itemCount, 4);
  assert.deepEqual(report.pages.map(page => page.pair), ["01"]);
  assert.deepEqual(manifest.pages.map(page => page.pair), ["01"], "Future ACL setup must receive Demo only");
  assert.deepEqual(manifest.items, historicalInventory, "Retired recorded IDs remain in the private manifest for historical recovery");
  assert(native.reads.every(where => !retiredPaths.has(where.path) && (!where.itemId || !retiredIds.has(R.norm(where.itemId)))));
  assert.equal(native.writes.length, 0);
  assert.deepEqual([...native.store.entries()], before);
});

function originalSeed(native) {
  const workflow = Object.fromEntries(["workflow", "draft", "awaiting", "approved"].map(key => [key + "Id", native.store.get(W.PATHS[key]).itemId]));
  const manifest = { schemaVersion: 1, origin, scope: W.CONTENT_ROOT, workflow, items: [], events: [] };
  for (const spec of M.targets(workflow, R.IDS.pageTemplate)) {
    const item = native.put(spec.path, spec.templateId, { ...spec.fields });
    manifest.items.push({ path: spec.path, itemId: item.itemId, kind: spec.kind, pair: spec.pair, complete: true });
  }
  for (const spec of M.targets(workflow, R.IDS.pageTemplate).filter(item => ["root", "page"].includes(item.kind))) {
    const item = native.store.get(spec.path), image = native.store.get(spec.path + "/Data/Resource image");
    item.values.__Renderings = M.pageLayout(spec.path, item.itemId, image?.itemId);
  }
  return manifest;
}
test("original untouched subtree is recycled once with permanently false", async () => {
  const native = fakeNative(), manifest = originalSeed(native);
  assert.equal(M.targets().length, 28, "Historical recycling keeps the complete original nine-pair contract");
  assert.deepEqual(M.ACTIVE_PAIRS, ["01"]);
  assert.equal(M.activeTargets().length, 4);
  validateManifest(manifest, origin);
  const before = await Recycle.capture(native.query, origin, manifest, native.templateManifest);
  assert.equal(before.items.length, 28);
  await Recycle.run({ query: native.query, origin, before }); assert.equal(native.writes.length, 0);
  const result = await Recycle.run({ query: native.query, origin, before, apply: true });
  assert.equal(result.mode, "recycled"); assert.equal(native.writes.length, 1);
  assert.equal(native.writes[0].input.permanently, false);
  assert(!native.store.has(W.CONTENT_ROOT));
  assert(native.store.has(M.TEMPLATE_PATH));
  assert(native.store.has(R.TEMPLATES + "/ResourcePage"));
});
test("historical recycling still refuses edited retired pair-02 content and revision changes after capture", async () => {
  const native = fakeNative(), manifest = originalSeed(native);
  const page = native.store.get(W.pagePath("02"));
  const original = page.values.Title; page.values.Title = "Participant work";
  await assert.rejects(Recycle.capture(native.query, origin, manifest, native.templateManifest), /Title readback/);
  page.values.Title = original;
  const before = await Recycle.capture(native.query, origin, manifest, native.templateManifest);
  page.values.__Revision = "changed";
  await assert.rejects(Recycle.run({ query: native.query, origin, before, apply: true }), /changed after capture/);
  assert.equal(native.writes.length, 0);
});
