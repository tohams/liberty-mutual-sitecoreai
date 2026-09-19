"use strict";

// A deliberately separate workflow. Existing Basic Workflow and its users,
// states, commands and ACLs are never provisioning targets.
const assert = require("node:assert/strict");
const { norm, IDS: RESOURCE } = require("./resource-page-authoring-model.cjs");
function brace(value) {
  const raw = norm(value);
  assert(/^[a-f\d]{32}$/.test(raw), "A native reference must be a GUID.");
  return `{${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}}`.toUpperCase();
}

const SITE = "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal";
const CONTENT_ROOT = SITE + "/Home/workshop-practice";
const PRACTICE_TEMPLATE_PATH = "/sitecore/templates/Project/LibertyMutual/WorkshopPracticePage";
const WORKFLOW_ROOT = "/sitecore/system/Workflows/Liberty Mutual Workshop Review";
const MARKER = "Liberty Mutual workshop editorial workflow v1";
const ROLE_PREFIX = "sitecore\\Liberty Mutual Workshop ";
const CLIENT_PUBLISHING = "sitecore\\Sitecore Client Publishing";
const PUBLISH_ACTION = Object.freeze({
  type: "Sitecore.Workflows.Simple.PublishAction, Sitecore.Kernel",
  // The native action resolves database names, not publishing-target display
  // names. The Edge target's configured database is experienceedge.
  parameters: "deep=0&related=0&smart=1&targets=experienceedge&alllanguages=0&languages=en&itemlanguage=0",
});
const ROLES = Object.freeze({
  author: ROLE_PREFIX + "Author",
  approver: ROLE_PREFIX + "Approver",
  allPages: ROLE_PREFIX + "All pages",
});
const TEMPLATES = Object.freeze({
  workflow: "1c0acc50-37be-4742-b43c-96a07a7410a5",
  state: "4b7e2da9-de43-4c83-88c3-02f042031d04",
  command: "cb01f9fc-c187-46b3-ab0b-97a8468d8303",
  action: "66882e97-c8aa-4e37-8901-7a8aa35ed2ed",
  definition: "ab86861a-6030-46c5-b394-e8f99e8b87db",
  portalPage: RESOURCE.portalPageTemplate,
});
const PATHS = Object.freeze({
  workflow: WORKFLOW_ROOT,
  draft: WORKFLOW_ROOT + "/Draft",
  awaiting: WORKFLOW_ROOT + "/Awaiting approval",
  approved: WORKFLOW_ROOT + "/Approved",
  submit: WORKFLOW_ROOT + "/Draft/Submit",
  approve: WORKFLOW_ROOT + "/Awaiting approval/Approve",
  reject: WORKFLOW_ROOT + "/Awaiting approval/Return to author",
  publish: WORKFLOW_ROOT + "/Approved/Auto Publish",
});
const FIELD_NAMES = Object.freeze({
  security: "__Security", workflow: "__Workflow", state: "__Workflow state",
  marker: "__Short description", initial: "Initial state", next: "Next state", final: "Final",
});

function pairNumber(value) {
  assert(typeof value === "string" && /^(0[1-9])$/.test(value), "Use workshop pair 01 through 09 (01 is the presenter page).");
  return value;
}
function pairRole(number) { return ROLE_PREFIX + "Pair " + pairNumber(number); }
function pagePath(number) { return CONTENT_ROOT + "/pair-" + pairNumber(number); }
function roleSpecs(pairNumbers) {
  assert(Array.isArray(pairNumbers) && pairNumbers.length && new Set(pairNumbers).size === pairNumbers.length, "Provide unique workshop pair numbers.");
  const client = ["sitecore\\Sitecore Client Users", "sitecore\\Sitecore Client Authoring"];
  return [
    { name: ROLES.author, memberOf: client },
    { name: ROLES.approver, memberOf: client },
    { name: ROLES.allPages, memberOf: [] },
    ...pairNumbers.map(number => ({ name: pairRole(number), memberOf: [] })),
  ];
}

const READ_ONLY = Object.freeze({ "item:read": true, "item:write": false, "item:create": false, "item:delete": false, "item:rename": false, "item:admin": false });
const EDIT_PAGE = Object.freeze({ ...READ_ONLY, "item:write": true });
function aclEntry(role, item, descendants = {}) {
  assert(role.startsWith(ROLE_PREFIX) && !/[|\r\n]/.test(role), "Only workshop roles can receive an ACL entry.");
  const encode = rights => Object.entries(rights).map(([right, allowed]) => {
    assert(/^(item:(read|write|create|delete|rename|admin)|workflowState:(write|delete)|workflowCommand:execute)$/.test(right) && typeof allowed === "boolean", "Unexpected right in workshop ACL.");
    return (allowed ? "+" : "-") + right;
  });
  return ["ar", role, "pe", ...encode(item), "pd", ...encode(descendants), ""].join("|");
}
function ownedAcl(entries) { return entries.map(([role, item, descendants]) => aclEntry(role, item, descendants)).join(""); }
function mergeAcl(current, entries) {
  assert(typeof current === "string", "Native ACL must be a string.");
  const roles = new Set(entries.map(([role]) => role.toLowerCase()));
  assert(roles.size === entries.length, "An ACL cannot repeat an owned role.");
  if (!current) return ownedAcl(entries);
  // Keep unowned principals byte-for-byte. Refuse unfamiliar native ACL syntax.
  const blocks = current.match(/(?:ar|au)\|[^|]+\|(?:(?!(?:ar|au)\|)[\s\S])*/g);
  assert(blocks && blocks.join("") === current, "Unsupported ACL serialization; preserve it and inspect in Security Editor.");
  const retained = blocks.filter(block => {
    const parts = block.split("|");
    return parts[0] !== "ar" || !roles.has(parts[1].toLowerCase());
  });
  return retained.join("") + ownedAcl(entries);
}

function workflowSpecs(nativeIds = {}) {
  const common = [ROLES.author, ROLES.approver].map(role => [role, READ_ONLY, READ_ONLY]);
  const stateAcl = (authorWrite, approverWrite) => [
    [ROLES.author, { ...READ_ONLY, "workflowState:write": authorWrite, "workflowState:delete": false }],
    [ROLES.approver, { ...READ_ONLY, "workflowState:write": approverWrite, "workflowState:delete": false }],
  ];
  const commandAcl = author => [
    [ROLES.author, { ...READ_ONLY, "workflowCommand:execute": author }],
    [ROLES.approver, { ...READ_ONLY, "workflowCommand:execute": !author }],
  ];
  const result = [
    { key: "workflow", path: PATHS.workflow, parent: "/sitecore/system/Workflows", template: TEMPLATES.workflow, fields: { "__Short description": MARKER, "Default Comment Dialog Height": "250", "Default Comment Template": "{414AAF16-ACB7-43A9-A72E-C8C192154F78}" }, references: { "Initial state": "draft" }, acl: common },
    { key: "draft", path: PATHS.draft, parent: PATHS.workflow, template: TEMPLATES.state, fields: { Description: "Authors prepare and revise their workshop page.", Final: "", "__Sortorder": "10" }, acl: stateAcl(true, false) },
    { key: "awaiting", path: PATHS.awaiting, parent: PATHS.workflow, template: TEMPLATES.state, fields: { Description: "An approver reviews the submitted page and approves it or returns it to its author.", Final: "", "__Sortorder": "20" }, acl: stateAcl(false, true) },
    { key: "approved", path: PATHS.approved, parent: PATHS.workflow, template: TEMPLATES.state, fields: { Description: "Approved content is eligible for publication. Further author edits create a new draft version.", Final: "1", "__Sortorder": "30" }, acl: stateAcl(true, false) },
    { key: "submit", path: PATHS.submit, parent: PATHS.draft, template: TEMPLATES.command, fields: { "Suppress Comment": "", "__Sortorder": "10" }, references: { "Next state": "awaiting" }, acl: commandAcl(true) },
    { key: "approve", path: PATHS.approve, parent: PATHS.awaiting, template: TEMPLATES.command, fields: { "Suppress Comment": "", "__Sortorder": "10" }, references: { "Next state": "approved" }, acl: commandAcl(false) },
    { key: "reject", path: PATHS.reject, parent: PATHS.awaiting, template: TEMPLATES.command, fields: { "Suppress Comment": "", "__Sortorder": "20" }, references: { "Next state": "draft" }, acl: commandAcl(false) },
    { key: "publish", path: PATHS.publish, parent: PATHS.approved, template: TEMPLATES.action, fields: { Type: PUBLISH_ACTION.type, Parameters: PUBLISH_ACTION.parameters, "__Sortorder": "10" }, acl: common },
  ];
  return result.map(spec => ({ ...spec, id: nativeIds[spec.key], fields: {
    ...spec.fields,
    ...Object.fromEntries(Object.entries(spec.references || {}).filter(([, key]) => nativeIds[key]).map(([field, key]) => [field, brace(nativeIds[key])])),
  } }));
}

function contentTemplate({ path, itemId } = {}) {
  assert.equal(path, PRACTICE_TEMPLATE_PATH, "Practice content requires its dedicated WorkshopPracticePage template manifest.");
  assert(typeof itemId === "string" && /^[a-f\d]{32}$/i.test(norm(itemId)), "Practice template requires its recorded native item ID.");
  assert(![RESOURCE.pageTemplate, RESOURCE.portalPageTemplate].map(norm).includes(norm(itemId)), "Practice content cannot use ResourcePage or PortalPage directly.");
  return { path, id: itemId, template: TEMPLATES.definition };
}

function contentSpec({ pair, path, itemId }, template) {
  const templateSpec = contentTemplate(template);
  pairNumber(pair);
  assert(path === pagePath(pair), "Practice page path must match its pair exactly.");
  assert(typeof itemId === "string" && /^[a-f\d]{32}$/i.test(norm(itemId)), "Practice page requires its recorded native item ID.");
  return {
    pair, path, id: itemId, template: templateSpec.id,
    // Only the page itself is editable. Its local image and other descendants
    // stay read-only; this exercise edits native page fields, not app-backed metadata.
    acl: [[pairRole(pair), EDIT_PAGE, READ_ONLY], [ROLES.allPages, EDIT_PAGE, READ_ONLY]],
  };
}

module.exports = { SITE, CONTENT_ROOT, PRACTICE_TEMPLATE_PATH, WORKFLOW_ROOT, MARKER, ROLE_PREFIX, CLIENT_PUBLISHING, PUBLISH_ACTION, ROLES, PATHS, TEMPLATES, FIELD_NAMES, READ_ONLY, EDIT_PAGE, brace, norm, pairNumber, pairRole, pagePath, roleSpecs, aclEntry, ownedAcl, mergeAcl, workflowSpecs, contentTemplate, contentSpec };
