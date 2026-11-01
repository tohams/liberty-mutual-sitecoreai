"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const W = require("./public-configure-editorial-workflow.cjs");
const { ROLES } = require("./workshop-editorial-workflow-model.cjs");

function rights(acl, role) {
  const block = acl.split("ar|").find((value) => value.startsWith(role + "|"));
  assert(block, "Expected role has an explicit ACL block.");
  return block.split("|").filter((value) => /^[+-]/.test(value));
}

test("public review has exactly three states, separated commands, and no publishing action", () => {
  const specs = W.specifications();
  assert.equal(specs.length, 7);
  assert.equal(new Set(specs.map((row) => row.id)).size, 7);
  assert.deepEqual(
    specs
      .filter((row) => row.template === W.T.state)
      .map((row) => row.path.split("/").at(-1)),
    ["Draft", "Awaiting approval", "Approved"],
  );
  assert.deepEqual(
    specs.filter((row) => row.fields.Final === "1").map((row) => row.id),
    [W.IDS.approved],
  );
  assert.equal(
    specs.some((row) => /publish/i.test(row.path)),
    false,
  );
  for (const spec of specs) {
    assert.ok(spec.path === W.WF || spec.path.startsWith(W.WF + "/"));
    assert.equal(spec.path.includes("Basic Workflow"), false);
  }
  for (const key of ["approve", "reject"]) {
    const row = specs.find((row) => row.key === key);
    assert.ok(
      rights(row.fields.__Security, ROLES.author).includes(
        "-workflowCommand:execute",
      ),
    );
    assert.ok(
      rights(row.fields.__Security, ROLES.approver).includes(
        "+workflowCommand:execute",
      ),
    );
  }
  const submit = specs.find((row) => row.key === "submit");
  assert.ok(
    rights(submit.fields.__Security, ROLES.author).includes(
      "+workflowCommand:execute",
    ),
  );
  assert.ok(
    rights(submit.fields.__Security, ROLES.approver).includes(
      "-workflowCommand:execute",
    ),
  );
});

test("workflow migration preserves approved content and refuses foreign or unknown states", () => {
  assert.equal(
    W.stateFor(W.BASIC.workflow, W.BASIC.draft).toLowerCase(),
    `{${W.IDS.draft}}`,
  );
  assert.equal(
    W.stateFor(W.BASIC.workflow, W.BASIC.approved).toLowerCase(),
    `{${W.IDS.approved}}`,
  );
  assert.equal(W.stateFor(W.IDS.workflow, W.IDS.awaiting), W.IDS.awaiting);
  assert.throws(
    () => W.stateFor("00000000-0000-0000-0000-000000000000", W.BASIC.draft),
    /another workflow/,
  );
  assert.throws(
    () => W.stateFor(W.BASIC.workflow, W.IDS.awaiting),
    /unexpected/,
  );
});

test("content grants stay under Home and named managed libraries; definitions and administrator rights stay protected", () => {
  assert.equal(W.ACL_ROOTS.length, 4);
  for (const root of W.ACL_ROOTS)
    assert.match(
      root,
      /^\/sitecore\/content\/LibertyMutual\/liberty-mutual-public-site\/(?:Home|Data\/(?:Promotions|Disclosures|Approved answers))$/,
    );
  assert.equal(W.AUTHOR_CONTENT["item:create"], true);
  assert.equal(W.APPROVER_CONTENT["item:create"], false);
  for (const content of [W.AUTHOR_CONTENT, W.APPROVER_CONTENT]) {
    assert.equal(content["item:admin"], false);
    assert.equal(content["item:delete"], false);
  }
  for (const spec of W.specifications())
    for (const role of [ROLES.author, ROLES.approver]) {
      const permissions = rights(spec.fields.__Security, role);
      assert.ok(permissions.includes("-item:admin"));
      assert.ok(permissions.includes("-item:write"));
    }
});

test("serialized workflow stores native shared settings and real empty values, not editorial copies or credentials", () => {
  const rows = W.serialization();
  assert.equal(rows.length, 7);
  for (const row of rows) {
    assert.equal(
      row.ID,
      W.IDS[W.specifications().find((spec) => spec.path === row.Path).key],
    );
    assert.equal(
      row.SharedFields.every((field) => typeof field.Value === "string"),
      true,
    );
    assert.equal(JSON.stringify(row).includes("clientSecret"), false);
    assert.equal(row.Path.startsWith("/sitecore/content/"), false);
  }
  const root = rows.find((row) => row.ID === W.IDS.workflow);
  assert.equal(root.Languages[0].Fields[0].Hint, "__Short description");
  assert.equal(
    rows
      .find((row) => row.ID === W.IDS.draft)
      .SharedFields.find((field) => field.Hint === "Final").Value,
    "",
  );
});

test("ACL scalars retain one literal native domain slash and the recovery exception accepts no other drift", () => {
  for (const spec of W.specifications()) {
    const acl = spec.fields.__Security;
    assert.equal(W.serializedValue({ Hint: "__Security", Value: acl }), acl);
    assert.deepEqual(
      acl.match(/\\+/g).map((value) => value.length),
      [1, 1],
    );
    const escaped = acl.replaceAll("\\", "\\\\");
    assert.equal(W.isEscapedAclArtifact(escaped, acl), true);
    assert.equal(W.isEscapedAclArtifact(acl, acl), false);
    assert.equal(
      W.isEscapedAclArtifact(
        escaped.replace("-item:admin", "+item:admin"),
        acl,
      ),
      false,
    );
    assert.equal(
      W.isEscapedAclArtifact(acl.replaceAll("\\", "\\\\\\"), acl),
      false,
    );
  }
});

test("native provenance initialization is limited to weak seed metadata and the verified actor", () => {
  const actor = "sitecore\\setup@example.com";
  const item = (owner, creator) => ({
    fields: [
      { name: "__Owner", value: owner },
      { name: "__Created by", value: creator },
    ],
  });
  assert.deepEqual(
    W.nativeProvenanceChanges(
      item("", "  sitecore\\admin"),
      item(actor, actor),
      actor,
    ),
    [
      { name: "__Owner", before: "", after: actor },
      { name: "__Created by", before: "  sitecore\\admin", after: actor },
    ],
  );
  assert.deepEqual(
    W.nativeProvenanceChanges(item(actor, actor), item(actor, actor), actor),
    [],
  );
  assert.throws(
    () =>
      W.nativeProvenanceChanges(
        item("", "sitecore\\an-author"),
        item(actor, actor),
        actor,
      ),
    /Unexpected native provenance/,
  );
  assert.throws(
    () =>
      W.nativeProvenanceChanges(
        item("sitecore\\an-owner", ""),
        item(actor, actor),
        actor,
      ),
    /Unexpected native provenance/,
  );
  assert.throws(
    () =>
      W.nativeProvenanceChanges(
        item("", ""),
        item("sitecore\\another-user", actor),
        actor,
      ),
    /Unexpected native provenance/,
  );
});

test("inherited metadata changes require the exact template, verified Standard Values source, and exact new value", () => {
  const item = (template, entries) => ({
    template: { templateId: template },
    fields: Object.entries(entries).map(([name, value]) => ({ name, value })),
  });
  const before = item("same-template", {
    "__Default workflow": "old",
    __Owner: "",
    heading: "Authored heading",
  });
  const current = item("same-template", {
    "__Default workflow": "new",
    __Owner: "actor",
    heading: "Unexpected edit",
  });
  const standard = {
    ...item("same-template", {
      "__Default workflow": "new",
      __Owner: "actor",
      heading: "Unexpected edit",
    }),
    itemId: "verified-standard-values",
  };
  const flags = {
    "__Default workflow": { containsStandardValue: true, value: "new" },
    __Owner: { containsStandardValue: true, value: "actor" },
    heading: { containsStandardValue: true, value: "Unexpected edit" },
  };
  assert.deepEqual(
    W.standardValuePropagation(before, current, standard, flags).map(
      (row) => row.name,
    ),
    ["__Owner", "__Default workflow"],
  );
  assert.deepEqual(
    W.standardValuePropagation(
      before,
      current,
      { ...standard, template: { templateId: "other-template" } },
      flags,
    ),
    [],
  );
  assert.deepEqual(
    W.standardValuePropagation(before, current, standard, {}),
    [],
  );
  assert.equal(
    W.standardValuePropagation(before, current, standard, {
      __Owner: { containsStandardValue: true, value: "different-value" },
    }).length,
    0,
  );
});
