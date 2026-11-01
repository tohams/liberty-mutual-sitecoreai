#!/usr/bin/env node
"use strict";
/** Bounded native approval of Header/Footer English version 2 only.
 * Keeps Approved v1 unchanged. The native new-version history entry has no old
 * state; use its supported cursor to read full subsequent transition history.
 * ENV --snapshot /abs/before.json
 * ENV --baseline /abs/before.json --report /abs/plan.json
 * ENV --baseline /abs/before.json --report /abs/result.json --apply --journal /abs/journal.json
 * Never publishes, writes raw workflow states, or changes editorial values.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT,
  connection,
  read,
  value,
  writePrivate,
} = require("./campaign-native-client.cjs");
const { semantic, digest, norm } = require("./public-native-state.cjs");
const W = require("./public-configure-editorial-workflow.cjs");
const N = require("./public-approve-initial-seed.cjs");
const TARGETS = Object.freeze(
  N.targets().filter((row) =>
    /\/Partial Designs\/(Header|Footer)\/Data\/(Header|Footer)$/.test(row.path),
  ),
);
const INVENTORY = `query($where:WorkflowIdOrItemQueryInput!,$item:ItemQueryInput!){workflow(where:$where){workflowId commands(first:20,query:{item:$item}){nodes{commandId displayName}pageInfo{hasNextPage}}history(first:100,item:$item){edges{cursor node{date user newState{stateId displayName}}}pageInfo{hasNextPage}}}}`;
const TRANSITIONS = `query($where:WorkflowIdOrItemQueryInput!,$item:ItemQueryInput!,$after:String!){workflow(where:$where){history(first:100,item:$item,after:$after){nodes{date user oldState{stateId displayName}newState{stateId displayName}}pageInfo{hasNextPage}}}}`;

async function details(query, item) {
  assert(
    item.version === 2,
    "This history reader is scoped to the second logo revision.",
  );
  const variables = {
    where: { workflowId: W.IDS.workflow },
    item: {
      database: "master",
      itemId: item.itemId,
      language: "en",
      version: 2,
    },
  };
  const { workflow } = await query(INVENTORY, variables);
  assert(
    norm(workflow?.workflowId) === norm(W.IDS.workflow) &&
      workflow.commands.pageInfo.hasNextPage === false &&
      workflow.history.pageInfo.hasNextPage === false,
    "Incomplete native workflow inventory.",
  );
  const events = workflow.history.edges;
  assert(
    events.length >= 1 &&
      events.length <= 3 &&
      events[0].cursor &&
      norm(events[0].node.newState?.stateId) === norm(W.IDS.draft),
    "Expected one native version-start Draft event before at most two approval transitions.",
  );
  const { workflow: full } = await query(TRANSITIONS, {
    ...variables,
    after: events[0].cursor,
  });
  assert(
    full?.history?.pageInfo.hasNextPage === false &&
      full.history.nodes.length === events.length - 1,
    "Native history cursor did not preserve all subsequent transitions.",
  );
  for (let index = 0; index < full.history.nodes.length; index++) {
    const complete = full.history.nodes[index],
      summary = events[index + 1].node;
    assert.deepEqual(
      { date: complete.date, user: complete.user, newState: complete.newState },
      summary,
      "Native history changed during cursor read.",
    );
  }
  return {
    commands: workflow.commands.nodes,
    versionStarted: events[0],
    history: full.history.nodes,
  };
}
async function capture(query) {
  assert(TARGETS.length === 2, "Expected exactly two fixed logo targets.");
  const { currentUser: actor } = await query(
    "query{currentUser{name isAdministrator}}",
  );
  assert(
    actor?.name && actor.isAdministrator === true,
    "Use the verified existing administrator for seed approval.",
  );
  const rows = [];
  for (const target of TARGETS) {
    const previous = await read(query, {
      itemId: target.id,
      language: "en",
      version: 1,
    });
    const current = await read(query, {
      itemId: target.id,
      language: "en",
      version: 2,
    });
    for (const item of [previous, current])
      assert(
        item?.path === target.path &&
          norm(item.template.templateId) === norm(target.template) &&
          norm(value(item, "__Workflow")) === norm(W.IDS.workflow),
        "Logo identity/template/workflow changed.",
      );
    assert(
      previous.version === 1 &&
        current.version === 2 &&
        current.versions.length === 2 &&
        current.versions.every(
          (v) => v.language.name === "en" && [1, 2].includes(v.version),
        ),
      "Exactly English versions 1 and 2 are required.",
    );
    assert(
      norm(value(previous, "__Workflow state")) === norm(W.IDS.approved),
      "Preserve the Approved first logo version.",
    );
    N.routeFor(value(current, "__Workflow state"));
    assert(
      /mediaid="\{3686928A-210E-4C29-926F-A46B796A9E10\}"/i.test(
        value(current, "logo"),
      ),
      "The second revision must reference the verified native Liberty Mutual logo.",
    );
    rows.push({
      target,
      previous,
      current,
      ...(await details(query, current)),
    });
  }
  return { actor, rows };
}
function comparable(before) {
  return {
    actor: before.actor,
    rows: before.rows.map((row) => ({
      ...row,
      previous: semantic(row.previous),
      current: semantic(row.current),
    })),
  };
}
function plan(before) {
  return {
    actor: before.actor,
    targets: before.rows.map((row) => ({
      path: row.current.path,
      version: 2,
      state: value(row.current, "__Workflow state"),
    })),
    preservesApprovedVersion1: true,
    usesNativeCommands: true,
    publishes: false,
  };
}
async function run({ query, before, apply = false, record = () => {} }) {
  assert.deepEqual(
    comparable(await capture(query)),
    comparable(before),
    "Logo content, history, versions, or actor changed after capture.",
  );
  if (!apply) return plan(before);
  const result = [];
  for (const row of before.rows) {
    let current = row.current,
      native = {
        commands: row.commands,
        versionStarted: row.versionStarted,
        history: row.history,
      };
    for (let index = 0; index < 2; index++) {
      const route = N.routeFor(value(current, "__Workflow state"));
      if (!route) break;
      const fresh = await read(query, {
        itemId: current.itemId,
        language: "en",
        version: 2,
      });
      assert.deepEqual(
        semantic(fresh),
        semantic(current),
        "Logo changed before native approval command.",
      );
      assert(
        native.commands.some(
          (command) => norm(command.commandId) === norm(route.commandId),
        ),
        "Expected native command is unavailable.",
      );
      const comments = `Native Liberty Mutual logo revision: ${route.name.toLowerCase()} version 2.`;
      record({
        phase: "native-command-intent",
        itemId: current.itemId,
        path: current.path,
        version: 2,
        command: route.name,
        commandId: route.commandId,
        comments,
      });
      const response = await query(N.MUTATION, {
        input: {
          commandId: route.commandId,
          comments,
          item: {
            database: "master",
            itemId: current.itemId,
            language: "en",
            version: 2,
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
        "Native command completion not confirmed; inspect journal before retrying.",
      );
      const after = await read(query, {
        itemId: current.itemId,
        language: "en",
        version: 2,
      });
      N.verifyTransition(current, after, route.nextStateId, before.actor.name);
      const updated = await details(query, after);
      assert.deepEqual(
        updated.versionStarted,
        native.versionStarted,
        "Initial native version-start history changed.",
      );
      assert(
        updated.history.length === native.history.length + 1,
        "Expected exactly one new native command history event.",
      );
      assert.deepEqual(
        updated.history.slice(0, -1),
        native.history,
        "Existing native transition history changed.",
      );
      const event = updated.history.at(-1);
      assert(
        norm(event.oldState?.stateId) ===
          norm(value(current, "__Workflow state")) &&
          norm(event.newState?.stateId) === norm(route.nextStateId) &&
          event.user === before.actor.name,
        "Native old/new state and actor history not confirmed.",
      );
      const previous = await read(query, {
        itemId: current.itemId,
        language: "en",
        version: 1,
      });
      assert.deepEqual(
        semantic(previous),
        semantic(row.previous),
        "Approved first version changed unexpectedly.",
      );
      record({
        phase: "native-command-history-verified",
        itemId: current.itemId,
        version: 2,
        event,
        approvedVersion1Preserved: true,
      });
      current = after;
      native = updated;
    }
    assert(
      norm(value(current, "__Workflow state")) === norm(W.IDS.approved),
      "Logo version 2 did not reach Approved.",
    );
    result.push({
      path: current.path,
      itemId: current.itemId,
      version: 2,
      state: value(current, "__Workflow state"),
      versionStarted: native.versionStarted,
      history: native.history,
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
      "Invalid/repeated option.",
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
      (file) =>
        path.isAbsolute(file || "") &&
        !path.resolve(file).startsWith(ROOT + path.sep),
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
      options["--journal"] && !fs.existsSync(options["--journal"]),
      "Apply requires a new private journal.",
    );
    const journal = {
      origin: api.origin,
      baselineDigest: digest(baseline),
      events: [],
    };
    record = (event) => {
      journal.events.push({ at: new Date().toISOString(), ...event });
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
      count: result.targets.length,
      published: false,
    }),
  );
}
module.exports = {
  TARGETS,
  INVENTORY,
  TRANSITIONS,
  details,
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
