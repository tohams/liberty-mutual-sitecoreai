"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { run, preflight, validateManifest } = require("./provision-authoring-practice-content.cjs");
const M = require("./authoring-practice-content-model.cjs");
const C = require("./campaign-authoring-model.cjs");

const origin = "https://test.sitecorecloud.io";
const TEMPLATE = {
  field: "455a3e98-a627-4b40-8035-e683a0331ac7",
  workflow: "1c0acc50-37be-4742-b43c-96a07a7410a5",
  state: "4b7e2da9-de43-4c83-88c3-02f042031d04",
};

function fakeNative() {
  const store = new Map();
  const writes = [];
  const reads = [];
  let failNextRead = false;
  let interruptAfterCreate = false;

  function put(path, templateId, values = {}, itemId = C.uid(path)) {
    const item = {
      itemId: C.norm(itemId), path, name: path.split("/").at(-1),
      template: { templateId: C.norm(templateId) },
      version: 1, language: { name: "en" },
      versions: [{ version: 1, language: { name: "en" } }],
      values: { __Created: "20260920T120000Z", __Revision: C.uid(path + "/revision"), ...values },
    };
    store.set(path, item);
    return item;
  }

  for (const record of C.modelRecords()) {
    const language = record.Languages.find(entry => entry.Language === "en");
    const fields = [
      ...(record.SharedFields || []),
      ...(language?.Fields || []),
      ...(language?.Versions[0].Fields || []),
    ];
    put(record.Path, record.Template, Object.fromEntries(fields.map(field => [field.Hint, field.Value])), record.ID);
  }
  put(C.SITE + "/Home", "2ec94e3d-439c-4fc6-bd4e-f08c7ddd9203", {}, "ae9e45caf1274abe9ca72ff109981998");
  put(C.TP + "/PortalPage", "ab86861a-6030-46c5-b394-e8f99e8b87db", {}, C.IDS.portalPage);
  put("/sitecore/templates/Common/Folder", "ab86861a-6030-46c5-b394-e8f99e8b87db", {}, "a87a00b1-e6db-45ab-8b54-636fec3b5523");
  for (const [name, id] of [["Title", C.F.title], ["NavigationTitle", C.F.navigation]]) {
    put("/templates/" + name, TEMPLATE.field, { Type: "Single-Line Text", Shared: "", Unversioned: "" }, id);
  }
  for (const [key, label, draftKey] of [
    ["workflow", "Page workflow", "draft"],
    ["datasourceWorkflow", "Datasource workflow", "datasourceDraft"],
  ]) {
    const path = "/sitecore/system/Workflows/" + label;
    put(path, TEMPLATE.workflow, {}, C.IDS[key]);
    put(path + "/Draft", TEMPLATE.state, { Final: "" }, C.IDS[draftKey]);
  }

  function response(item) {
    if (!item) return { item: null };
    const parentPath = item.path.slice(0, item.path.lastIndexOf("/"));
    return {
      item: {
        ...structuredClone(item), values: undefined,
        parent: { path: parentPath, itemId: store.get(parentPath)?.itemId || C.norm(C.uid(parentPath)) },
        revision: { value: item.values.__Revision },
        fields: {
          nodes: Object.entries(item.values).map(([name, value]) => ({ name, value, fieldId: C.norm(C.uid(name)) })),
          pageInfo: { hasNextPage: false },
        },
        children: {
          nodes: [...store.values()].filter(child => child.path.slice(0, child.path.lastIndexOf("/")) === item.path)
            .map(child => ({ itemId: child.itemId, path: child.path, name: child.name, template: child.template })),
          pageInfo: { hasNextPage: false },
        },
      },
    };
  }

  async function query(q, variables) {
    if (/^query\b/.test(q)) {
      if (failNextRead) { failNextRead = false; throw new Error("Simulated interrupted readback after confirmed native ID"); }
      reads.push(structuredClone(variables.where));
      const { path, itemId } = variables.where;
      return response(path ? store.get(path) : [...store.values()].find(item => C.norm(item.itemId) === C.norm(itemId)));
    }
    const input = variables.input;
    writes.push({ q, input: structuredClone(input) });
    assert(q.includes("createItem("), "Provisioning may only create content, never update, delete, version, or publish it");
    const parent = [...store.values()].find(item => C.norm(item.itemId) === C.norm(input.parent));
    assert(parent, "Native parent must exist before creating its child");
    const path = parent.path + "/" + input.name;
    assert(!store.has(path), "A recorded or existing native item must never be created twice");
    const created = put(path, input.templateId, Object.fromEntries(input.fields.map(field => [field.name, field.value])));
    if (interruptAfterCreate) { interruptAfterCreate = false; failNextRead = true; }
    return { createItem: { item: { itemId: created.itemId } } };
  }

  return { query, store, reads, writes, put, interruptAfterNextCreate() { interruptAfterCreate = true; } };
}

function emptyManifest() {
  return { schemaVersion: 1, origin, scope: M.ROOT_PATH, contractSha256: M.CONTRACT_SHA256, items: [], events: [] };
}

async function provision(native = fakeNative()) {
  let manifest;
  const report = await run({ query: native.query, origin, apply: true, persist: state => { manifest = structuredClone(state); } });
  return { native, report, manifest };
}

function legacyProvision() {
  const native = fakeNative();
  const manifest = { ...emptyManifest(), contractSha256: M.LEGACY_CONTRACT_SHA256, complete: true };
  for (const spec of M.targets().filter(item => !item.number || M.LEGACY_NUMBERS.includes(item.number))) {
    const item = native.put(spec.path, spec.templateId, spec.fields);
    manifest.items.push({ path: spec.path, kind: spec.kind, number: spec.number, itemId: item.itemId, complete: true });
  }
  return { native, manifest };
}

test("the original 01–15 contract and ownership marker remain unchanged", () => {
  assert.equal(M.LEGACY_CONTRACT_SHA256, "16ce77ace44a659afcba136a56bf388d42e7392c9460fbd1a000460ec97436d1");
  assert.equal(M.MARKER, "Liberty Mutual isolated authoring practice — numbered pages 01–15");
  assert.deepEqual(M.NUMBERS, require("../../examples/liberty-mutual-agent-portal/fixtures/manifest.json").reviewerPacks);
  assert.equal(legacyProvision().manifest.items.length, 136);
});

test("scoped 16–20 extension preserves all 136 recorded items and creates only 45 local items", async () => {
  const { native, manifest } = legacyProvision();
  const page = native.store.get(M.pagePath("15"));
  page.values.Title = "Keep participant-authored title";
  page.values.__Renderings = "<r>Participant-authored composition</r>";
  page.values["__Workflow state"] = M.idField(C.IDS.approved);
  page.version = 2;
  page.versions.push({ version: 2, language: { name: "en" } });
  native.put(page.path + "/Data/Participant addition", C.uid(C.TP + "/CampaignCallout"), { title: "Keep extra datasource" });
  const before = structuredClone([...native.store.entries()]);
  const beforeManifest = structuredClone(manifest);
  let persisted = 0;
  const preview = await run({ query: native.query, origin, manifest, numbers: ["16", "17", "18", "19", "20"], persist: () => { persisted++; } });
  assert.equal(preview.plans.filter(item => item.action === "create").length, 45);
  assert.equal(preview.plans.filter(item => item.action === "preserve-existing").length, 136);
  assert(preview.plans.filter(item => item.action === "create").every(item => ["16", "17", "18", "19", "20"].includes(item.number)));
  assert.equal(persisted, 0);
  assert.deepEqual(manifest, beforeManifest, "Read-only review does not migrate the manifest");
  assert.equal(native.writes.length, 0);
  const report = await run({ query: native.query, origin, apply: true, manifest, numbers: ["16", "17", "18", "19", "20"] });
  assert.equal(report.createdCount, 45);
  assert.equal(report.preservedCount, 136);
  assert.equal(report.itemCount, 181);
  assert.equal(native.writes.length, 45);
  for (const [path, item] of before) assert.deepEqual(native.store.get(path), item, path);
  assert.equal(manifest.contractSha256, M.CONTRACT_SHA256);
  assert.equal(manifest.events[0].phase, "contract-extended");
  assert.equal(manifest.events[0].previousContractSha256, M.LEGACY_CONTRACT_SHA256);
  assert.deepEqual(manifest.items.slice(0, 136), beforeManifest.items);
  assert.deepEqual(new Set(manifest.items.slice(136).map(item => item.number)), new Set(["16", "17", "18", "19", "20"]));
  const resumed = await run({ query: native.query, origin, apply: true, manifest, numbers: ["16", "17", "18", "19", "20"] });
  assert.equal(resumed.createdCount, 0);
  assert.equal(native.writes.length, 45, "The extension is idempotent");
});

test("scoped extensions cannot recreate a missing legacy item or use an unrecorded root", async () => {
  for (const removeRecord of [false, true]) {
    const { native, manifest } = legacyProvision();
    const missing = manifest.items.at(-1);
    native.store.delete(missing.path);
    if (removeRecord) manifest.items.pop();
    await assert.rejects(run({ query: native.query, origin, apply: true, manifest, numbers: ["16", "17", "18", "19", "20"] }), /disappeared|outside the selected/);
    assert.equal(native.writes.length, 0);
    assert.equal(manifest.contractSha256, M.LEGACY_CONTRACT_SHA256, "Failed inventory cannot migrate the manifest");
  }
  const native = fakeNative();
  await assert.rejects(run({ query: native.query, origin, apply: true, numbers: ["16", "17", "18", "19", "20"] }), /recorded native manifest/);
  assert.equal(native.writes.length, 0);
});

test("scoped extensions reject invalid selections and legacy manifests claiming newly added pages", async () => {
  const { native, manifest } = legacyProvision();
  for (const numbers of [[], ["16", "16"], ["21"], ["1"], ["01", "../resources"], "16,17"]) {
    await assert.rejects(run({ query: native.query, origin, apply: true, manifest, numbers }), /distinct practice numbers/);
  }
  const added = M.targets().find(item => item.number === "16");
  manifest.items.push({ path: added.path, kind: added.kind, number: added.number, itemId: C.uid(added.path), complete: true });
  assert.throws(() => validateManifest(manifest, origin), /unknown, duplicated or invalid/);
  assert.equal(native.writes.length, 0);
});

test("dry run inventories all 181 bounded targets without creating content or persisting a manifest", async () => {
  const native = fakeNative();
  let persisted = 0;
  const report = await run({ query: native.query, origin, persist: () => { persisted++; } });
  assert.equal(report.plans.length, 181);
  assert.equal(report.plans.filter(item => item.kind === "page").length, 20);
  assert(report.plans.every(item => item.action === "create"));
  assert(report.plans.every(item => item.path === M.ROOT_PATH || item.path.startsWith(M.ROOT_PATH + "/")));
  assert.equal(native.writes.length, 0);
  assert.equal(persisted, 0);
});

test("creation isolates twenty pages and their seven local datasources, with unique rendering UIDs and Draft workflows", async () => {
  const { native, report, manifest } = await provision();
  assert.equal(report.itemCount, 181);
  assert.equal(report.pages.length, 20);
  assert.equal(report.published, false);
  assert.equal(native.writes.length, 181);
  assert.equal(manifest.items.length, 181);
  assert(manifest.items.every(item => item.complete));
  assert.equal(new Set(manifest.items.map(item => C.norm(item.itemId))).size, 181);
  assert.equal(manifest.contractSha256, M.CONTRACT_SHA256);
  assert.deepEqual(new Set(manifest.items.map(item => item.path)), new Set(M.targets().map(item => item.path)));
  for (const item of manifest.items) assert.equal(native.store.get(item.path).values["__Never publish"], "1");
  const root = native.store.get(M.ROOT_PATH);
  assert.equal(M.FOLDER_TEMPLATE, "a87a00b1-e6db-45ab-8b54-636fec3b5523");
  assert.equal(root.template.templateId, C.norm(M.FOLDER_TEMPLATE));
  assert.deepEqual(Object.fromEntries(Object.entries(root.values).filter(([name]) => !["__Created", "__Revision"].includes(name))), {
    "__Display name": "Practice",
    "__Sortorder": "50",
    "__Never publish": "1",
    "__Short description": M.MARKER,
  });
  for (const name of ["Title", "NavigationTitle", "__Renderings", "__Final Renderings"]) assert.equal(Object.hasOwn(root.values, name), false, "The Practice folder must not become a routable page");
  assert.deepEqual(report.pages.map(page => page.number).sort(), Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, "0")));
  assert.equal(C.CONTENT["Campaign introduction"].eyebrow, "Agency growth", "Practice labels must not mutate shared campaign defaults");
  assert.equal(C.CONTENT["Campaign introduction"].title, "Build your next chapter in small business");
  assert.match(C.CONTENT["Campaign introduction"].summary, /your client knowledge and a clear/);

  const uids = new Set();
  const datasourceIds = new Set();
  for (const spec of M.targets().filter(item => item.kind === "page")) {
    const page = native.store.get(spec.path);
    assert.equal(page.values["__Display name"], "Practice " + spec.number);
    assert.equal(page.values.Title, "Practice " + spec.number);
    assert.equal(page.values.NavigationTitle, "Practice " + spec.number);
    assert.equal(page.values.__Workflow, M.idField(C.IDS.workflow));
    assert.equal(page.values["__Default workflow"], M.idField(C.IDS.workflow));
    assert.equal(page.values["__Workflow state"], M.idField(C.IDS.draft));
    const data = native.store.get(spec.path + "/Data");
    assert(data, "Each participant owns a Data folder beneath their page");
    const sources = [...native.store.values()].filter(item => item.path.startsWith(data.path + "/"));
    assert.equal(sources.length, 7);
    for (const source of sources) {
      assert(!datasourceIds.has(source.itemId), "Pages must not share datasource items");
      datasourceIds.add(source.itemId);
      assert.equal(source.values.__Workflow, M.idField(C.IDS.datasourceWorkflow));
      assert.equal(source.values["__Workflow state"], M.idField(C.IDS.datasourceDraft));
      assert(source.values.title?.trim(), "Each component starts with populated editable copy");
      for (const [name, content] of Object.entries(C.CONTENT[source.name])) {
        const key = source.name + "/" + name;
        if (key === "Campaign introduction/eyebrow") assert.equal(source.values[name], "Practice " + spec.number);
        else if (key === "Campaign introduction/summary") assert.equal(source.values[name], "Bring your team, your client knowledge, and a clear preparation plan together for your next small-business conversation.");
        else if (key === "Growth opportunity/body") assert.match(source.values[name], /the work, locations, and changes/);
        else if (key === "Start the conversation/body") assert.match(source.values[name], /the operation, risk locations, and business changes/);
        else if (key === "Prepare for review/body") assert.match(source.values[name], /location details, relevant experience, and any outstanding questions/);
        else assert.equal(source.values[name], content);
      }
    }
    const layout = page.values.__Renderings;
    const pageUids = [...layout.matchAll(/\buid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(pageUids.length, 8);
    for (const uid of pageUids) { assert(!uids.has(uid), "Rendering instance IDs must be unique across pages"); uids.add(uid); }
    const sourcesInLayout = [...layout.matchAll(/\bds="([^"]+)"/g)].map(match => match[1]);
    assert.equal(sourcesInLayout.length, 7);
    assert.deepEqual(new Set(sourcesInLayout), new Set(sources.map(item => "page:/Data/" + item.name)));
    assert.equal(page.version, 1);
  }
  assert.equal(datasourceIds.size, 140);
  assert.equal(uids.size, 160);
  assert(native.writes.every(write => write.input.database === "master" && write.input.language === "en"));
  assert(native.writes.every(write => !/publish|updateItem|deleteItem|addItemVersion/i.test(write.q)));
});

test("reruns preserve authored copy, layout, workflow, native versions, and additional author-created children without writes", async () => {
  const { native, manifest } = await provision();
  const pagePath = M.targets().find(item => item.kind === "page" && item.number === "03").path;
  const page = native.store.get(pagePath);
  page.values.Title = "Participant-authored title";
  page.values.__Renderings = "<r>Participant-authored composition</r>";
  page.values["__Workflow state"] = M.idField(C.IDS.approved);
  page.version = 2;
  page.versions.push({ version: 2, language: { name: "en" } });
  const source = native.store.get(pagePath + "/Data/" + C.instances[0].name);
  source.values.title = "Participant-authored component";
  source.values["__Workflow state"] = M.idField(C.IDS.datasourceApproved);
  source.version = 3;
  source.versions.push({ version: 2, language: { name: "en" } }, { version: 3, language: { name: "en" } });
  native.put(pagePath + "/Data/Participant addition", C.uid(C.TP + "/CampaignCallout"), { title: "Keep my work" });
  const before = structuredClone([...native.store.entries()]);
  native.writes.length = 0;
  await run({ query: native.query, origin, apply: true, manifest });
  assert.equal(native.writes.length, 0);
  assert.deepEqual([...native.store.entries()], before);
});

test("an unowned collision at the last target stops the entire apply before any writes", async () => {
  const native = fakeNative();
  const collision = M.targets().at(-1);
  native.put(collision.path, collision.templateId, { ...collision.fields, "__Short description": M.MARKER });
  await assert.rejects(run({ query: native.query, origin, apply: true }), /manifest|recorded|owned/i);
  assert.equal(native.writes.length, 0);
});

test("a recorded deleted item is not silently recreated, and identity changes block all writes", async t => {
  for (const change of ["deleted", "replacement ID", "wrong template"]) {
    await t.test(change, async () => {
      const { native, manifest } = await provision();
      const recorded = manifest.items.at(-1);
      if (change === "deleted") native.store.delete(recorded.path);
      else if (change === "replacement ID") native.store.get(recorded.path).itemId = C.uid("replacement-item");
      else native.store.get(recorded.path).template.templateId = C.norm(C.IDS.portalPage);
      native.writes.length = 0;
      await assert.rejects(run({ query: native.query, origin, apply: true, manifest }));
      assert.equal(native.writes.length, 0);
    });
  }
});

test("resume uses the persisted confirmed native ID after interrupted readback and preserves subsequent edits", async () => {
  const native = fakeNative();
  let manifest;
  native.interruptAfterNextCreate();
  await assert.rejects(run({ query: native.query, origin, apply: true, persist: state => { manifest = structuredClone(state); } }), /interrupted readback/);
  assert.equal(native.writes.length, 1);
  assert.equal(manifest.items.length, 1, "The confirmed ID must be persisted before readback");
  const recorded = manifest.items[0];
  assert.equal(recorded.complete, false);
  const existing = native.store.get(recorded.path);
  assert.equal(C.norm(recorded.itemId), existing.itemId);
  existing.values["__Display name"] = "Edited while provisioning was interrupted";
  existing.version = 2;
  existing.versions.push({ version: 2, language: { name: "en" } });
  const before = structuredClone(existing);
  const report = await run({ query: native.query, origin, apply: true, manifest, persist: state => { manifest = structuredClone(state); } });
  assert.equal(report.itemCount, 181);
  assert.equal(native.writes.length, 181, "Resuming creates only the remaining 180 items");
  assert.deepEqual(native.store.get(recorded.path), before);
  assert(manifest.items.every(item => item.complete));
});

test("an unknown create outcome cannot be retried by adopting or recreating an item without its confirmed ID", async () => {
  const native = fakeNative();
  let manifest;
  const interruptedQuery = async (q, variables) => {
    const result = await native.query(q, variables);
    if (q.includes("createItem(")) throw new Error("Native create outcome unconfirmed");
    return result;
  };
  await assert.rejects(run({ query: interruptedQuery, origin, apply: true, persist: state => { manifest = structuredClone(state); } }), /outcome unconfirmed/);
  assert.equal(native.writes.length, 1);
  assert.equal(manifest.items.length, 0, "An unconfirmed response cannot establish native item ownership");
  assert(native.store.has(M.ROOT_PATH), "The server may have created the item despite a lost response");
  const before = structuredClone([...native.store.entries()]);
  await assert.rejects(run({ query: native.query, origin, apply: true, manifest }), /manifest|recorded|owned/i);
  assert.equal(native.writes.length, 1, "Retry must stop without another mutation");
  assert.deepEqual([...native.store.entries()], before);
});

test("unsafe placeholder allowlists in either scope and shared rendering datasource rules fail preflight", async t => {
  const changes = [
    [C.PP + "/headless-campaign-main", "Allowed Controls", C.brace(C.uid(C.RP + "/CampaignContact"))],
    [C.SP + "/headless-campaign-main", "Allowed Controls", C.brace(C.uid(C.RP + "/CampaignContact"))],
    [C.RP + "/CampaignHero", "Datasource Template", C.TP + "/CampaignCallout"],
    [C.RP + "/CampaignHero", "Datasource Location", "query:/sitecore/content/Shared"],
  ];
  for (const [path, field, value] of changes) {
    await t.test(path + " / " + field, async () => {
      const native = fakeNative();
      native.store.get(path).values[field] = value;
      await assert.rejects(run({ query: native.query, origin, apply: true }));
      assert.equal(native.writes.length, 0);
    });
  }
});

test("all editable field definitions must be native versioned fields", async t => {
  for (const [path, field, value] of [
    [C.TP + "/CampaignHero/Content/title", "Shared", "1"],
    [C.TP + "/CampaignAlert/Content/body", "Unversioned", "1"],
    [C.TP + "/CampaignCallout/Content/body", "Shared", "false"],
    ["/templates/Title", "Unversioned", "1"],
  ]) {
    await t.test(path + " / " + field, async () => {
      const native = fakeNative();
      native.store.get(path).values[field] = value;
      await assert.rejects(run({ query: native.query, origin, apply: true }));
      assert.equal(native.writes.length, 0);
    });
  }
  const native = fakeNative();
  for (const item of native.store.values()) {
    if (item.template.templateId === C.norm(TEMPLATE.field)) Object.assign(item.values, { Shared: "0", Unversioned: "0" });
  }
  await preflight(native.query);
  assert.equal(native.writes.length, 0);
});

test("missing dependencies and changed Home, Folder, or campaign model identities stop before writes", async t => {
  for (const key of ["workflow", "draft", "datasourceWorkflow", "datasourceDraft"]) {
    await t.test("missing " + key, async () => {
      const native = fakeNative();
      const item = [...native.store.values()].find(entry => entry.itemId === C.norm(C.IDS[key]));
      native.store.delete(item.path);
      await assert.rejects(run({ query: native.query, origin, apply: true }));
      assert.equal(native.writes.length, 0);
    });
  }
  for (const change of ["missing Folder", "wrong Folder definition template", "wrong Folder path"]) {
    await t.test(change, async () => {
      const native = fakeNative();
      const folderPath = "/sitecore/templates/Common/Folder";
      if (change === "missing Folder") native.store.delete(folderPath);
      else if (change === "wrong Folder definition template") native.store.get(folderPath).template.templateId = C.norm(C.IDS.portalPage);
      else native.store.get(folderPath).path = "/sitecore/templates/Common/Unexpected folder";
      await assert.rejects(run({ query: native.query, origin, apply: true }));
      assert.equal(native.writes.length, 0);
    });
  }
  for (const path of [C.SITE + "/Home", "/sitecore/templates/Common/Folder", C.TP + "/CampaignPage", C.LP + "/CampaignLayout"]) {
    await t.test("changed ID at " + path, async () => {
      const native = fakeNative();
      native.store.get(path).itemId = C.norm(C.uid("replacement/" + path));
      await assert.rejects(run({ query: native.query, origin, apply: true }));
      assert.equal(native.writes.length, 0);
    });
  }
});

test("manifest validation rejects cross-environment, changed contracts, and unknown or duplicate inventory", () => {
  const target = M.targets()[0];
  const entry = { path: target.path, itemId: C.uid(target.path), kind: target.kind, complete: true };
  const valid = { ...emptyManifest(), items: [entry] };
  validateManifest(valid, origin);
  for (const invalid of [
    { ...valid, schemaVersion: 2 },
    { ...valid, origin: "https://other.sitecorecloud.io" },
    { ...valid, scope: C.SITE + "/Home" },
    { ...valid, contractSha256: "0".repeat(64) },
    { ...valid, items: [{ ...entry, path: C.SITE + "/Home/resources" }] },
    { ...valid, items: [{ ...entry, path: M.ROOT_PATH + "/../resources" }] },
    { ...valid, items: [entry, { ...entry }] },
    { ...valid, items: [{ ...entry, itemId: "not-a-native-id" }] },
    { ...valid, items: [entry, { ...entry, path: M.targets()[1].path, kind: M.targets()[1].kind, number: M.targets()[1].number }] },
  ]) assert.throws(() => validateManifest(invalid, origin));
});

test("compact native IDs are normalized without accepting malformed IDs", () => {
  assert.equal(M.idField("ae9e45caf1274abe9ca72ff109981998"), "{AE9E45CA-F127-4ABE-9CA7-2FF109981998}");
  for (const invalid of [
    "not-a-native-id",
    "{ae9e45ca-f127-4abe-9ca7-2ff109981998",
    "ae9e45ca-f127-4abe-9ca7-2ff109981998}",
    "{ae9e45caf1274abe9ca72ff109981998",
    "ae9e45caf1274abe9ca72ff109981998}",
    "{{ae9e45ca-f127-4abe-9ca7-2ff109981998}}",
  ]) {
    assert.equal(M.validId(invalid), false);
    assert.throws(() => M.idField(invalid));
  }
});
