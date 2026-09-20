"use strict";
/** Bounded content seed only; the installed campaign authoring model is reused. */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const C = require("./campaign-authoring-model.cjs");
const ROOT_PATH = C.SITE + "/Home/practice";
const FOLDER_TEMPLATE = "a87a00b1-e6db-45ab-8b54-636fec3b5523";
const NUMBERS = Object.freeze(Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0")));
const MARKER = "Liberty Mutual isolated authoring practice — numbered pages 01–15";
function validId(id) {
  if (typeof id !== "string") return false;
  const raw = id.startsWith("{") && id.endsWith("}") ? id.slice(1, -1) : id;
  return /^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(raw);
}
function idField(id) {
  assert(validId(id), "A native GUID is required.");
  const n = C.norm(id).toUpperCase();
  return `{${n.slice(0, 8)}-${n.slice(8, 12)}-${n.slice(12, 16)}-${n.slice(16, 20)}-${n.slice(20)}}`;
}
function pagePath(number) {
  assert(NUMBERS.includes(number), "Practice number is outside 01–15.");
  return ROOT_PATH + "/practice-" + number;
}
function practiceContent(number, instanceName) {
  const fields = Object.fromEntries(Object.entries(C.CONTENT[instanceName]).map(([name, value]) => [name, value
    .replace("your client knowledge and a clear", "your client knowledge, and a clear")
    .replace("the work, locations and changes", "the work, locations, and changes")
    .replace("the operation, risk locations and business changes", "the operation, risk locations, and business changes")
    .replace("location details, relevant experience and any outstanding questions", "location details, relevant experience, and any outstanding questions")
  ]));
  if (instanceName === "Campaign introduction") fields.eyebrow = "Practice " + number;
  return fields;
}
function targets() {
  const common = { "__Short description": MARKER, "__Never publish": "1" };
  const result = [{
    path: ROOT_PATH,
    parentPath: C.SITE + "/Home",
    kind: "root",
    templateId: FOLDER_TEMPLATE,
    fields: { ...common, "__Display name": "Practice", "__Sortorder": "50" },
  }];
  for (const number of NUMBERS) {
    const path = pagePath(number), title = "Practice " + number;
    result.push({
      path, parentPath: ROOT_PATH, kind: "page", number,
      templateId: C.uid(C.TP + "/CampaignPage"),
      fields: {
        ...common, "__Display name": title, Title: title, NavigationTitle: title,
        "__Sortorder": String(Number(number) * 100),
        "__Renderings": C.layout(path), "__Final Renderings": "",
        "__Workflow": idField(C.IDS.workflow), "__Default workflow": idField(C.IDS.workflow),
        "__Workflow state": idField(C.IDS.draft),
      },
    });
    result.push({ path: path + "/Data", parentPath: path, kind: "data", number, templateId: C.uid(C.TP + "/CampaignDataFolder"), fields: { ...common } });
    for (const instance of C.instances) result.push({
      path: path + "/Data/" + instance.name, parentPath: path + "/Data", kind: "component", number,
      templateId: C.uid(C.TP + "/" + instance.component),
      fields: {
        ...common, ...practiceContent(number, instance.name),
        "__Workflow": idField(C.IDS.datasourceWorkflow), "__Default workflow": idField(C.IDS.datasourceWorkflow),
        "__Workflow state": idField(C.IDS.datasourceDraft),
      },
    });
  }
  return result;
}
const CONTRACT_SHA256 = crypto.createHash("sha256").update(JSON.stringify(targets())).digest("hex");
module.exports = { ROOT_PATH, FOLDER_TEMPLATE, NUMBERS, MARKER, validId, idField, pagePath, targets, CONTRACT_SHA256 };
