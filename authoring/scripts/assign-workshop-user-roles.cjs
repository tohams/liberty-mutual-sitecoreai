#!/usr/bin/env node
"use strict";
/**
 * Assign only the installed workshop roles to existing, non-admin native users.
 * This never creates/invites users, changes passwords, removes roles or grants
 * administrator access. The input and reports stay outside the repository.
 *
 * Private input: {"schemaVersion":1,"assignments":[
 *   {"email":"author@example.com","role":"author","pair":"02"},
 *   {"email":"approver@example.com","role":"approver","pair":"02"}
 * ]}
 * "all" is permitted only for the facilitator approver.
 *
 * Plan:  ENV --assignments /abs/assignments.json --report /abs/plan.json
 * Apply: ENV --assignments /abs/assignments.json --apply --journal /abs/journal.json --report /abs/result.json
 * Every identity and its current role graph is checked before the first write.
 * Role readback is not a substitute for testing actual authenticated UI sessions.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, connection, writePrivate } = require("./campaign-native-client.cjs");
const { readRole } = require("./configure-workshop-editorial-workflow.cjs");
const M = require("./workshop-editorial-workflow-model.cjs");

const USER_FIELDS = "name isAdministrator profile{email disabled isAdministrator}roles{name}";
const SAFE_BASE = new Set([
  "sitecore\\Sitecore Client Users", "sitecore\\Sitecore Client Content Reader",
  "sitecore\\Sitecore Client Authoring", "sitecore\\Sitecore Limited Content Editor",
  "sitecore\\Sitecore Limited Page Editor", "sitecore\\Sitecore Minimal Page Editor",
  "sitecore\\Everyone", "Everyone",
]);
const PUBLISHING = "sitecore\\Sitecore Client Publishing";
const VIRTUAL = new Set(["sitecore\\Everyone", "Everyone"]);
const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sorted = values => [...new Set(values)].sort();
const lowerEmail = value => typeof value === "string" ? value.trim().toLowerCase() : "";

function assignmentsFrom(input) {
  assert(input?.schemaVersion === 1 && Array.isArray(input.assignments) && input.assignments.length > 0 && input.assignments.length <= 32, "Provide 1–32 explicit workshop assignments in schemaVersion 1.");
  const assignments = input.assignments.map(row => {
    assert(row && typeof row === "object" && Object.keys(row).every(key => ["email", "role", "pair"].includes(key)), "Assignment fields are email, role and pair only.");
    const email = lowerEmail(row.email);
    assert(/^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(email), "Each assignment needs a valid email address.");
    assert(["author", "approver"].includes(row.role), "Use author or approver, never both.");
    if (row.pair === "all") assert.equal(row.role, "approver", "All pages is reserved for an approver.");
    else M.pairNumber(row.pair);
    return { email, role: row.role, pair: row.pair };
  });
  assert(new Set(assignments.map(row => row.email)).size === assignments.length, "One email cannot receive two workshop assignments.");
  return assignments;
}

function desiredRoles(assignment) {
  return [M.ROLES[assignment.role], assignment.pair === "all" ? M.ROLES.allPages : M.pairRole(assignment.pair)];
}

function summarizeUser(user) {
  assert(user?.name && user.profile && Array.isArray(user.roles), "Native user record is incomplete.");
  return {
    name: user.name, email: lowerEmail(user.profile.email), administrator: user.isAdministrator === true || user.profile.isAdministrator === true,
    disabled: user.profile.disabled === true, roles: sorted(user.roles.map(role => role.name)),
  };
}

async function findUsers(query, assignments) {
  const inventory = [];
  let after;
  const seen = new Set();
  for (let page = 0; page < 100; page++) {
    // A Cloud-created plus alias can be listed here but rejected by the
    // GraphQL profile/role resolver. Do not let one unrelated account poison
    // discovery for every other workshop participant.
    const result = await query("query($after:String){users(first:100,after:$after){nodes{name isAdministrator}pageInfo{hasNextPage endCursor}}}", { after });
    const connection = result.users;
    assert(connection?.nodes && typeof connection.pageInfo?.hasNextPage === "boolean", "Native user inventory failed.");
    for (const user of connection.nodes) {
      assert(typeof user.name === "string" && typeof user.isAdministrator === "boolean", "Native identity inventory is incomplete.");
      assert(!seen.has(user.name), "Native user inventory repeated an identity."); seen.add(user.name);
      inventory.push({ name: user.name, isAdministrator: user.isAdministrator });
    }
    if (!connection.pageInfo.hasNextPage) break;
    assert(connection.pageInfo.endCursor && connection.pageInfo.endCursor !== after && page < 99, "Native user pagination did not complete.");
    after = connection.pageInfo.endCursor;
  }
  const matches = new Map();
  for (const assignment of assignments) {
    // Sitecore Cloud maps the accepted email to this native username. Require
    // both that exact identity and its independently read profile email.
    const expected = ("sitecore\\" + assignment.email).toLowerCase();
    const candidates = inventory.filter(user => user.name.toLowerCase() === expected);
    const resolved = [];
    for (const identity of candidates) {
      try {
        const user = await readUser(query, identity.name);
        assert(user && user.name === identity.name && user.administrator === identity.isAdministrator, "Native identity changed or its profile administrator flag differs.");
        resolved.push({ user });
      } catch {
        const plusAlias = identity.name.includes("+");
        resolved.push({
          nativeUserName: identity.name,
          requiresNativeUserManager: plusAlias,
          reason: plusAlias
            ? "Sitecore GraphQL cannot resolve this plus-alias account's profile and roles. Use Settings > Access Management > User Manager to verify the account and assign the two workshop roles. No profile or membership has been inferred."
            : "The exact native account was found, but its profile and roles could not be verified. Inspect the account in User Manager before assigning roles.",
        });
      }
    }
    matches.set(assignment.email, resolved);
  }
  return matches;
}

async function readUser(query, name) {
  const result = await query(`query($name:String!){user(userName:$name){${USER_FIELDS}}}`, { name });
  return result.user ? summarizeUser(result.user) : null;
}

async function roleGraph(query, roleNames) {
  const graph = {}, visiting = new Set();
  const visit = async name => {
    assert(!visiting.has(name), "Native role inheritance contains a cycle.");
    if (Object.hasOwn(graph, name)) return;
    if (VIRTUAL.has(name)) { graph[name] = []; return; }
    visiting.add(name);
    const role = await readRole(query, name);
    assert(role, "An assigned or target role is missing from Sitecore.");
    graph[name] = sorted(role.memberOf);
    for (const parent of role.memberOf) await visit(parent);
    visiting.delete(name);
  };
  for (const name of sorted(roleNames)) await visit(name);
  return graph;
}

function validateRoleGraph(assignment, graph) {
  const allowed = new Set([...SAFE_BASE, ...desiredRoles(assignment)]);
  for (const name of Object.keys(graph)) assert(allowed.has(name), "Existing or inherited roles grant unreviewed privileges or another workshop scope; review them without silently removing access.");
  const targets = desiredRoles(assignment);
  for (const name of targets) assert(Object.hasOwn(graph, name), "Target workshop role is missing.");
  assert(graph[targets[1]].length === 0, "A pair/all-pages role must not inherit other permissions.");
  const roleParents = graph[targets[0]];
  assert(roleParents.every(name => ["sitecore\\Sitecore Client Users", "sitecore\\Sitecore Client Authoring"].includes(name)), "Workflow role has unexpected parent roles.");
  assert(Object.hasOwn(graph, "sitecore\\Sitecore Client Authoring"), "Workshop workflow role lacks basic authoring access.");
}

async function evaluate(query, assignments) {
  const matches = await findUsers(query, assignments), rows = [];
  for (const [index, assignment] of assignments.entries()) {
    const candidates = matches.get(assignment.email), row = { index: index + 1, ...assignment, desiredRoles: desiredRoles(assignment), ready: false };
    if (candidates.length !== 1) {
      row.reason = candidates.length ? "More than one native account matches the Cloud username; resolve the identity before assigning roles." : "No native account matches the expected Cloud username for this email. The invited user must first open SitecoreAI Page Builder or Content Editor; inspect any differently named account in User Manager.";
      rows.push(row); continue;
    }
    const candidate = candidates[0];
    if (!candidate.user) {
      Object.assign(row, candidate);
      rows.push(row); continue;
    }
    const user = candidate.user;
    row.user = user;
    if (user.administrator || user.disabled) {
      row.reason = user.administrator ? "This account is an administrator; it cannot prove author/approver separation." : "This native account is disabled.";
      rows.push(row); continue;
    }
    try {
      assert(user.email === assignment.email, "Native email mismatch.");
      assert(/^sitecore\\[^\r\n|]+$/.test(user.name), "Expected a Sitecore native user identity.");
      const graph = await roleGraph(query, [...user.roles, ...row.desiredRoles]);
      validateRoleGraph(assignment, graph);
      row.graph = graph;
      row.missingRoles = row.desiredRoles.filter(name => !user.roles.includes(name));
      row.ready = true;
    } catch (error) { row.reason = error.message; }
    rows.push(row);
  }
  assert(new Set(rows.filter(row => row.user).map(row => row.user.name)).size === rows.filter(row => row.user).length, "Different emails resolve to the same native identity.");
  return { schemaVersion: 1, mode: "read-only", assignmentsSha256: digest(assignments), ready: rows.every(row => row.ready), rows, createsUsers: false, removesRoles: false, changesPasswords: false, actualSessionAcceptanceRequired: true };
}

async function run({ query, input, apply = false, record = () => {} }) {
  const assignments = assignmentsFrom(input), before = await evaluate(query, assignments);
  if (!apply) return before;
  assert(before.ready, "At least one assignment is not ready. Review the private read-only report; no users were changed.");
  // Recheck the entire email inventory/role graph before the first assignment.
  assert.deepEqual(await evaluate(query, assignments), before, "Identity or role state changed during preflight.");
  for (const row of before.rows) {
    let current = await readUser(query, row.user.name);
    assert.deepEqual(current, row.user, "Native user changed before assignment.");
    let graph = await roleGraph(query, [...current.roles, ...row.desiredRoles]);
    assert.deepEqual(graph, row.graph, "Role inheritance changed before assignment.");
    for (const roleName of row.missingRoles) {
      assert.deepEqual(await readUser(query, current.name), current, "Native user changed immediately before assignment.");
      graph = await roleGraph(query, [...current.roles, ...row.desiredRoles]);
      validateRoleGraph(row, graph);
      assert.deepEqual(graph, row.graph, "Role inheritance changed immediately before assignment.");
      record({ phase: "role-assignment-intent", userName: current.name, email: row.email, roleName });
      const result = await query("mutation($input:AddAccountsToRoleInput!){addAccountsToRole(input:$input){successful}}", { input: { roleName, users: [current.name] } });
      assert(result.addAccountsToRole?.successful === true, "Role assignment was not confirmed; inspect native membership before retrying.");
      const after = await readUser(query, current.name);
      assert(after && after.name === current.name && after.email === current.email && !after.administrator && !after.disabled, "Identity or status changed during role assignment.");
      assert(after.roles.includes(roleName) && current.roles.every(name => after.roles.includes(name)), "Role readback differs or an unrelated role was removed.");
      const expectedEffective = new Set([...current.roles, roleName]);
      const addParents = name => { for (const parent of row.graph[name] || []) { if (!expectedEffective.has(parent)) { expectedEffective.add(parent); addParents(parent); } } };
      addParents(roleName);
      assert(after.roles.every(name => expectedEffective.has(name)), "Unexpected privileges appeared in role readback.");
      validateRoleGraph(row, await roleGraph(query, [...after.roles, ...row.desiredRoles]));
      record({ phase: "role-assignment-verified", userName: after.name, email: row.email, roleName, roles: after.roles });
      current = after;
    }
  }
  const after = await evaluate(query, assignments);
  assert(after.ready && after.rows.every(row => row.missingRoles.length === 0), "Final native membership verification failed.");
  return { ...after, mode: "applied", addedMemberships: before.rows.reduce((count, row) => count + row.missingRoles.length, 0) };
}

function privatePath(file) {
  assert(path.isAbsolute(file) && !path.resolve(file).startsWith(ROOT + path.sep), "Keep identity input, journal and reports outside the repository.");
  return file;
}
async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args, options = {};
  assert(environment && !environment.startsWith("--"), "Specify a Sitecore CLI environment.");
  for (let i = 0; i < rest.length; i++) {
    const option = rest[i]; assert(!Object.hasOwn(options, option), "Duplicate option.");
    if (option === "--apply") options[option] = true;
    else {
      assert(["--assignments", "--journal", "--report"].includes(option) && rest[i + 1] && !rest[i + 1].startsWith("--"), "Unknown or incomplete option.");
      options[option] = privatePath(rest[++i]);
    }
  }
  assert(options["--assignments"] && options["--report"], "Specify private assignment input and a new private report.");
  assert(!fs.existsSync(options["--report"]), "Do not overwrite an existing role-assignment report.");
  const apply = options["--apply"] === true;
  assert(apply ? options["--journal"] && !fs.existsSync(options["--journal"]) : !options["--journal"], "Apply requires a new private journal; read-only mode does not use one.");
  assert(new Set(Object.values(options).filter(value => typeof value === "string")).size === Object.values(options).filter(value => typeof value === "string").length, "Input, journal and report paths must differ.");
  const input = JSON.parse(fs.readFileSync(options["--assignments"], "utf8"));
  const { query, origin } = connection(environment, apply);
  let record = () => {};
  if (apply) {
    const journal = { schemaVersion: 1, origin, assignmentsSha256: digest(assignmentsFrom(input)), events: [] };
    record = event => { journal.events.push({ at: new Date().toISOString(), ...event }); writePrivate(options["--journal"], journal); };
  }
  const result = await run({ query, input, apply, record });
  writePrivate(options["--report"], { ...result, origin, environment, checkedAt: new Date().toISOString() });
  console.log(JSON.stringify({ mode: result.mode, assignments: result.rows.length, ready: result.rows.filter(row => row.ready).length, pending: result.rows.filter(row => !row.ready).map(row => ({ index: row.index, reason: row.reason })), addedMemberships: result.addedMemberships || 0, report: options["--report"], actualSessionAcceptanceRequired: true }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { SAFE_BASE, PUBLISHING, assignmentsFrom, desiredRoles, summarizeUser, findUsers, readUser, roleGraph, validateRoleGraph, evaluate, run, main };
