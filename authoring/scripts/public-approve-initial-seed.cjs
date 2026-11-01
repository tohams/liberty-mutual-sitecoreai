#!/usr/bin/env node
"use strict";
/** Initial delivery content only. Native commands record workflow history.
 * ENV --snapshot /abs/before.json
 * ENV --baseline /abs/before.json --report /abs/plan.json
 * ENV --baseline /abs/before.json --report /abs/result.json --apply --journal /abs/journal.json
 * No publication, raw state writes, branch approvals, user changes, or impersonation.
 */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const {
  ROOT,
  connection,
  read,
  value,
  writePrivate,
} = require("./campaign-native-client.cjs");
const { SITE, semantic, digest, norm } = require("./public-native-state.cjs");
const W = require("./public-configure-editorial-workflow.cjs");
const PATHS = Object.freeze([
  SITE + "/Home",
  SITE + "/Home/Data/Hero",
  SITE + "/Home/Data/Introduction",
  SITE + "/Home/bundling",
  SITE + "/Home/bundling/Data/Hero",
  SITE + "/Home/bundling/Data/Introduction",
  SITE + "/Data/Promotions/Bundle and save",
  SITE + "/Data/Disclosures/Product availability notice",
  SITE + "/Presentation/Partial Designs/Header/Data/Header",
  SITE + "/Presentation/Partial Designs/Footer/Data/Footer",
]);
const MUTATION =
  "mutation($input:ExecuteWorkflowCommandInput!){executeWorkflowCommand(input:$input){successful completed nextStateId error message}}";
const QUERY =
  "query($where:WorkflowIdOrItemQueryInput!,$item:ItemQueryInput!){workflow(where:$where){workflowId commands(first:20,query:{item:$item}){nodes{commandId displayName}pageInfo{hasNextPage}}history(first:100,item:$item){nodes{date user oldState{stateId displayName}newState{stateId displayName}}pageInfo{hasNextPage}}}}";
function routeFor(state) {
  if (norm(state) === norm(W.IDS.draft))
    return {
      commandId: W.IDS.submit,
      nextStateId: W.IDS.awaiting,
      name: "Submit",
    };
  if (norm(state) === norm(W.IDS.awaiting))
    return {
      commandId: W.IDS.approve,
      nextStateId: W.IDS.approved,
      name: "Approve",
    };
  assert(
    norm(state) === norm(W.IDS.approved),
    "Initial delivery item is in an unexpected workflow state.",
  );
  return null;
}
function targets() {
  const model = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "authoring/items/liberty-mutual-public/public-contract.json",
      ),
      "utf8",
    ),
  );
  return PATHS.map((p) => {
    const row = model.records.find((r) => r.path === p);
    assert(
      row,
      "A delivery seed path is absent from the native source contract.",
    );
    return { path: p, id: row.id, template: row.template };
  });
}
async function details(query, item) {
  const where = {
    database: "master",
    itemId: item.itemId,
    language: "en",
    version: item.version,
  };
  const result = await query(QUERY, {
    where: { workflowId: W.IDS.workflow },
    item: where,
  });
  const workflow = result.workflow;
  assert(
    workflow &&
      norm(workflow.workflowId) === norm(W.IDS.workflow) &&
      workflow.commands?.pageInfo?.hasNextPage === false &&
      workflow.history?.pageInfo?.hasNextPage === false,
    "Native workflow command/history inventory is incomplete.",
  );
  return { commands: workflow.commands.nodes, history: workflow.history.nodes };
}
async function capture(query) {
  const { currentUser: actor } = await query(
    "query{currentUser{name isAdministrator}}",
  );
  assert(
    actor?.name && actor.isAdministrator === true,
    "Initial seed approval uses the verified existing administrator.",
  );
  const rows = [];
  for (const target of targets()) {
    const item = await read(query, { itemId: target.id });
    assert(
      item &&
        item.path === target.path &&
        norm(item.template.templateId) === norm(target.template),
      "Initial delivery seed identity/template changed.",
    );
    assert(
      item.language.name === "en" &&
        item.versions.length === 1 &&
        item.version === 1,
      "This one-time seed scope requires its single initial English version.",
    );
    assert(
      norm(value(item, "__Workflow")) === norm(W.IDS.workflow),
      "Complete public workflow setup before seed approval.",
    );
    routeFor(value(item, "__Workflow state"));
    rows.push({ target, item, ...(await details(query, item)) });
  }
  return { schemaVersion: 1, actor, rows };
}
function comparable(before) {
  return {
    ...before,
    rows: before.rows.map((row) => ({ ...row, item: semantic(row.item) })),
  };
}
function plan(before) {
  return {
    schemaVersion: 1,
    actor: before.actor,
    initialDeliveryItems: before.rows.map((row) => ({
      path: row.item.path,
      itemId: row.item.itemId,
      state: value(row.item, "__Workflow state"),
      commands:
        norm(value(row.item, "__Workflow state")) === norm(W.IDS.approved)
          ? []
          : norm(value(row.item, "__Workflow state")) === norm(W.IDS.awaiting)
            ? ["Approve"]
            : ["Submit", "Approve"],
    })),
    skipsAllBranchPrototypes: true,
    skipsTemporaryQaPages: true,
    publishes: false,
    changesRoleMembership: false,
    usesNativeCommands: true,
    provesNonAdminRoleSeparation: false,
  };
}
function verifyTransition(before, after, next, actor) {
  assert(
    before.itemId === after.itemId &&
      before.version === after.version &&
      norm(value(after, "__Workflow state")) === norm(next),
    "Native state transition readback was not confirmed.",
  );
  const copy = structuredClone(after);
  const restore = (name, v) => {
    const f = copy.fields.find((f) => f.name === name);
    assert(f, "Native field is missing.");
    f.value = v;
  };
  restore("__Workflow state", value(before, "__Workflow state"));
  if (value(before, "__Lock") !== value(after, "__Lock")) {
    assert(
      value(after, "__Lock").trim() === "" ||
        /^<r\s*\/>$/.test(value(after, "__Lock").trim()),
      "A workflow command changed an active lock unexpectedly.",
    );
    restore("__Lock", value(before, "__Lock"));
  }
  for (const field of W.nativeProvenanceChanges(before, after, actor))
    restore(field.name, field.before);
  assert.deepEqual(
    semantic(copy),
    semantic(before),
    "A native workflow action changed authored fields unexpectedly.",
  );
}
async function run({ query, before, apply = false, record = () => {} }) {
  assert.deepEqual(
    comparable(await capture(query)),
    comparable(before),
    "Delivery seed, workflow history, or actor changed after capture.",
  );
  if (!apply) return plan(before);
  const result = [];
  for (const row of before.rows) {
    let current = row.item,
      history = row.history;
    for (let step = 0; step < 2; step++) {
      const route = routeFor(value(current, "__Workflow state"));
      if (!route) break;
      const fresh = await read(query, {
        itemId: current.itemId,
        language: "en",
        version: current.version,
      });
      assert.deepEqual(
        semantic(fresh),
        semantic(current),
        "Seed changed before its native workflow command.",
      );
      const native = await details(query, fresh);
      assert(
        native.commands.some(
          (c) => norm(c.commandId) === norm(route.commandId),
        ),
        "Expected native command is not available to the current setup actor.",
      );
      const comments = `Initial public website readiness: ${route.name.toLowerCase()} approved seed content.`;
      record({
        phase: "native-command-intent",
        path: current.path,
        itemId: current.itemId,
        version: current.version,
        commandId: route.commandId,
        command: route.name,
        comments,
      });
      const response = await query(MUTATION, {
        input: {
          commandId: route.commandId,
          comments,
          item: {
            database: "master",
            itemId: current.itemId,
            language: "en",
            version: current.version,
          },
        },
      });
      const execution = response.executeWorkflowCommand;
      record({
        phase: "native-command-response",
        itemId: current.itemId,
        command: route.name,
        result: execution,
      });
      assert(
        execution?.successful === true &&
          execution.completed === true &&
          norm(execution.nextStateId) === norm(route.nextStateId),
        "Native workflow command did not confirm completion. Inspect the journal before retrying.",
      );
      const after = await read(query, {
        itemId: current.itemId,
        language: "en",
        version: current.version,
      });
      verifyTransition(current, after, route.nextStateId, before.actor.name);
      const updated = await details(query, after),
        seen = new Set(history.map(digest));
      const event = updated.history.find(
        (e) =>
          !seen.has(digest(e)) &&
          norm(e.oldState?.stateId) ===
            norm(value(current, "__Workflow state")) &&
          norm(e.newState?.stateId) === norm(route.nextStateId) &&
          e.user === before.actor.name,
      );
      assert(
        event,
        "Native workflow history did not confirm the expected transition/actor.",
      );
      record({
        phase: "native-command-history-verified",
        itemId: current.itemId,
        path: current.path,
        command: route.name,
        event,
      });
      current = after;
      history = updated.history;
    }
    assert(
      norm(value(current, "__Workflow state")) === norm(W.IDS.approved),
      "Seed item did not reach Approved.",
    );
    result.push({
      itemId: current.itemId,
      path: current.path,
      state: value(current, "__Workflow state"),
      history,
    });
  }
  return { ...plan(before), applied: true, rows: result };
}
async function main() {
  const args = process.argv.slice(2),
    environment = args.shift(),
    options = {};
  while (args.length) {
    const key = args.shift();
    assert(
      ["--snapshot", "--baseline", "--report", "--apply", "--journal"].includes(
        key,
      ) && !Object.hasOwn(options, key),
      "Invalid/repeated argument.",
    );
    options[key] = key === "--apply" ? true : args.shift();
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
      "Capture to a new private absolute snapshot.",
    );
    const before = await capture(api.query);
    writePrivate(options["--snapshot"], {
      origin: api.origin,
      capturedAt: new Date().toISOString(),
      before,
    });
    console.log(JSON.stringify(plan(before)));
    return;
  }
  const files = [
    options["--baseline"],
    options["--report"],
    ...(options["--journal"] ? [options["--journal"]] : []),
  ];
  assert(
    files.every(
      (f) =>
        path.isAbsolute(f || "") &&
        !path.resolve(f).startsWith(ROOT + path.sep),
    ) &&
      new Set(files.map((file) => path.resolve(file))).size === files.length &&
      !fs.existsSync(options["--report"]),
    "Use distinct private baseline and new report/journal paths.",
  );
  const baseline = JSON.parse(fs.readFileSync(options["--baseline"], "utf8"));
  assert(baseline.origin === api.origin, "Baseline environment changed.");
  let record = () => {};
  if (options["--apply"]) {
    assert(
      path.isAbsolute(options["--journal"] || "") &&
        !fs.existsSync(options["--journal"]),
      "Apply requires a new private journal.",
    );
    const journal = {
      schemaVersion: 1,
      origin: api.origin,
      baselineDigest: digest(baseline),
      events: [],
    };
    record = (e) => {
      journal.events.push({ at: new Date().toISOString(), ...e });
      writePrivate(options["--journal"], journal);
    };
  }
  const result = await run({
    query: api.query,
    before: baseline.before,
    apply: options["--apply"] === true,
    record,
  });
  writePrivate(options["--report"], result);
  console.log(
    JSON.stringify({
      applied: result.applied === true,
      count: result.initialDeliveryItems.length,
      published: false,
    }),
  );
}
module.exports = {
  PATHS,
  MUTATION,
  QUERY,
  targets,
  routeFor,
  details,
  capture,
  comparable,
  plan,
  verifyTransition,
  run,
};
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
