#!/usr/bin/env node
"use strict";
/** Create missing, editable campaigns. Never overwrites editorial content.
 * Review: ENVIRONMENT --snapshot /absolute/baseline.json
 * Apply: ENVIRONMENT --baseline /absolute/baseline.json --apply --journal /absolute/receipt.json
 * Model/blank branch must be installed first. No publishing or permission changes.
 */
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const M = require("./campaign-authoring-model.cjs");
const {
  connection,
  read,
  value,
  writePrivate,
} = require("./campaign-native-client.cjs");
const {
  SITE,
  TP,
  RP,
  BRANCH,
  GROWTH,
  PAGE,
  PRACTICE,
  IDS,
  F,
  COMPONENTS,
  instances,
  CONTENT,
  uid,
  brace,
  norm,
  layout,
  appendId,
} = M;
const digest = (x) =>
  crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
const desired = [];
desired.push({
  path: SITE + "/Presentation/Available Renderings/Campaign",
  parent: SITE + "/Presentation/Available Renderings",
  template: "76da0a8d-fc7e-42b2-af1e-205b49e43f98",
  fields: [
    {
      name: "Renderings",
      value: ["CampaignPage", ...Object.keys(COMPONENTS)]
        .map((c) => brace(uid(RP + "/" + c)))
        .join("|"),
    },
  ],
});
for (const [page, title, approved] of [
  [PAGE, "Small-business growth", true],
  [PRACTICE, "Campaign practice", false],
]) {
  desired.push({
    path: page,
    parent: GROWTH,
    template: uid(TP + "/CampaignPage"),
    fields: [
      { name: "Title", value: title },
      { name: "NavigationTitle", value: title },
      { name: "__Display name", value: title },
      { name: "__Renderings", value: layout(page) },
      { name: "__Workflow", value: brace(IDS.workflow) },
      {
        name: "__Workflow state",
        value: brace(approved ? IDS.approved : IDS.draft),
      },
    ],
  });
  desired.push({
    path: page + "/Data",
    parent: page,
    template: uid(TP + "/CampaignDataFolder"),
    fields: [],
  });
  for (const i of instances)
    desired.push({
      path: page + "/Data/" + i.name,
      parent: page + "/Data",
      template: uid(TP + "/" + i.component),
      fields: [
        ...Object.entries(CONTENT[i.name]).map(([name, value]) => ({
          name,
          value,
        })),
        { name: "__Workflow", value: brace(IDS.datasourceWorkflow) },
        {
          name: "__Workflow state",
          value: brace(approved ? IDS.datasourceApproved : IDS.datasourceDraft),
        },
      ],
    });
  if (approved)
    desired.push({
      path: page + "/Data/Personal lines growth opportunity",
      parent: page + "/Data",
      template: uid(TP + "/CampaignCallout"),
      fields: [
        { name: "eyebrow", value: "Build on the relationships you know" },
        { name: "title", value: "Build on your personal-lines relationships" },
        {
          name: "body",
          value:
            "<p>Your agency’s existing personal-lines relationships can be a starting point for thoughtful small-business conversations. Review which clients are business owners, understand their operations and risk locations, and bring suitable opportunities to your Liberty Mutual relationship team.</p><p>Use the preparation guide to organize the account facts before discussing availability and eligibility.</p>",
        },
        {
          name: "actionLink",
          value:
            '<link text="Plan a growth conversation" linktype="external" url="#growth-contact" />',
        },
        { name: "__Workflow", value: brace(IDS.datasourceWorkflow) },
        { name: "__Workflow state", value: brace(IDS.datasourceApproved) },
      ],
    });
}
function branchRule(current) {
  const own = M.rule();
  if (current.includes('uid="' + brace(uid(BRANCH + "/rule")) + '"')) {
    assert(
      current.includes(own),
      "Campaign branch rule differs; preserve author work.",
    );
    return current;
  }
  assert(
    !current || /<\/ruleset>\s*$/.test(current),
    "Unsupported native ruleset.",
  );
  return current
    ? current.replace(/<\/ruleset>\s*$/, own + "</ruleset>")
    : "<ruleset>" + own + "</ruleset>";
}
const configTargets = [
  {
    path: GROWTH,
    field: "__Masters",
    after: (current) => appendId(current, uid(BRANCH)),
  },
  {
    path: SITE + "/Presentation/Page Branches",
    field: "Rule",
    after: branchRule,
  },
];
function identity(item, spec) {
  assert(
    item &&
      item.path === spec.path &&
      norm(item.template.templateId) === norm(spec.template),
    "Existing campaign item identity/template differs.",
  );
}
async function capture(query, origin) {
  const existing = [];
  for (const spec of desired)
    existing.push({
      path: spec.path,
      item: await read(query, { path: spec.path }),
    });
  const config = [];
  for (const t of configTargets) {
    const item = await read(query, { path: t.path });
    assert(item, "Authoring parent missing.");
    config.push({
      path: t.path,
      field: t.field,
      item,
      before: value(item, t.field),
      after: t.after(value(item, t.field)),
    });
  }
  return {
    schemaVersion: 1,
    origin,
    at: new Date().toISOString(),
    desiredSha256: digest(desired),
    existing,
    config,
  };
}
function semantic(item) {
  return {
    ...item,
    fields: item.fields.filter(
      (f) =>
        ![
          "__Revision",
          "__Shared revision",
          "__Unversioned revision",
          "__Updated",
          "__Updated by",
        ].includes(f.name),
    ),
    revision: undefined,
    children: undefined,
  };
}
async function run(query, before, record) {
  assert(
    before.schemaVersion === 1 && before.desiredSha256 === digest(desired),
    "Wrong baseline/contract.",
  );
  for (const r of M.modelRecords().concat(M.branchRecords())) {
    const native = await read(query, { path: r.Path });
    assert(
      native &&
        norm(native.itemId) === norm(r.ID) &&
        norm(native.template.templateId) === norm(r.Template),
      "Install the reviewed campaign model and blank branch first.",
    );
  }
  const created = [];
  for (const spec of desired) {
    let item = await read(query, { path: spec.path });
    const baseline = before.existing.find((x) => x.path === spec.path);
    assert(baseline, "Missing reviewed seed path.");
    if (item) {
      identity(item, spec);
      if (baseline.item) {
        assert.equal(
          digest(semantic(item)),
          digest(semantic(baseline.item)),
          "Existing item changed; capture a new baseline.",
        );
        created.push({
          path: item.path,
          itemId: item.itemId,
          status: "existing-preserved",
        });
        continue;
      }
      // Resume only an exact previously created seed; never overwrite changes.
      assert(
        item.versions.length === 1 &&
          spec.fields.every((f) => value(item, f.name) === f.value),
        "Existing item diverged from this create-only seed.",
      );
      created.push({
        path: item.path,
        itemId: item.itemId,
        status: "existing-exact-seed",
      });
      continue;
    }
    assert(
      !baseline.item,
      "A preexisting item was removed; do not recreate it.",
    );
    const parent = await read(query, { path: spec.parent });
    assert(parent, "Seed parent missing.");
    record({
      phase: "create-intent",
      path: spec.path,
      template: spec.template,
    });
    const result = await query(
      "mutation($input:CreateItemInput!){createItem(input:$input){item{itemId}}}",
      {
        input: {
          database: "master",
          language: "en",
          parent: parent.itemId,
          templateId: spec.template,
          name: spec.path.split("/").at(-1),
          fields: [...spec.fields, { name: "__Created", value: M.CREATED }],
        },
      },
    );
    assert(result.createItem?.item?.itemId, "Creation not confirmed.");
    item = await read(query, { itemId: result.createItem.item.itemId });
    identity(item, spec);
    assert(
      spec.fields.every((f) => value(item, f.name) === f.value),
      "Created fields differ; stop and read back.",
    );
    created.push({ path: item.path, itemId: item.itemId, status: "created" });
    record({ phase: "create-verified", path: item.path, itemId: item.itemId });
  }
  for (const t of configTargets) {
    const b = before.config.find((c) => c.path === t.path);
    const item = await read(query, { path: t.path });
    assert(
      item && norm(item.itemId) === norm(b.item.itemId),
      "Configuration identity differs.",
    );
    const current = value(item, t.field);
    assert(
      [b.before, b.after].includes(current),
      "Authoring configuration changed outside the reviewed plan.",
    );
    const compare = structuredClone(item);
    compare.fields.find((f) => f.name === t.field).value = b.before;
    assert.deepEqual(
      semantic(compare),
      semantic(b.item),
      "Protected authoring fields changed.",
    );
    if (current === b.after) continue;
    record({
      phase: "config-intent",
      path: t.path,
      field: t.field,
      before: b.before,
      after: b.after,
    });
    await query(
      "mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}",
      {
        input: {
          database: "master",
          itemId: item.itemId,
          language: "en",
          version: item.version,
          fields: [
            { name: t.field, value: b.after },
            { name: "__Created", value: value(item, "__Created") },
          ],
        },
      },
    );
    const final = await read(query, { path: t.path });
    assert.equal(value(final, t.field), b.after);
    record({ phase: "config-verified", path: t.path, field: t.field });
  }
  return {
    at: new Date().toISOString(),
    created,
    defaultCalloutUid: uid(PAGE + "/rendering/Growth opportunity"),
    livePage: created.find((x) => x.path === PAGE),
    practicePage: created.find((x) => x.path === PRACTICE),
    defaultCallout: created.find(
      (x) => x.path === PAGE + "/Data/Growth opportunity",
    ),
    personalizedCallout: created.find(
      (x) => x.path === PAGE + "/Data/Personal lines growth opportunity",
    ),
    published: false,
  };
}
async function main() {
  const [environment, ...args] = process.argv.slice(2);
  assert(environment, "Specify CLI environment.");
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") opts.apply = true;
    else {
      assert(
        ["--snapshot", "--baseline", "--journal"].includes(args[i]) &&
          args[i + 1],
      );
      opts[args[i].slice(2)] = args[++i];
    }
  }
  const c = connection(environment, !!opts.apply);
  if (opts.snapshot) {
    assert(!opts.apply && !opts.baseline);
    writePrivate(opts.snapshot, await capture(c.query, c.origin));
    console.log("Captured create-only campaign baseline.");
    return;
  }
  assert(opts.baseline);
  const before = JSON.parse(fs.readFileSync(opts.baseline, "utf8"));
  assert(before.origin === c.origin);
  if (!opts.apply) {
    console.log(
      JSON.stringify(
        {
          mode: "review",
          newPaths: before.existing.filter((x) => !x.item).map((x) => x.path),
          preserved: before.existing.filter((x) => x.item).map((x) => x.path),
          configuration: before.config.map((x) => ({
            path: x.path,
            field: x.field,
            before: x.before,
            after: x.after,
          })),
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
  );
  const record = (event) => {
    journal.events.push({ at: new Date().toISOString(), ...event });
    writePrivate(opts.journal, journal);
  };
  journal.result = await run(c.query, before, record);
  writePrivate(opts.journal, journal);
  console.log(JSON.stringify(journal.result, null, 2));
}
module.exports = { desired, branchRule, capture, run, main };
if (require.main === module)
  main().catch((e) => {
    console.error("Campaign seed: " + e.message);
    process.exitCode = 1;
  });
