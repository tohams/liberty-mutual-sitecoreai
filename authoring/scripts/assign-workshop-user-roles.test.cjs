"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("./assign-workshop-user-roles.cjs");
const M = require("./workshop-editorial-workflow-model.cjs");

const assignment = (email = "author@example.com", role = "author", pair = "02") => ({ email, role, pair });
const input = (...assignments) => ({ schemaVersion: 1, assignments });
function fakeNative(records = [{ name: "sitecore\\author@example.com", email: "author@example.com" }]) {
  const roles = new Map(M.roleSpecs(["01", "02", "03"]).map(spec => [spec.name, [...spec.memberOf]]));
  for (const name of A.SAFE_BASE) if (!roles.has(name)) roles.set(name, []);
  roles.set(A.PUBLISHING, ["sitecore\\Sitecore Client Users"]);
  const users = new Map(records.map(record => [record.name, { name: record.name, email: record.email, administrator: false, disabled: false, direct: ["sitecore\\Sitecore Client Content Reader"], ...record }]));
  const mutations = [];
  const expanded = names => {
    const all = new Set();
    const add = name => { if (all.has(name)) return; all.add(name); for (const parent of roles.get(name) || []) add(parent); };
    names.forEach(add); return [...all].sort();
  };
  const nativeUser = user => user ? { name: user.name, isAdministrator: user.administrator, profile: { email: user.email, disabled: user.disabled, isAdministrator: user.profileAdministrator || false }, roles: expanded(user.direct).map(name => ({ name })) } : null;
  const query = async (source, variables = {}) => {
    if (source.includes("users(first:")) return { users: { nodes: [...users.values()].map(nativeUser), pageInfo: { hasNextPage: false, endCursor: null } } };
    if (source.includes("user(userName:")) return { user: nativeUser(users.get(variables.name)) };
    if (source.includes("role(roleName:")) return { role: roles.has(variables.name) ? { name: variables.name, memberOf: { nodes: roles.get(variables.name).map(name => ({ name })), pageInfo: { hasNextPage: false } } } : null };
    if (source.includes("addAccountsToRole(input:")) {
      mutations.push(structuredClone(variables.input));
      for (const name of variables.input.users) users.get(name).direct.push(variables.input.roleName);
      return { addAccountsToRole: { successful: true } };
    }
    throw new Error("Unexpected native operation");
  };
  return { query, users, roles, mutations };
}

test("input normalizes email case, preserves plus aliases and limits all-pages to approvers", () => {
  assert.deepEqual(A.assignmentsFrom(input(assignment(" Person+author@Example.COM "))), [assignment("person+author@example.com")]);
  assert.throws(() => A.assignmentsFrom(input(assignment("a@example.com", "author", "all"))), /reserved for an approver/);
  assert.throws(() => A.assignmentsFrom(input(assignment(), assignment("AUTHOR@example.com"))), /two workshop assignments/);
  assert.throws(() => A.assignmentsFrom(input({ ...assignment(), administrator: true })), /fields are email/);
  assert.throws(() => A.assignmentsFrom(input(assignment("a@example.com", "author", "10"))));
});

test("default plan matches exact native email without mutating", async () => {
  const native = fakeNative();
  const result = await A.run({ query: native.query, input: input(assignment()) });
  assert.equal(result.ready, true);
  assert.equal(result.rows[0].user.name, "sitecore\\author@example.com");
  assert.deepEqual(result.rows[0].missingRoles, [M.ROLES.author, M.pairRole("02")]);
  assert.equal(native.mutations.length, 0);
});

test("unregistered, ambiguous and mismatched Cloud identities are pending rather than invented", async () => {
  const missing = fakeNative([]);
  const report = await A.run({ query: missing.query, input: input(assignment()) });
  assert.equal(report.ready, false);
  assert.match(report.rows[0].reason, /No native account/);
  const duplicate = fakeNative([{ name: "sitecore\\author@example.com", email: "author@example.com" }, { name: "sitecore\\AUTHOR@example.com", email: "AUTHOR@example.com" }]);
  const result = await A.run({ query: duplicate.query, input: input(assignment()) });
  assert.equal(result.ready, false);
  assert.match(result.rows[0].reason, /More than one/);
  assert.equal(duplicate.mutations.length, 0);
  const mismatched = fakeNative([{ name: "sitecore\\author@example.com", email: "someone-else@example.com" }]);
  const mismatch = await A.run({ query: mismatched.query, input: input(assignment()) });
  assert.equal(mismatch.ready, false);
  assert.match(mismatch.rows[0].reason, /Native email mismatch/);
  const differentName = fakeNative([{ name: "sitecore\\legacy-user", email: "author@example.com" }]);
  const legacy = await A.run({ query: differentName.query, input: input(assignment()) });
  assert.equal(legacy.ready, false);
  assert.match(legacy.rows[0].reason, /expected Cloud username/);
});

test("unrelated invalid plus-alias profiles do not poison attendee discovery or assignment", async () => {
  const native = fakeNative([
    { name: "sitecore\\author@example.com", email: "author@example.com" },
    { name: "sitecore\\presenter+author@example.com", email: "presenter+author@example.com" },
  ]);
  const detailsRead = [];
  const query = async (source, variables) => {
    if (source.includes("users(first:")) {
      assert(!source.includes("profile") && !source.includes("roles"), "Global inventory must not resolve user details");
    }
    if (source.includes("user(userName:")) {
      detailsRead.push(variables.name);
      assert(!variables.name.includes("+"), "Only the requested Cloud identity should be resolved");
    }
    return native.query(source, variables);
  };
  const result = await A.run({ query, input: input(assignment()), apply: true });
  assert.equal(result.ready, true);
  assert.equal(native.mutations.length, 2);
  assert.deepEqual([...new Set(detailsRead)], ["sitecore\\author@example.com"]);
});

test("requested plus-alias detail failures require native User Manager without an inferred profile", async () => {
  const email = "presenter+author@example.com";
  const native = fakeNative([{ name: "sitecore\\" + email, email }]);
  const query = async (source, variables) => {
    if (source.includes("user(userName:")) throw new Error("The user has an invalid name according to the domain requirements.");
    return native.query(source, variables);
  };
  const result = await A.run({ query, input: input(assignment(email, "author", "01")) });
  assert.equal(result.ready, false);
  assert.equal(result.rows[0].requiresNativeUserManager, true);
  assert.match(result.rows[0].reason, /No profile or membership has been inferred/);
  assert.equal(result.rows[0].user, undefined);
  assert.equal(result.rows[0].graph, undefined);
  await assert.rejects(A.run({ query, input: input(assignment(email, "author", "01")), apply: true }), /not ready/);
  assert.equal(native.mutations.length, 0);
});

test("an API-compatible plus alias still requires its real profile and roles", async () => {
  const email = "compatible+author@example.com";
  const native = fakeNative([{ name: "sitecore\\" + email, email }]);
  const result = await A.run({ query: native.query, input: input(assignment(email)) });
  assert.equal(result.ready, true);
  assert.equal(result.rows[0].user.email, email);
  assert.equal(result.rows[0].requiresNativeUserManager, undefined);
  assert.equal(native.mutations.length, 0);
});

test("a mixed report marks ordinary attendees ready while retaining manual-only aliases", async () => {
  const email = "presenter+author@example.com";
  const native = fakeNative([{ name: "sitecore\\" + email, email }, { name: "sitecore\\author@example.com", email: "author@example.com" }]);
  const query = async (source, variables) => {
    if (source.includes("user(userName:") && variables.name.includes("+")) throw new Error("Native validation error");
    return native.query(source, variables);
  };
  const result = await A.run({ query, input: input(assignment(email, "author", "01"), assignment()) });
  assert.equal(result.rows[0].requiresNativeUserManager, true);
  assert.equal(result.rows[1].ready, true);
  assert.equal(result.ready, false);
  assert.equal(native.mutations.length, 0);
});

test("admin flag, profile-admin flag and disabled status each block assignment", async () => {
  for (const attributes of [{ administrator: true }, { profileAdministrator: true }, { disabled: true }]) {
    const native = fakeNative([{ name: "sitecore\\author@example.com", email: "author@example.com", ...attributes }]);
    const report = await A.run({ query: native.query, input: input(assignment()) });
    assert.equal(report.ready, false);
    await assert.rejects(A.run({ query: native.query, input: input(assignment()), apply: true }), /not ready/);
    assert.equal(native.mutations.length, 0);
  }
});

test("broad, unknown and inherited roles block without silently stripping privileges", async () => {
  for (const role of ["sitecore\\Author", "sitecore\\Developer", "sitecore\\Designer", "sitecore\\Sitecore Client Site Managing", "sitecore\\Sitecore Client Securing", "sitecore\\Unexpected Custom Role"]) {
    const native = fakeNative();
    native.roles.set(role, []); native.users.get("sitecore\\author@example.com").direct.push(role);
    const result = await A.run({ query: native.query, input: input(assignment()) });
    assert.equal(result.ready, false);
    assert(native.users.get("sitecore\\author@example.com").direct.includes(role));
    assert.equal(native.mutations.length, 0);
  }
  const inherited = fakeNative();
  inherited.roles.set("sitecore\\Developer", []);
  inherited.roles.get("sitecore\\Sitecore Client Content Reader").push("sitecore\\Developer");
  const result = await A.run({ query: inherited.query, input: input(assignment()) });
  assert.equal(result.ready, false);
});

test("opposite workflow role, another pair, and unintended all-page rights are refused", async () => {
  for (const role of [M.ROLES.approver, M.pairRole("03"), M.ROLES.allPages, A.PUBLISHING]) {
    const native = fakeNative(); native.users.get("sitecore\\author@example.com").direct.push(role);
    const result = await A.run({ query: native.query, input: input(assignment()) });
    assert.equal(result.ready, false);
    assert.equal(native.mutations.length, 0);
  }
});

test("any blocked participant prevents all mutations in a batch", async () => {
  const native = fakeNative();
  await assert.rejects(A.run({ query: native.query, input: input(assignment(), assignment("missing@example.com", "approver", "02")), apply: true }), /not ready/);
  assert.equal(native.mutations.length, 0);
});

test("apply adds only the two intended memberships and verifies inherited readback", async () => {
  const native = fakeNative(), journal = [];
  const result = await A.run({ query: native.query, input: input(assignment()), apply: true, record: event => journal.push(event) });
  assert.equal(result.mode, "applied");
  assert.equal(result.addedMemberships, 2);
  assert.deepEqual(native.mutations, [
    { roleName: M.ROLES.author, users: ["sitecore\\author@example.com"] },
    { roleName: M.pairRole("02"), users: ["sitecore\\author@example.com"] },
  ]);
  assert(result.rows[0].user.roles.includes("sitecore\\Sitecore Client Content Reader"));
  assert(result.rows[0].user.roles.includes("sitecore\\Sitecore Client Authoring"));
  assert.equal(journal.filter(event => event.phase === "role-assignment-verified").length, 2);
  const repeated = await A.run({ query: native.query, input: input(assignment()), apply: true });
  assert.equal(repeated.addedMemberships, 0);
  assert.equal(native.mutations.length, 2);
});

test("facilitator approver gets Approver plus All pages without Author", async () => {
  const native = fakeNative([{ name: "sitecore\\approver@example.com", email: "approver@example.com" }]);
  const result = await A.run({ query: native.query, input: input(assignment("approver@example.com", "approver", "all")), apply: true });
  assert.equal(result.ready, true);
  assert.deepEqual(native.mutations.map(x => x.roleName), [M.ROLES.approver, M.ROLES.allPages]);
  assert(!result.rows[0].user.roles.includes(M.ROLES.author));
  assert(!result.rows[0].user.roles.includes(A.PUBLISHING));
});

test("an approver with global manual publishing access is blocked", async () => {
  const native = fakeNative([{ name: "sitecore\\approver@example.com", email: "approver@example.com", direct: [A.PUBLISHING] }]);
  const result = await A.run({ query: native.query, input: input(assignment("approver@example.com", "approver", "02")) });
  assert.equal(result.ready, false);
  assert.match(result.rows[0].reason, /unreviewed privileges/);
  assert.equal(native.mutations.length, 0);
});

test("concurrent membership change stops before writes", async () => {
  const native = fakeNative(); let userLists = 0;
  const query = async (source, variables) => {
    if (source.includes("users(first:") && ++userLists === 2) native.users.get("sitecore\\author@example.com").disabled = true;
    return native.query(source, variables);
  };
  await assert.rejects(A.run({ query, input: input(assignment()), apply: true }), /changed during preflight/);
  assert.equal(native.mutations.length, 0);
});

test("unexpected privilege in post-write readback stops further assignment", async () => {
  const native = fakeNative(); native.roles.set("sitecore\\Developer", []);
  const query = async (source, variables) => {
    const result = await native.query(source, variables);
    if (source.includes("addAccountsToRole(input:")) native.users.get("sitecore\\author@example.com").direct.push("sitecore\\Developer");
    return result;
  };
  await assert.rejects(A.run({ query, input: input(assignment()), apply: true }), /Unexpected privileges/);
  assert.equal(native.mutations.length, 1);
});

test("user inventory requires complete, non-repeating pagination", async () => {
  const query = async () => ({ users: { nodes: [], pageInfo: { hasNextPage: true, endCursor: null } } });
  await assert.rejects(A.findUsers(query, [assignment()]), /pagination did not complete/);
});
