const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("./support-native-form-model.cjs");
const C = require("./configure-support-native-form.cjs");
const ID = "980983421c624d078ccf2fd29e4ae665-use";
const guidance =
  '<r uid="{8FF5B6AB-F47D-54EB-B0D7-591C3850074F}" id="{193A0299-B5B6-5668-B792-9F3552463163}" ph="headless-agent-guidance" ds="unchanged" par="FieldNames=Highlight" />';
const shared =
  '<r><d id="' +
  M.brace(M.IDS.device) +
  '" l="' +
  M.brace(M.ORIGINAL_LAYOUT) +
  '">' +
  guidance +
  "</d></r>";
const final =
  '<r xmlns:s="s"><d id="' +
  M.brace(M.IDS.device) +
  '"><r uid="{8FF5B6AB-F47D-54EB-B0D7-591C3850074F}" s:ds="personalized" /></d></r>';
function page() {
  return {
    itemId: M.SUPPORT_ID,
    path: M.SUPPORT,
    template: { templateId: M.IDS.portalPage },
    language: { name: "en" },
    version: 1,
    versions: [{ version: 1, language: { name: "en" } }],
    revision: { value: "original" },
    children: [],
    fields: [
      { name: "__Renderings", value: shared },
      { name: "__Final Renderings", value: final },
      { name: "__Created", value: "20260908T000000Z" },
      { name: "__Workflow", value: "preserved-workflow" },
      { name: "Title", value: "Support" },
      { name: "__Revision", value: "original" },
    ],
  };
}
test("three owned model items allow only native Form and never serialize the shared rendering", () => {
  const records = M.modelRecords();
  assert.equal(records.length, 3);
  assert(
    records.every((r) => !r.Path.startsWith("/sitecore/layout/Renderings/")),
  );
  for (const r of records.filter((r) => r.Path.endsWith(M.KEY)))
    assert.equal(
      r.SharedFields.find((f) => f.Hint === "Allowed Controls").Value,
      M.brace(M.FORM),
    );
  assert.equal(
    records[0].SharedFields.find((f) => f.Hint === "Placeholders").Value,
    [M.GUIDANCE_PLACEHOLDER, M.uid(M.PP + "/" + M.KEY)].map(M.brace).join("|"),
  );
});
test("binding preserves existing rendering bytes and is idempotent", () => {
  const after = C.transform(shared, final, ID);
  assert(after.includes(guidance));
  assert(
    after.includes(
      "FormId=" + ID + "&amp;RenderingIdentifier=contact-your-team-form",
    ),
  );
  assert.equal(C.transform(after, final, ID), after);
  assert.equal((after.match(new RegExp(M.KEY, "g")) || []).length, 1);
});
test("reject unknown layout, conflicting slot, duplicate native form, and final layout overrides", () => {
  assert.throws(
    () =>
      C.transform(
        shared.replace(M.brace(M.ORIGINAL_LAYOUT), M.brace(M.FORM)),
        final,
        ID,
      ),
    /unexpected layout/,
  );
  const after = C.transform(shared, final, ID);
  assert.throws(
    () =>
      C.transform(after.replace("FormId=" + ID, "FormId=changed"), final, ID),
    /preserve author changes/,
  );
  assert.throws(
    () =>
      C.transform(
        after.replace(
          "</d>",
          '<r id="' + M.brace(M.FORM) + '" ph="elsewhere" /></d>',
        ),
        final,
        ID,
      ),
    /Multiple/,
  );
  assert.throws(
    () =>
      C.transform(shared, final.replace("<d id=", '<d s:l="anything" id='), ID),
    /overrides/,
  );
});
test("native region-bearing identifier rejects markup and non-native values", () => {
  for (const id of [
    "",
    "fake",
    "https://example.com/form",
    ID + '"',
    ID + "&other=true",
  ])
    assert.throws(() => C.formId(id));
  assert.equal(C.formId(ID), ID);
});
test("Support guard preserves all editorial, workflow, identity and version fields", () => {
  const before = page(),
    after = C.transform(shared, final, ID);
  const current = structuredClone(before);
  current.fields[0].value = after;
  current.revision.value = "new";
  current.fields.find((f) => f.name === "__Revision").value = "new";
  assert.doesNotThrow(() => C.assertSupportUnchanged(current, before, after));
  for (const name of [
    "Title",
    "__Final Renderings",
    "__Workflow",
    "__Created",
  ]) {
    const changed = structuredClone(current);
    changed.fields.find((f) => f.name === name).value = "changed";
    assert.throws(() => C.assertSupportUnchanged(changed, before, after));
  }
  const changed = structuredClone(current);
  changed.path = M.SITE + "/Home";
  assert.throws(
    () => C.assertSupportUnchanged(changed, before, after),
    /Only the existing Support/,
  );
  const extra = structuredClone(current);
  extra.versions.push({ version: 2, language: { name: "en" } });
  assert.throws(
    () => C.assertSupportUnchanged(extra, before, after),
    /version inventory/,
  );
});
test("baseline/contract tampering stops before any native mutation", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      C.run(
        async () => {
          calls++;
          throw Error("unexpected");
        },
        { schemaVersion: 1, support: page(), formId: ID, after: "tampered" },
        () => {},
      ),
    /Baseline contract/,
  );
  assert.equal(calls, 0);
});

test("published Support accepts native Form parameters without expecting CMS datasource text", () => {
  const { verifyComposition } = require("./verify-edge-content.cjs");
  const manifest = require("../items/liberty-mutual/content-manifest.json");
  const layout = {
    itemId: M.SUPPORT_ID,
    placeholders: {
      "headless-agent-guidance": [
        {
          componentName: "AgentGuidance",
          fields: { body: { value: "body" }, headline: { value: "title" } },
        },
      ],
      "headless-support-form": [
        { componentName: "Form", uid: M.FORM_UID, params: { FormId: ID } },
      ],
    },
  };
  assert.equal(verifyComposition("/support", layout, manifest).length, 2);
  layout.placeholders["headless-support-form"][0].params.FormId = "";
  assert.throws(
    () => verifyComposition("/support", layout, manifest),
    /Missing native Form selection/,
  );
});
