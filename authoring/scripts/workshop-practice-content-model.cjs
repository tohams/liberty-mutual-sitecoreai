"use strict";

const assert = require("node:assert/strict");
const R = require("./resource-page-authoring-model.cjs");
const W = require("./workshop-editorial-workflow-model.cjs");

const MARKER = "Liberty Mutual workshop practice content v1";
const TEMPLATE_PATH = R.TEMPLATES + "/WorkshopPracticePage";
const PAIRS = Object.freeze(Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(2, "0")));
const TITLE_FIELDS = Object.freeze({
  Title: "d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b",
  summary: "ca57c6ef-fb0b-5513-9c6e-a6b511e3af9a",
  body: "e4144560-576a-559b-9110-b56e9a58a338",
});
const METADATA = Object.freeze(["resourceType", "reviewedAt", "sourceLink", "businessFamily", "product", "channel"]);
const validId = id => typeof id === "string" && /^[a-f\d]{32}$/i.test(R.norm(id));
function idField(id) {
  assert(validId(id), "A recorded native ID is required.");
  const hex = R.norm(id);
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`.toUpperCase();
}

function pageLayout(path, pageId, imageId) {
  assert(path === W.CONTENT_ROOT || PAIRS.some(pair => path === W.pagePath(pair)), "Layout path is outside workshop practice.");
  assert(validId(pageId) && (!imageId || validId(imageId)), "Layout requires recorded native IDs.");
  const article = `<r uid="${R.brace(R.uuidV5(path + "/rendering/ResourceArticle"))}" id="${R.brace(R.IDS.articleRendering)}" ph="headless-resource-article" ds="${idField(pageId)}" par="FieldNames=${R.brace(R.IDS.articleVariant)}&amp;DynamicPlaceholderId=1" />`;
  const image = imageId ? `<r uid="${R.brace(R.uuidV5(path + "/rendering/ResourceImage"))}" id="${R.brace(R.IDS.rendering)}" ph="${R.NESTED_PLACEHOLDER}" ds="${idField(imageId)}" par="FieldNames=${R.brace(R.IDS.variant)}&amp;DynamicPlaceholderId=2" />` : "";
  return `<r><d id="${R.brace(R.IDS.device)}" l="${R.brace(R.IDS.articleLayout)}">${article}${image}</d></r>`;
}

function targets(workflow, pageTemplateId = R.IDS.pageTemplate) {
  assert(validId(pageTemplateId), "Practice page template requires its recorded native ID.");
  if (workflow) for (const key of ["workflowId", "draftId", "awaitingId", "approvedId"]) assert(validId(workflow[key]), "Workflow manifest is incomplete.");
  const common = {
    "__Short description": MARKER,
  };
  const pageFields = {
    ...common,
    // A nonempty placeholder overrides the inherited layout until the API's
    // generated page and local image IDs have been recorded and verified.
    "__Renderings": "<r/>",
    "__Final Renderings": "",
    ...Object.fromEntries(METADATA.map(name => [name, ""])),
    state: "All",
  };
  const result = [{
    kind: "root", path: W.CONTENT_ROOT, parentPath: W.SITE + "/Home", templateId: pageTemplateId,
    fields: { ...pageFields, "__Display name": "Workshop practice", Title: "Workshop practice", summary: "Practice creating, reviewing and publishing content together.", body: "<p>Open the page assigned to your workshop pair in Page Builder. Your author prepares the update, and your approver reviews it before publication.</p>" },
  }];
  for (const pair of PAIRS) {
    const path = W.pagePath(pair);
    const label = pair === "01" ? "Demo" : `Pair ${pair}`;
    result.push({
      kind: "page", pair, path, parentPath: W.CONTENT_ROOT, templateId: pageTemplateId,
      fields: {
        ...pageFields,
        "__Display name": label,
        "__Sortorder": String(Number(pair) * 10),
        "__Default workflow": workflow ? idField(workflow.workflowId) : "",
        "__Workflow": workflow ? idField(workflow.workflowId) : "",
        "__Workflow state": workflow ? idField(workflow.draftId) : "",
        Title: `${label}: prepare your next client conversation`,
        summary: "A clear plan helps your team prepare for the next client conversation.",
        body: "<h2>Prepare a useful conversation</h2><p>Review the client's current needs and gather the details that will help your team respond.</p><h2>Agree on the next step</h2><p>Capture the questions to resolve and confirm who will follow up.</p>",
      },
    });
    result.push({ kind: "data", pair, path: path + "/Data", parentPath: path, templateId: R.IDS.dataTemplate, fields: { ...common } });
    result.push({ kind: "image", pair, path: path + "/Data/Resource image", parentPath: path + "/Data", templateId: R.IDS.imageTemplate, fields: { ...common, image: "", caption: "" } });
  }
  return result;
}

function assertTarget(spec, pageTemplateId = R.IDS.pageTemplate) {
  const known = targets(undefined, pageTemplateId).find(target => target.path === spec.path);
  assert(known && known.kind === spec.kind && known.parentPath === spec.parentPath && R.norm(known.templateId) === R.norm(spec.templateId), "Unknown practice-content target.");
  return known;
}

module.exports = { MARKER, TEMPLATE_PATH, PAIRS, TITLE_FIELDS, METADATA, validId, idField, pageLayout, targets, assertTarget };
