#!/usr/bin/env node
"use strict";
/** Bind one activated native Form to Support. No publish, workflow, or version changes.
 * ENV --form-id ID --snapshot /absolute/baseline.json
 * ENV --baseline /absolute/baseline.json [--apply --journal /absolute/receipt.json]
 * Install LibertyMutual.SupportForm first; snapshots/journals stay outside Git.
 * Authoring has no atomic compare-and-swap; coordinate editing during apply.
 */
const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const M = require("./support-native-form-model.cjs");
const {
  connection,
  read,
  value,
  writePrivate,
} = require("./campaign-native-client.cjs");
const { xmlShape } = require("./portal-placeholder-layouts.cjs");
const norm = (value) =>
  String(value || "")
    .replace(/[{}-]/g, "")
    .toLowerCase();
const digest = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const metadata = new Set([
  "__Revision",
  "__Shared revision",
  "__Unversioned revision",
  "__Updated",
  "__Updated by",
]);
const attr = (node, key) => node.attrs[key] ?? node.attrs["{s}" + key];
function formId(value) {
  assert(
    typeof value === "string" && /^[a-f\d]{32}-[a-z]{2,8}$/.test(value),
    "Expected the native Forms ID, including its region suffix.",
  );
  return value;
}
function pageIdentity(item) {
  assert(
    item &&
      item.path === M.SUPPORT &&
      norm(item.itemId) === norm(M.SUPPORT_ID) &&
      norm(item.template.templateId) === norm(M.IDS.portalPage),
    "Only the existing Support page is supported.",
  );
  assert(
    item.language.name === "en" &&
      item.versions.length === 1 &&
      item.versions[0].language.name === "en" &&
      item.versions[0].version === item.version,
    "Support language/version inventory changed; review manually.",
  );
  assert(
    /^\d{8}T\d{6}Z$/.test(value(item, "__Created")),
    "Preserve the existing creation timestamp.",
  );
}
function transform(shared, final, nativeFormId) {
  formId(nativeFormId);
  const shape = xmlShape(shared);
  assert(shape?.children.length === 1, "Expected one default device.");
  const device = shape.children[0];
  assert(
    device.tag === "d" && norm(attr(device, "id")) === norm(M.IDS.device),
    "Only the default device is supported.",
  );
  const currentLayout = attr(device, "l");
  assert(
    [M.ORIGINAL_LAYOUT, M.uid(M.LAYOUT)]
      .map(norm)
      .includes(norm(currentLayout)),
    "Support has an unexpected layout.",
  );
  const finalShape = xmlShape(final);
  if (finalShape) {
    assert(
      finalShape.children.length === 1 &&
        finalShape.children[0].tag === "d" &&
        norm(attr(finalShape.children[0], "id")) === norm(M.IDS.device),
      "Unexpected final device.",
    );
    assert(
      attr(finalShape.children[0], "l") === undefined,
      "Final layout overrides the Support layout; review manually.",
    );
    assert(
      !JSON.stringify(finalShape).toLowerCase().includes(norm(M.FORM_UID)) &&
        !new RegExp(M.KEY, "i").test(final),
      "Final presentation overrides the native form slot.",
    );
    assert(
      !final.replace(/[{}-]/g, "").toLowerCase().includes(norm(M.FORM_UID)),
      "Native Form has final overrides; preserve and review.",
    );
  }
  const forms = device.children.filter(
    (node) =>
      norm(attr(node, "id")) === norm(M.FORM) ||
      attr(node, "ph") === M.KEY ||
      norm(attr(node, "uid")) === norm(M.FORM_UID),
  );
  const params =
    "FormId=" + nativeFormId + "&RenderingIdentifier=contact-your-team-form";
  assert(
    forms.length <= 1,
    "Multiple native Form instances or placeholder conflicts.",
  );
  if (forms.length) {
    const existing = forms[0];
    assert(
      norm(attr(existing, "id")) === norm(M.FORM) &&
        norm(attr(existing, "uid")) === norm(M.FORM_UID) &&
        attr(existing, "ph") === M.KEY &&
        attr(existing, "par") === params,
      "An existing form differs; preserve author changes.",
    );
  }
  let changed = false;
  let result = shared.replace(/<d\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/, (tag) =>
    tag.replace(
      /\b(l|s:l)(\s*=\s*)(["'])(.*?)\3/,
      (all, name, eq, quote, id) => {
        assert(norm(id) === norm(currentLayout));
        changed = true;
        return name + eq + quote + M.brace(M.uid(M.LAYOUT)) + quote;
      },
    ),
  );
  assert(changed, "Missing Support layout attribute.");
  if (!forms.length) {
    const rendering =
      '<r uid="' +
      M.brace(M.FORM_UID) +
      '" id="' +
      M.brace(M.FORM) +
      '" ph="' +
      M.KEY +
      '" par="' +
      params.replace(/&/g, "&amp;") +
      '" />';
    assert(
      (result.match(/<\/d>/g) || []).length === 1,
      "Unsupported empty/default device markup.",
    );
    result = result.replace("</d>", rendering + "</d>");
  }
  const after = xmlShape(result);
  const unchanged = structuredClone(after);
  unchanged.children[0].attrs = device.attrs;
  if (!forms.length) unchanged.children[0].children.pop();
  assert.deepEqual(unchanged, shape, "Unrelated presentation changed.");
  return result;
}
function semantic(item) {
  return {
    ...item,
    revision: undefined,
    fields: item.fields.filter((f) => !metadata.has(f.name)),
    children: undefined,
  };
}
function assertSupportUnchanged(current, baseline, after) {
  pageIdentity(current);
  assert(
    [value(baseline, "__Renderings"), after].includes(
      value(current, "__Renderings"),
    ),
    "Support presentation changed after review.",
  );
  const compare = structuredClone(current);
  compare.fields.find((f) => f.name === "__Renderings").value = value(
    baseline,
    "__Renderings",
  );
  assert.deepEqual(
    semantic(compare),
    semantic(baseline),
    "Support content, final presentation, workflow, or versions changed after review.",
  );
}
async function assertModel(query) {
  for (const record of M.modelRecords()) {
    const item = await read(query, { path: record.Path });
    assert(
      item &&
        norm(item.itemId) === norm(record.ID) &&
        norm(item.template.templateId) === norm(record.Template),
      "Install the exact LibertyMutual.SupportForm model first.",
    );
    assert(
      record.SharedFields.every((f) => value(item, f.Hint) === f.Value),
      "Support Form layout/placeholder permissions differ from the reviewed model.",
    );
  }
  const native = await read(query, { itemId: M.FORM });
  assert(
    native &&
      native.name === "Form" &&
      native.path.startsWith("/sitecore/layout/Renderings/Feature/"),
    "Native Sitecore Form rendering is missing.",
  );
}
function availableIdentity(item) {
  assert(
    item.path === M.AVAILABLE &&
      norm(item.template.templateId) === "76da0a8dfc7e42b2af1e205b49e43f98" &&
      value(item, "Renderings") === M.brace(M.FORM),
    "Existing Forms group differs; preserve author changes.",
  );
}
async function capture(query, origin, nativeFormId) {
  formId(nativeFormId);
  await assertModel(query);
  const support = await read(query, { itemId: M.SUPPORT_ID });
  pageIdentity(support);
  const available = await read(query, { path: M.AVAILABLE });
  if (available) availableIdentity(available);
  const after = transform(
    value(support, "__Renderings"),
    value(support, "__Final Renderings"),
    nativeFormId,
  );
  return {
    schemaVersion: 1,
    at: new Date().toISOString(),
    origin,
    formId: nativeFormId,
    support,
    available,
    after,
  };
}
async function run(query, before, record) {
  assert(before.schemaVersion === 1);
  assert.equal(
    before.after,
    transform(
      value(before.support, "__Renderings"),
      value(before.support, "__Final Renderings"),
      before.formId,
    ),
    "Baseline contract changed.",
  );
  pageIdentity(before.support);
  await assertModel(query);
  const current = await read(query, { itemId: M.SUPPORT_ID });
  assertSupportUnchanged(current, before.support, before.after);
  let available = await read(query, { path: M.AVAILABLE });
  if (available) {
    availableIdentity(available);
    if (before.available)
      assert.deepEqual(
        semantic(available),
        semantic(before.available),
        "Available Renderings changed since review.",
      );
  } else {
    assert(!before.available, "Existing Forms group was removed.");
    const parent = await read(query, {
      path: M.SITE + "/Presentation/Available Renderings",
    });
    assert(
      parent && norm(parent.itemId) === norm(M.IDS.availableRoot),
      "Available Renderings parent differs.",
    );
    record({ phase: "create-intent", path: M.AVAILABLE });
    await query(
      "mutation($input:CreateItemInput!){createItem(input:$input){item{itemId}}}",
      {
        input: {
          database: "master",
          language: "en",
          name: "Forms",
          parent: parent.itemId,
          templateId: "76da0a8d-fc7e-42b2-af1e-205b49e43f98",
          fields: [
            { name: "Renderings", value: M.brace(M.FORM) },
            { name: "__Created", value: "20260916T160000Z" },
          ],
        },
      },
    );
    available = await read(query, { path: M.AVAILABLE });
    assert(available, "Creation not confirmed; read back before retry.");
    availableIdentity(available);
    record({
      phase: "create-verified",
      path: M.AVAILABLE,
      itemId: available.itemId,
    });
  }
  const latest = await read(query, { itemId: M.SUPPORT_ID });
  assertSupportUnchanged(latest, before.support, before.after);
  if (value(latest, "__Renderings") !== before.after) {
    record({
      phase: "support-layout-intent",
      itemId: M.SUPPORT_ID,
      revision: latest.revision.value,
      before: value(latest, "__Renderings"),
      after: before.after,
    });
    await query(
      "mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}",
      {
        input: {
          database: "master",
          language: "en",
          itemId: M.SUPPORT_ID,
          version: latest.version,
          fields: [
            { name: "__Renderings", value: before.after },
            { name: "__Created", value: value(latest, "__Created") },
          ],
        },
      },
    );
  }
  const final = await read(query, { itemId: M.SUPPORT_ID });
  assertSupportUnchanged(final, before.support, before.after);
  assert.equal(
    value(final, "__Renderings"),
    before.after,
    "Native form binding was not confirmed.",
  );
  const result = {
    path: M.SUPPORT,
    formId: before.formId,
    layoutId: M.uid(M.LAYOUT),
    renderingUid: M.FORM_UID,
    formRenderingId: M.FORM,
    published: false,
    version: final.version,
  };
  record({ phase: "support-layout-verified", ...result });
  return result;
}
async function main() {
  const [environment, ...args] = process.argv.slice(2);
  assert(environment, "Specify CLI environment.");
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") opts.apply = true;
    else {
      assert(
        ["--snapshot", "--baseline", "--journal", "--form-id"].includes(
          args[i],
        ) && args[i + 1],
      );
      opts[args[i].slice(2)] = args[++i];
    }
  }
  const c = connection(environment, !!opts.apply);
  if (opts.snapshot) {
    assert(!opts.apply && !opts.baseline && opts["form-id"]);
    writePrivate(
      opts.snapshot,
      await capture(c.query, c.origin, opts["form-id"]),
    );
    console.log("Captured Support-only native Form binding. No native writes.");
    return;
  }
  assert(opts.baseline && !opts["form-id"]);
  const before = JSON.parse(fs.readFileSync(opts.baseline, "utf8"));
  assert(
    before.origin === c.origin,
    "Baseline belongs to another environment.",
  );
  if (!opts.apply) {
    console.log(
      JSON.stringify(
        {
          path: M.SUPPORT,
          formId: before.formId,
          availableRenderingsAction: before.available
            ? "preserve"
            : "create-Forms-group",
          before: value(before.support, "__Renderings"),
          after: before.after,
          published: false,
        },
        null,
        2,
      ),
    );
    return;
  }
  assert(opts.journal);
  const journal = fs.existsSync(opts.journal)
    ? JSON.parse(fs.readFileSync(opts.journal, "utf8"))
    : {
        schemaVersion: 1,
        origin: c.origin,
        baselineSha256: digest(before),
        events: [],
      };
  assert(
    journal.origin === c.origin && journal.baselineSha256 === digest(before),
    "Receipt belongs to another operation.",
  );
  const record = (event) => {
    journal.events.push({ at: new Date().toISOString(), ...event });
    writePrivate(opts.journal, journal);
  };
  journal.result = await run(c.query, before, record);
  writePrivate(opts.journal, journal);
  console.log(JSON.stringify(journal.result));
}
module.exports = {
  formId,
  transform,
  pageIdentity,
  semantic,
  assertSupportUnchanged,
  capture,
  run,
};
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
