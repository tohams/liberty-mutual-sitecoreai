const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("./campaign-authoring-model.cjs");
const seed = require("./seed-campaign-content.cjs");
const ROOT = path.resolve(__dirname, "../..");
const value = (r, name) =>
  [
    ...(r.SharedFields ?? []),
    ...r.Languages.flatMap((l) => [
      ...(l.Fields ?? []),
      ...l.Versions.flatMap((v) => v.Fields),
    ]),
  ].find((f) => f.Hint === name)?.Value ?? "";

test("campaign regions reject misplaced component types and use bounded dynamic keys", () => {
  const records = M.modelRecords();
  for (const [key, components] of Object.entries(M.PLACEHOLDERS)) {
    assert(components.length > 0);
    for (const root of [M.PP, M.SP]) {
      const r = records.find((x) => x.Path === root + "/" + key);
      assert.equal(
        value(r, "Placeholder Key"),
        key + (key === "headless-campaign-page" ? "" : "-{*}"),
      );
      assert.equal(
        value(r, "Allowed Controls"),
        components.map((c) => M.brace(M.uid(M.RP + "/" + c))).join("|"),
      );
    }
  }
  assert(!M.PLACEHOLDERS["headless-campaign-main"].includes("CampaignContact"));
  assert(
    !M.PLACEHOLDERS["headless-campaign-sidebar"].includes("CampaignAccordion"),
  );
  for (const r of records.filter((r) => r.Path.startsWith(M.RP + "/")))
    assert.equal(
      value(r, "AllowedOnTemplates"),
      M.brace(M.uid(M.TP + "/CampaignPage")),
    );
});

test("branch creates blank local data; page copies cannot share editorial datasource IDs", () => {
  const records = M.branchRecords(),
    prototype = records.find((r) => r.Path === M.BRANCH + "/$name");
  assert.equal(value(prototype, "__Workflow state"), M.brace(M.IDS.draft));
  assert.equal(value(prototype, "__Renderings"), M.layout(prototype.Path));
  for (const i of M.instances) {
    const r = records.find(
      (r) => r.Path === prototype.Path + "/Data/" + i.name,
    );
    assert(r);
    for (const [field] of M.COMPONENTS[i.component])
      assert.equal(value(r, field), "");
    assert(
      value(prototype, "__Renderings").includes(
        'ds="page:/Data/' + i.name + '"',
      ),
    );
  }
  assert.notEqual(M.layout(M.PAGE), M.layout(M.PRACTICE));
  assert(!M.layout(M.PAGE).includes("FieldNames="));
});

test("source-controlled resources contain no live or practice campaign content", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "authoring/items/liberty-mutual/campaign-authoring-manifest.json",
      ),
    ),
  );
  for (const p of Object.keys(manifest.modelIds))
    assert(!p.startsWith(M.GROWTH + "/"));
  const build = JSON.parse(
    fs.readFileSync(path.join(ROOT, "xmcloud.build.json")),
  );
  assert(
    !build.deployItems.modules.includes("LibertyMutual.CampaignPageBranch"),
  );
  const module = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "authoring/items/liberty-mutual/LibertyMutual.CampaignPageBranch.module.json",
      ),
    ),
  );
  assert.deepEqual(module.items.includes, [
    {
      name: "campaign-page-branch",
      path: M.BRANCH,
      allowedPushOperations: "CreateOnly",
    },
  ]);
});

test("branch rule append preserves Resource page rule and is idempotent", () => {
  const previous =
    '<ruleset><rule uid="{AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA}" name="Existing"><conditions /></rule></ruleset>';
  const result = seed.branchRule(previous);
  assert(result.includes(previous.slice(0, -10)));
  assert.equal(seed.branchRule(result), result);
  assert.throws(() => seed.branchRule("<invalid>"));
});

test("editable seed is limited to new campaigns and exposes rich text/date fields without claiming scheduling", () => {
  for (const spec of seed.desired)
    assert(
      spec.path === M.SITE + "/Presentation/Available Renderings/Campaign" ||
        spec.path === M.PAGE ||
        spec.path.startsWith(M.PAGE + "/") ||
        spec.path === M.PRACTICE ||
        spec.path.startsWith(M.PRACTICE + "/"),
    );
  assert.equal(
    seed.desired
      .find((s) => s.path === M.PRACTICE)
      .fields.find((f) => f.name === "__Workflow state").value,
    M.brace(M.IDS.draft),
  );
  assert(
    M.COMPONENTS.CampaignAlert.some(
      (f) => f[0] === "body" && f[2] === "Rich Text",
    ),
  );
  assert(
    M.COMPONENTS.CampaignAlert.some(
      (f) => f[0] === "endsAt" && f[2] === "Datetime",
    ),
  );
  assert(
    M.modelRecords().some((r) =>
      value(r, "__Short description").includes("not scheduled publishing"),
    ),
  );
});
