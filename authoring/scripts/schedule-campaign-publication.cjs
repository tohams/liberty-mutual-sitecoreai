#!/usr/bin/env node
"use strict";
/** Bounded, operator-run scheduling proof. Not a recurring scheduler/service.
 * Preview: ENV --prepare --starts-at ISO_UTC --ends-at ISO_UTC
 * Prepare: same arguments + --apply --journal /absolute/private.json
 * Run: ENV --run --apply --journal /absolute/private.json
 * Only /Home/growth/campaign-schedule-check and its own Data are writable.
 * Existing items are never overwritten/recreated. A new proof uses a new
 * environment or an explicitly reviewed cleanup, not an automatic reset.
 */
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const M = require("./campaign-authoring-model.cjs");
const {
  connection,
  read,
  value,
  writePrivate,
} = require("./campaign-native-client.cjs");
const SCHEDULE_PATH = M.GROWTH + "/campaign-schedule-check";
const isoDate = (x) => new Date(x).toISOString();
function scheduleWindow(start, end, now = Date.now()) {
  assert(
    typeof start === "string" &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(start),
    "Start must be an explicit UTC ISO timestamp.",
  );
  assert(
    typeof end === "string" &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(end),
    "End must be an explicit UTC ISO timestamp.",
  );
  const startsAt = Date.parse(start),
    endsAt = Date.parse(end);
  assert(
    Number.isFinite(startsAt) && Number.isFinite(endsAt),
    "Invalid schedule dates.",
  );
  assert(
    startsAt >= now + 10000,
    "Start must be at least ten seconds in the future.",
  );
  assert(
    endsAt - startsAt >= 90000,
    "Allow at least 90 seconds for delivery/cache verification.",
  );
  assert(
    endsAt - now <= 15 * 60000,
    "This bounded proof supports only the next fifteen minutes.",
  );
  const native = (x) =>
    isoDate(x)
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  return {
    startsAt: isoDate(startsAt),
    endsAt: isoDate(endsAt),
    nativeStart: native(startsAt),
    nativeEnd: native(endsAt),
  };
}
function specs(window) {
  const boundary = [
    { name: "__Valid from", value: window.nativeStart },
    { name: "__Valid to", value: window.nativeEnd },
  ];
  const page = {
    path: SCHEDULE_PATH,
    parent: M.GROWTH,
    template: M.uid(M.TP + "/CampaignPage"),
    fields: [
      { name: "Title", value: "Scheduled campaign preview" },
      { name: "NavigationTitle", value: "Scheduled campaign preview" },
      { name: "__Display name", value: "Scheduled campaign preview" },
      { name: "__Renderings", value: M.layout(SCHEDULE_PATH) },
      { name: "__Workflow", value: M.brace(M.IDS.workflow) },
      { name: "__Workflow state", value: M.brace(M.IDS.approved) },
      ...boundary,
    ],
  };
  return [
    page,
    {
      path: SCHEDULE_PATH + "/Data",
      parent: SCHEDULE_PATH,
      template: M.uid(M.TP + "/CampaignDataFolder"),
      fields: [...boundary],
    },
    ...M.instances.map((i) => ({
      path: SCHEDULE_PATH + "/Data/" + i.name,
      parent: SCHEDULE_PATH + "/Data",
      template: M.uid(M.TP + "/" + i.component),
      fields: [
        ...Object.entries(M.CONTENT[i.name]).map(([name, value]) => ({
          name,
          value,
        })),
        { name: "__Workflow", value: M.brace(M.IDS.datasourceWorkflow) },
        { name: "__Workflow state", value: M.brace(M.IDS.datasourceApproved) },
        ...boundary,
      ],
    })),
  ];
}
function assertScope(item) {
  assert(
    item.path === SCHEDULE_PATH ||
      item.path.startsWith(SCHEDULE_PATH + "/Data/"),
    "Only the dedicated scheduling proof is allowed.",
  );
}
async function prepare(query, origin, window, journal, save) {
  const desired = specs(window);
  assert(
    !(await read(query, { path: SCHEDULE_PATH })),
    "Scheduling proof already exists. Preserve it; do not silently reset authored content.",
  );
  const growth = await read(query, { path: M.GROWTH });
  assert(growth && M.norm(growth.itemId) === M.norm(M.IDS.growth));
  journal.origin = origin;
  journal.window = window;
  journal.phase = "preparing";
  journal.items = [];
  save();
  for (const spec of desired) {
    const parent = await read(query, { path: spec.parent });
    assert(parent, "Scheduling parent missing.");
    journal.pendingCreate = spec.path;
    save();
    const r = await query(
      "mutation($input:CreateItemInput!){createItem(input:$input){item{itemId}}}",
      {
        input: {
          database: "master",
          language: "en",
          parent: parent.itemId,
          templateId: spec.template,
          name: spec.path.split("/").at(-1),
          fields: spec.fields,
        },
      },
    );
    assert(r.createItem?.item?.itemId);
    const item = await read(query, { itemId: r.createItem.item.itemId });
    assert(
      item &&
        item.path === spec.path &&
        M.norm(item.template.templateId) === M.norm(spec.template),
    );
    assert(
      spec.fields.every((f) => value(item, f.name) === f.value),
      "Prepared schedule fields differ.",
    );
    journal.items.push({
      path: item.path,
      itemId: item.itemId,
      template: spec.template,
      fields: spec.fields,
    });
    delete journal.pendingCreate;
    save();
  }
  journal.phase = "prepared";
  journal.preparedAt = new Date().toISOString();
  save();
  return journal;
}
async function verify(query, journal) {
  assert(
    journal.items?.length === 9 && journal.items[0].path === SCHEDULE_PATH,
    "Wrong scheduling receipt.",
  );
  for (const spec of journal.items) {
    assert(
      spec.path === SCHEDULE_PATH ||
        spec.path === SCHEDULE_PATH + "/Data" ||
        spec.path.startsWith(SCHEDULE_PATH + "/Data/"),
      "Out-of-scope receipt.",
    );
    const item = await read(query, { path: spec.path });
    assert(
      item &&
        M.norm(item.itemId) === M.norm(spec.itemId) &&
        M.norm(item.template.templateId) === M.norm(spec.template),
      "Scheduling identity changed.",
    );
    assert(
      item.versions.length === 1 && item.version === 1,
      "Additional versions require a new reviewed schedule.",
    );
    assert(
      spec.fields.every((f) => value(item, f.name) === f.value),
      "Scheduled content changed; review before publishing.",
    );
    // publishSubItems includes every descendant, so reject additions as well
    // as changed fields. The recorded nine-item inventory is the whole scope.
    const identity = (child) => `${M.norm(child.itemId)}:${child.path}`;
    const expectedChildren = journal.items
      .filter(
        (child) =>
          child.path.slice(0, child.path.lastIndexOf("/")) === spec.path,
      )
      .map(identity)
      .sort();
    const actualChildren = item.children.map(identity).sort();
    assert.deepEqual(
      actualChildren,
      expectedChildren,
      "Scheduled child inventory changed; review before publishing.",
    );
  }
}
async function executeBoundary(query, journal, key, save) {
  await verify(query, journal);
  journal.operations ??= {};
  let operation = journal.operations[key];
  if (operation?.complete) return;
  if (!operation) {
    const targets = (
      await query(
        "query{publishingTargets{name targetDatabase previewPublishingTarget}}",
      )
    ).publishingTargets;
    const target = targets.find(
      (t) => t.name === "Edge" && !t.previewPublishingTarget,
    );
    assert(target, "Expected Edge target missing.");
    operation = journal.operations[key] = {
      at: new Date().toISOString(),
      status: "submitting",
      input: {
        displayName: "Liberty Mutual campaign schedule " + key,
        languages: ["en"],
        publishItemMode: "SMART",
        publishRelatedItems: false,
        publishSubItems: true,
        rootItemId: journal.items[0].itemId,
        sourceDatabase: "master",
        targetDatabases: [target.targetDatabase],
      },
    };
    save();
    const response = await query(
      "mutation($input:PublishItemInput!){publishItem(input:$input){operationId}}",
      { input: operation.input },
    );
    assert(
      response.publishItem?.operationId,
      "No publishing operation was confirmed.",
    );
    operation.operationId = response.publishItem.operationId;
    operation.status = "accepted";
    save();
  }
  assert(
    operation.operationId,
    "Prior publication response was uncertain; inspect native publishing history before retrying.",
  );
  for (let n = 0; n < 30; n++) {
    const status = (
      await query(
        "query($id:String!){publishingStatus(publishingOperationId:$id){isDone isFailed processed state}}",
        { id: operation.operationId },
      )
    ).publishingStatus;
    operation.lastStatus = { at: new Date().toISOString(), ...status };
    save();
    assert(!status.isFailed, "Native publishing failed.");
    if (status.isDone) {
      operation.complete = true;
      operation.status = "completed";
      save();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw Error("Publishing still processing; resume with the same journal.");
}
async function run(query, journal, save) {
  assert(
    ["prepared", "running", "completed"].includes(journal.phase),
    "Prepare a complete schedule before running.",
  );
  if (journal.phase === "completed") return;
  assert(
    Date.now() <= Date.parse(journal.window.endsAt) + 5 * 60000,
    "The proof window is too old. Review native state before retrying.",
  );
  journal.phase = "running";
  save();
  for (const [key, time] of [
    ["publish", journal.window.startsAt],
    ["expire", journal.window.endsAt],
  ]) {
    if (journal.operations?.[key]?.complete) continue;
    while (Date.now() < Date.parse(time))
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(15000, Date.parse(time) - Date.now())),
      );
    await executeBoundary(query, journal, key, save);
    console.log(
      key +
        " publishing operation finished; verify Experience Edge and the deployed route separately.",
    );
  }
  journal.phase = "completed";
  journal.completedAt = new Date().toISOString();
  save();
}
async function main() {
  const [environment, ...args] = process.argv.slice(2);
  const options = {};
  for (let n = 0; n < args.length; n++) {
    const flag = args[n];
    if (["--apply", "--prepare", "--run"].includes(flag))
      options[flag.slice(2)] = true;
    else {
      assert(
        ["--starts-at", "--ends-at", "--journal"].includes(flag) && args[n + 1],
      );
      options[flag.slice(2)] = args[++n];
    }
  }
  assert(
    environment && !!options.prepare !== !!options.run,
    "Choose --prepare or --run.",
  );
  if (options.prepare && !options.apply) {
    const window = scheduleWindow(options["starts-at"], options["ends-at"]);
    console.log(
      JSON.stringify(
        {
          mode: "review",
          window,
          items: specs(window).map((s) => s.path),
          automation:
            "Operator-run process; no permanent recurring schedule is installed.",
        },
        null,
        2,
      ),
    );
    return;
  }
  assert(
    options.apply && options.journal,
    "Apply requires a private absolute journal.",
  );
  const c = connection(environment, true);
  if (options.prepare) {
    assert(!fs.existsSync(options.journal), "Choose a new journal path.");
    const journal = { schemaVersion: 1, environment };
    const save = () => writePrivate(options.journal, journal);
    await prepare(
      c.query,
      c.origin,
      scheduleWindow(options["starts-at"], options["ends-at"]),
      journal,
      save,
    );
    console.log(
      "Prepared dedicated scheduled campaign. Run with the same journal; no content has been published yet.",
    );
  } else {
    const journal = JSON.parse(fs.readFileSync(options.journal, "utf8"));
    assert(
      journal.schemaVersion === 1 &&
        journal.origin === c.origin &&
        journal.environment === environment,
      "Receipt belongs to another environment.",
    );
    await run(c.query, journal, () => writePrivate(options.journal, journal));
  }
}
module.exports = {
  SCHEDULE_PATH,
  scheduleWindow,
  specs,
  assertScope,
  prepare,
  verify,
  executeBoundary,
  run,
  main,
};
if (require.main === module)
  main().catch((e) => {
    console.error("Campaign scheduling: " + e.message);
    process.exitCode = 1;
  });
