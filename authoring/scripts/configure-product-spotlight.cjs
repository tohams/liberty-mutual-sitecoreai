#!/usr/bin/env node
'use strict';
/** Explicit Products placement migration. Default: read-only plan.
 * Usage: node authoring/scripts/configure-product-spotlight.cjs ENVIRONMENT
 *   --baseline ABSOLUTE_BEFORE_SNAPSHOT [--apply] [--journal ABSOLUTE_JSON_PATH]
 * Separate action: ENVIRONMENT --approve-datasources [--apply]
 * One-time correction: ENVIRONMENT --normalize-empty-neutral-link [--apply]
 *
 * The baseline is the bounded Authoring API snapshot used to review this change.
 * Applies only an additive Available Renderings entry and a named Products draft
 * version. Never approves the page, publishes, changes shared layouts, or creates
 * affinity/campaign configuration. Datasource approval is a separate action.
 *
 * Apply intent is journaled beside the baseline unless --journal is supplied.
 * If a native response is lost, run the plan again: a unique named version and
 * stable rendering ID identify partial work. Unexpected author edits stop the
 * migration. There are no automatic remote retries. Authoring updateItem exposes
 * no revision precondition; pre-write/read-back checks cannot replace coordinating
 * native editing while this short migration runs.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const SITE = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal';
const NAME = 'Product affinity spotlight';
const IDS = Object.freeze({
  page: 'd8898b95-6720-5acf-86b6-b434c3fe7f57',
  pageTemplate: 'd8e5d742-1ae3-5b2e-aba9-553d4a53c3fc',
  available: 'e49da1ae-6054-5b18-b221-384f51d1e376',
  availableTemplate: '76da0a8d-fc7e-42b2-af1e-205b49e43f98',
  rendering: '1962d596-4187-51c9-a91f-4d39a9318b51',
  template: 'df47f749-485c-5e86-88e4-85ab46a7d7ca',
  placeholder: '8428148d-9f3b-5323-a166-88d0c5ea56ac',
  layout: '75cfc4f6-9a69-52b3-97c3-11a6f1fabe89',
  variant: 'df2d5d60-4b81-538a-973c-9e2f010780f3',
  neutral: '357ea7de-4039-51ad-80ff-cae025c56afb',
  workers_compensation: '6b4c5446-2e57-5a07-850e-36ed8beb7e4d',
  household: '9b8719f2-aa52-592d-b2de-26b921b90761',
  device: 'fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3',
  originalInstance: '3b09dc40-6e16-5b62-903f-36e772860886',
  pageWorkflow: 'b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f',
  pageDraft: '57cc7dce-e6b1-4564-9581-0e5850b8bdf2',
  pageApproved: 'f7fe5bdd-a991-4a58-9735-cd08f9b097ab',
  datasourceWorkflow: 'a053ed9f-4099-4682-9411-2b4c98e481e4',
  datasourceDraft: '12ffac4c-565f-4c9a-b63e-7f77e96b4d1f',
  datasourceApproved: '4460e76c-87e9-4859-9de6-de122774937f',
  datasourceApproveCommand: '5abaf974-916d-4d4a-a23b-0bc17ca34137',
});
const PAGE_PATH = SITE + '/Home/products';
const AVAILABLE_PATH = SITE + '/Presentation/Available Renderings/Agent portal';
const PLACEHOLDER = 'headless-products-spotlight';
const norm = value => String(value || '').replace(/[{}-]/g, '').toLowerCase();
const braces = value => '{' + value.toUpperCase() + '}';
const valueOf = (item, name) => item.fields.find(field => field.name === name)?.value ?? '';
const fail = message => { throw new Error('ProductSpotlight: ' + message); };
const insist = (condition, message) => { if (!condition) fail(message); };
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function uuidV5(name) {
  const namespace = Buffer.from('4a098fe0ad6b472298624e56b855337a', 'hex');
  const bytes = crypto.createHash('sha1').update(namespace).update(name, 'utf8').digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const INSTANCE = uuidV5(PAGE_PATH + '/rendering/ProductSpotlight');

function finalLayout() {
  return `<r xmlns:p="p" xmlns:s="s" p:p="1"><d id="${braces(IDS.device)}" s:l="${braces(IDS.layout)}"><r uid="${braces(INSTANCE)}" p:after="r[@uid='${braces(IDS.originalInstance)}']" s:id="${braces(IDS.rendering)}" s:ph="${PLACEHOLDER}" s:ds="${braces(IDS.neutral)}" s:par="FieldNames=${braces(IDS.variant)}&amp;DynamicPlaceholderId=2" /></d></r>`;
}

// Parse XML with the Python standard library, without shell interpolation or a
// new package dependency. Reject DTD/entity declarations and bound input size.
function xmlShape(xml, rootName = 'r') {
  if (!xml.trim()) return null;
  insist(xml.length <= 262144 && !/<!/i.test(xml), 'Unsupported layout XML; inspect the existing layout privately.');
  const parser = `import json,sys,xml.etree.ElementTree as E
def node(x):
 return [x.tag,sorted(x.attrib.items()),(x.text or '').strip(),[node(c) for c in x]]
try:
 r=E.fromstring(sys.stdin.read())
 if r.tag!=sys.argv[1]: raise ValueError('Invalid root')
 print(json.dumps(node(r)))
except Exception:
 sys.exit(2)
`;
  const result = spawnSync('python3', ['-c', parser, rootName], { input: xml, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  insist(result.status === 0, 'Layout XML could not be parsed; Python 3 is required.');
  return JSON.parse(result.stdout);
}

function layoutStatus(xml) {
  const shape = xmlShape(xml);
  if (!shape) return 'empty';
  if (JSON.stringify(shape) === JSON.stringify(xmlShape(finalLayout()))) return 'configured';
  fail('Existing final layout differs from this migration. Preserve it and review the native page before continuing.');
}

function appendRendering(current) {
  const text = current.trim();
  const tokens = text ? text.split(/[|\r\n]+/).map(value => value.trim()).filter(Boolean) : [];
  insist(tokens.every(value => /^\{[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}$/i.test(value)), 'Available Renderings contains an unsupported value.');
  if (tokens.some(value => norm(value) === norm(IDS.rendering))) return current;
  // Preserve the original value verbatim, including ordering and all existing IDs.
  return current + (text ? '|' : '') + braces(IDS.rendering);
}

function validateDatasourceLink(item) {
  const value = valueOf(item, 'actionLink');
  if (!value.trim()) return;
  insist(/^<link(?:\s|\/?>)/.test(value.trim()), 'Datasource actionLink is not empty or valid General Link XML. Correct the specific native field before approval.');
  xmlShape(value, 'link');
}

function fieldHash(fields) {
  return digest(fields.map(field => ({ fieldId: norm(field.fieldId), value: field.value }))
    .sort((a, b) => a.fieldId.localeCompare(b.fieldId)));
}
const VERSION_METADATA = new Set(['__Revision', '__Updated', '__Updated by', '__Created', '__Created by', '__Version Name', '__Lock', '__Workflow state', '__Final Renderings']);
function preservedHash(item) {
  return fieldHash(item.fields.filter(field => !VERSION_METADATA.has(field.name)));
}

function preservedPageHash(item, baseline) {
  const copy = structuredClone(item);
  const validFrom = valueOf(item, '__Valid from');
  const original = valueOf(baseline, '__Valid from');
  if (validFrom !== original) {
    // Native addVersion initializes publication availability to the new version's
    // creation timestamp. A different scheduled date remains a protected change.
    insist(original === '' && /^\d{8}T\d{6}Z$/.test(validFrom) && validFrom === valueOf(item, '__Created'),
      'The new version has an unexpected publication availability date.');
    copy.fields.find(field => field.name === '__Valid from').value = original;
  }
  return preservedHash(copy);
}

async function acceptGeneratedThumbnail(api, baseline, current) {
  const original = valueOf(baseline, '__Thumbnail');
  const thumbnail = valueOf(current, '__Thumbnail');
  if (thumbnail === original) return baseline;
  insist(original === '' && thumbnail.trim(), 'An existing authored thumbnail changed; inspect native editing before continuing.');
  const shape = xmlShape(thumbnail, 'image');
  const attributes = Object.fromEntries(shape[1]);
  insist(Object.keys(attributes).length === 1 && attributes.mediaid && !shape[2] && !shape[3].length && /^[a-f\d]{32}$/.test(norm(attributes.mediaid)), 'Unexpected generated thumbnail field.');
  const media = await api.readThumbnail(attributes.mediaid);
  const expectedPath = SITE.replace('/sitecore/content/', '/sitecore/media library/Project/') + '/System/D/8/8/9/thumbnail_' + norm(IDS.page).toUpperCase();
  insist(media?.path === expectedPath && norm(media.itemId) === norm(attributes.mediaid) && norm(media.template?.templateId) === 'f1828a2c7e5d4bbd98ca320474871548', 'Thumbnail is not the native generated Products-page image.');
  const adjusted = structuredClone(baseline);
  insist(adjusted.fields.some(field => field.name === '__Thumbnail'), 'Reviewed baseline is missing its thumbnail field.');
  adjusted.fields.find(field => field.name === '__Thumbnail').value = thumbnail;
  return adjusted;
}

function unlocked(item) {
  const lock = valueOf(item, '__Lock').trim();
  insist(!lock || /^<r\s*\/\s*>$/.test(lock), 'A target item is locked; resolve native editing ownership before applying.');
}
function assertIdentity(item, id, itemPath, template) {
  insist(item && norm(item.itemId) === norm(id) && item.path === itemPath, 'Item identity or path did not match the reviewed scope.');
  if (template) insist(norm(item.template.templateId) === norm(template), 'Unexpected template on an owned target.');
}
function assertWorkflow(item, workflowId, states) {
  insist(norm(valueOf(item, '__Workflow')) === norm(workflowId), 'Unexpected native workflow on an owned target.');
  insist(states.some(state => norm(valueOf(item, '__Workflow state')) === norm(state)), 'Unexpected workflow state on an owned target.');
}

function baselineFrom(snapshot) {
  const record = snapshot?.items?.productsPage;
  insist(snapshot.database === 'master' && snapshot.language === 'en' && record?.item?.path === PAGE_PATH && norm(record.item.itemId) === norm(IDS.page), 'Baseline is not the reviewed master English Products snapshot.');
  insist(Array.isArray(record.fields) && record.fieldsSha256 === fieldHash(record.fields), 'Baseline field checksum failed.');
  const baseline = { ...record.item, fields: record.fields };
  insist(baseline.version === 1 && !valueOf(baseline, '__Final Renderings').trim(), 'This migration requires the reviewed version 1 with empty final layout.');
  assertWorkflow(baseline, IDS.pageWorkflow, [IDS.pageApproved]);
  unlocked(baseline);
  const shared = valueOf(baseline, '__Renderings');
  insist(shared.toLowerCase().includes(IDS.originalInstance) && !shared.toLowerCase().includes(INSTANCE), 'The reviewed shared layout does not contain the original Products guidance.');
  xmlShape(shared);
  return baseline;
}

function planPage(baseline, latest) {
  assertIdentity(latest, IDS.page, PAGE_PATH, IDS.pageTemplate);
  const named = latest.versions.filter(version => version.versionName === NAME);
  insist(named.length <= 1, 'Multiple named migration versions exist; inspect them before continuing.');
  if (!named.length) {
    insist(latest.version === baseline.version && latest.revision.value === baseline.revision.value && fieldHash(latest.fields) === fieldHash(baseline.fields), 'Products changed since the reviewed baseline. Capture and review it before proceeding.');
    insist(layoutStatus(valueOf(latest, '__Final Renderings')) === 'empty', 'Products already has a final layout.');
    unlocked(latest);
    return { action: 'create-named-draft', version: baseline.version + 1 };
  }
  insist(named[0].version === latest.version && latest.version === baseline.version + 1 && latest.versionName === NAME,
    'The migration version is not the sole next/latest version; preserve subsequent author work.');
  insist(preservedPageHash(latest, baseline) === preservedHash(baseline), 'A field outside the planned final-layout/workflow changes differs from the baseline.');
  const status = layoutStatus(valueOf(latest, '__Final Renderings'));
  assertWorkflow(latest, IDS.pageWorkflow, [IDS.pageDraft, IDS.pageApproved]);
  if (status === 'configured') return { action: 'already-configured', version: latest.version };
  unlocked(latest);
  return { action: 'resume-named-draft', version: latest.version };
}

function connection(environment, apply) {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, '.sitecore/user.json'), 'utf8'));
  const endpointFor = name => Object.entries(config.endpoints).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  const endpoint = endpointFor(environment);
  insist(endpoint?.host && (!apply || endpoint.allowWrite === true), 'Select an existing writable CLI environment for apply.');
  const origin = new URL(endpoint.host);
  insist(origin.protocol === 'https:' && !origin.username && !origin.password && !origin.search && !origin.hash, 'The configured authoring endpoint must use HTTPS.');
  let auth = endpoint;
  const seen = new Set();
  while (auth.ref) {
    const reference = auth.ref.toLowerCase();
    insist(!seen.has(reference), 'CLI authentication contains a reference cycle.');
    seen.add(reference);
    auth = endpointFor(reference);
    insist(auth, 'CLI authentication reference is unavailable.');
  }
  insist(auth.accessToken, 'Use the normal Sitecore CLI login before this operation.');
  const request = async (query, variables = {}) => {
    insist(apply || /^query\b/.test(query), 'Read-only mode rejected a mutation.');
    let response, result;
    try {
      response = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', origin), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15000),
      });
      result = await response.json();
    } catch {
      fail('Native request did not return a confirmed result. Inspect the journal and rerun the plan before applying again.');
    }
    insist(response.ok && !result.errors?.length && result.data, `Authoring request failed (HTTP ${response.status}); raw response suppressed. Rerun the plan before retrying.`);
    return result.data;
  };
  return { origin: origin.origin, request };
}

function nativeApi(request) {
  const meta = 'itemId path version versionName template{templateId} revision:field(name:"__Revision"){value} sharedRevision:field(name:"__Shared revision"){value} versions(allLanguages:false){version versionName} workflow{canEdit canSave workflow{workflowId initialState{stateId}} workflowState{stateId final}}';
  const read = async (id, version) => {
    const where = { database: 'master', itemId: id, language: 'en', ...(version ? { version, existingVersionOnly: true } : {}) };
    const query = `query($where:ItemQueryInput!){item(where:$where){${meta}}}`;
    const before = (await request(query, { where })).item;
    insist(before, 'A required item or English version is missing.');
    where.version = before.version;
    where.existingVersionOnly = true;
    const fields = [];
    let after = null;
    do {
      const data = await request('query($where:ItemQueryInput!,$after:String){item(where:$where){fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false){nodes{fieldId name value}pageInfo{hasNextPage endCursor}}}}', { where, after });
      const page = data.item?.fields;
      insist(page?.nodes && (!page.pageInfo.hasNextPage || page.pageInfo.endCursor), 'Native field pagination failed.');
      fields.push(...page.nodes);
      insist(fields.length <= 1000, 'Unexpected field count on an owned item.');
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (after);
    const end = (await request(query, { where })).item;
    insist(end && before.revision.value === end.revision.value && before.sharedRevision.value === end.sharedRevision.value, 'An item changed during the native read.');
    return { ...end, fields };
  };
  const update = async (item, name, value) => request('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path version}}}', {
    input: { database: 'master', itemId: item.itemId, language: 'en', version: item.version, fields: [{ name, value }] },
  });
  return {
    read, update,
    readThumbnail: async id => (await request('query($id:ID!){item(where:{database:"master",itemId:$id,language:"en"}){itemId path template{templateId}}}', { id })).item,
    addVersion: baseline => request('mutation($input:AddItemVersionInput!){addItemVersion(input:$input){item{itemId path version versionName}}}', {
      input: { database: 'master', itemId: IDS.page, language: 'en', version: baseline.version, versionName: NAME },
    }),
    startWorkflow: item => request('mutation($input:StartWorkflowInput!){startWorkflow(input:$input){successful}}', {
      input: { item: { database: 'master', itemId: IDS.page, language: 'en', version: item.version, existingVersionOnly: true } },
    }),
  };
}

async function unchanged(api, previous) {
  const current = await api.read(previous.itemId, previous.version);
  insist(current.revision.value === previous.revision.value && current.sharedRevision.value === previous.sharedRevision.value && fieldHash(current.fields) === fieldHash(previous.fields), 'An item changed before a planned mutation. Rerun the plan after reviewing native edits.');
  unlocked(current);
  if (current.workflow) insist(current.workflow.canEdit && current.workflow.canSave, 'Native workflow does not allow editing this item.');
  return current;
}

async function migrate({ api, baseline, apply, record = () => {} }) {
  let latest = await api.read(IDS.page);
  baseline = await acceptGeneratedThumbnail(api, baseline, latest);
  let available = await api.read(IDS.available);
  assertIdentity(available, IDS.available, AVAILABLE_PATH, IDS.availableTemplate);
  insist(!valueOf(available, '__Workflow'), 'Available Renderings has an unexpected workflow; manage it through native authoring.');
  const pagePlan = planPage(baseline, latest);
  const list = appendRendering(valueOf(available, 'Renderings'));
  if (list !== valueOf(available, 'Renderings')) unlocked(available);
  const plan = { mode: apply ? 'apply' : 'read-only', page: { path: PAGE_PATH, versionName: NAME, ...pagePlan },
    availableRenderings: { path: AVAILABLE_PATH, action: list === valueOf(available, 'Renderings') ? 'already-included' : 'append-one-rendering', preserved: valueOf(available, 'Renderings'), proposed: list },
    renderingInstanceId: INSTANCE, finalLayout: finalLayout(), completion: 'Products remains a draft for native review. No page approval or publication.' };
  if (!apply) return plan;
  record('preflight-complete', { plan, baselineRevision: baseline.revision.value });
  if (list !== valueOf(available, 'Renderings')) {
    available = await unchanged(api, available);
    record('append-available-rendering', { itemId: IDS.available, revision: available.revision.value, value: list });
    await api.update(available, 'Renderings', list);
    const result = await api.read(IDS.available, available.version);
    assertIdentity(result, IDS.available, AVAILABLE_PATH, IDS.availableTemplate);
    insist(valueOf(result, 'Renderings') === list, 'Available Renderings read-back differs; inspect the journal before retrying.');
  }
  if (pagePlan.action === 'already-configured') {
    record('complete', { version: latest.version, pageAction: pagePlan.action });
    return { ...plan, completedVersion: latest.version };
  }
  if (pagePlan.action === 'create-named-draft') {
    latest = await unchanged(api, latest);
    // Re-read latest immediately before creation, so a new author version is not overlooked.
    insist(planPage(baseline, await api.read(IDS.page)).action === 'create-named-draft', 'Products acquired another version before creation.');
    record('create-version', { baseVersion: baseline.version, versionName: NAME, expectedVersion: baseline.version + 1 });
    await api.addVersion(baseline);
    latest = await api.read(IDS.page);
    baseline = await acceptGeneratedThumbnail(api, baseline, latest);
    insist(planPage(baseline, latest).action === 'resume-named-draft', 'New named Products version did not match the planned copy.');
    record('version-created', { version: latest.version, revision: latest.revision.value });
  }
  latest = await unchanged(api, latest);
  if (norm(valueOf(latest, '__Workflow state')) !== norm(IDS.pageDraft)) {
    insist(norm(latest.workflow?.workflow?.initialState?.stateId) === norm(IDS.pageDraft), 'Basic Workflow initial state differs from the verified Draft state.');
    record('start-workflow', { version: latest.version, revision: latest.revision.value });
    const result = await api.startWorkflow(latest);
    insist(result.startWorkflow?.successful, 'Native workflow did not report success; inspect and rerun the plan.');
    latest = await api.read(IDS.page, latest.version);
  }
  assertWorkflow(latest, IDS.pageWorkflow, [IDS.pageDraft]);
  insist(planPage(baseline, latest).action === 'resume-named-draft', 'Named draft changed before layout application.');
  latest = await unchanged(api, latest);
  record('apply-final-layout', { version: latest.version, revision: latest.revision.value, renderingInstanceId: INSTANCE });
  await api.update(latest, '__Final Renderings', finalLayout());
  latest = await api.read(IDS.page, latest.version);
  assertWorkflow(latest, IDS.pageWorkflow, [IDS.pageDraft]);
  insist(planPage(baseline, latest).action === 'already-configured', 'Final layout or protected fields differ after migration.');
  const source = await api.read(IDS.page, baseline.version);
  insist(fieldHash(source.fields) === fieldHash(baseline.fields), 'Original Products version changed; inspect native history before continuing.');
  record('complete', { version: latest.version, revision: latest.revision.value, workflowState: IDS.pageDraft });
  return { ...plan, completedVersion: latest.version, verified: 'Shared layout, original version and all protected fields preserved; final layout is the planned delta.' };
}

async function preflightDependencies(api) {
  const expected = [
    [IDS.rendering, '/sitecore/layout/Renderings/Project/LibertyMutual/ProductSpotlight', 'componentName', 'ProductSpotlight'],
    [IDS.placeholder, '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/' + PLACEHOLDER, 'Placeholder Key', PLACEHOLDER],
    [IDS.layout, '/sitecore/layout/Layouts/Project/LibertyMutual/ProductsLayout', 'Path', '/Views/SXA JSS/SXA JSS Layout.cshtml'],
    [IDS.variant, SITE + '/Presentation/Headless Variants/ProductSpotlight/Default'],
    [IDS.neutral, SITE + '/Data/ProductSpotlight/neutral'],
  ];
  for (const [id, itemPath, field, expectedValue] of expected) {
    const item = await api.read(id);
    assertIdentity(item, id, itemPath, id === IDS.neutral ? IDS.template : undefined);
    if (field) insist(valueOf(item, field) === expectedValue, 'A required model field differs from the deployed ProductSpotlight contract.');
    if (id === IDS.layout) insist(valueOf(item, 'Placeholders').split('|').some(value => norm(value) === norm(IDS.placeholder)), 'ProductsLayout does not expose the dedicated placeholder.');
    if (id === IDS.placeholder) insist(norm(valueOf(item, 'Allowed Controls')) === norm(IDS.rendering), 'The dedicated placeholder does not allow ProductSpotlight.');
    if (id === IDS.neutral) validateDatasourceLink(item);
  }
}

async function approveDatasources(api, request, apply) {
  const workflow = await request('query {item(where:{database:"master",itemId:"a053ed9f-4099-4682-9411-2b4c98e481e4",language:"en"}){path initial:field(name:"Initial state"){value}children{nodes{itemId final:field(name:"Final"){value}children{nodes{itemId next:field(name:"Next state"){value}}}}}}}');
  const draft = workflow.item?.children.nodes.find(item => norm(item.itemId) === norm(IDS.datasourceDraft));
  const approve = draft?.children.nodes.find(item => norm(item.itemId) === norm(IDS.datasourceApproveCommand));
  insist(workflow.item?.path === '/sitecore/system/Workflows/Basic Datasource Workflow' && norm(workflow.item.initial.value) === norm(IDS.datasourceDraft) && norm(approve?.next?.value) === norm(IDS.datasourceApproved), 'Datasource approval command no longer matches the verified native workflow.');
  const items = [];
  for (const name of ['neutral', 'workers_compensation', 'household']) {
    const item = await api.read(IDS[name]);
    assertIdentity(item, IDS[name], SITE + '/Data/ProductSpotlight/' + name, IDS.template);
    assertWorkflow(item, IDS.datasourceWorkflow, [IDS.datasourceDraft, IDS.datasourceApproved]);
    validateDatasourceLink(item);
    unlocked(item);
    items.push(item);
  }
  const result = { mode: apply ? 'apply' : 'read-only', action: 'approve-datasources', items: items.map(item => ({ path: item.path, version: item.version, action: norm(valueOf(item, '__Workflow state')) === norm(IDS.datasourceApproved) ? 'already-approved' : 'execute-native-approve', fields: Object.fromEntries(['eyebrow', 'headline', 'body', 'actionLink'].map(name => [name, valueOf(item, name)])) })) };
  if (!apply) return result;
  for (const item of items) {
    if (norm(valueOf(item, '__Workflow state')) === norm(IDS.datasourceApproved)) continue;
    await unchanged(api, item);
    const response = await request('mutation($input:ExecuteWorkflowCommandInput!){executeWorkflowCommand(input:$input){successful nextStateId}}', {
      input: { commandId: IDS.datasourceApproveCommand, comments: 'Approved ProductSpotlight content for the authorized native affinity demonstration.', item: { database: 'master', itemId: item.itemId, language: 'en', version: item.version, existingVersionOnly: true } },
    });
    insist(response.executeWorkflowCommand?.successful && norm(response.executeWorkflowCommand.nextStateId) === norm(IDS.datasourceApproved), 'Datasource approval did not return the verified final state; rerun the plan.');
    const after = await api.read(item.itemId, item.version);
    assertWorkflow(after, IDS.datasourceWorkflow, [IDS.datasourceApproved]);
    insist(preservedHash(item) === preservedHash(after), 'Datasource content changed during approval; inspect before publishing.');
  }
  return { ...result, publication: 'No publication performed.' };
}

async function normalizeEmptyNeutralLink(api, apply) {
  const item = await api.read(IDS.neutral);
  assertIdentity(item, IDS.neutral, SITE + '/Data/ProductSpotlight/neutral', IDS.template);
  const current = valueOf(item, 'actionLink');
  insist(current === '' || current === '""', 'Neutral actionLink contains authored content; the one-time correction refuses to replace it.');
  const plan = { mode: apply ? 'apply' : 'read-only', action: 'normalize-empty-neutral-link', path: item.path,
    version: item.version, revision: item.revision.value, currentValue: current, proposedValue: '',
    operation: current === '' ? 'already-empty' : 'replace-literal-two-quotes-with-empty' };
  if (!current) return plan;
  assertWorkflow(item, IDS.datasourceWorkflow, [IDS.datasourceDraft]);
  unlocked(item);
  if (!apply) return plan;
  await unchanged(api, item);
  await api.update(item, 'actionLink', '');
  const after = await api.read(IDS.neutral, item.version);
  assertIdentity(after, IDS.neutral, item.path, IDS.template);
  assertWorkflow(after, IDS.datasourceWorkflow, [IDS.datasourceDraft]);
  const expected = structuredClone(item);
  expected.fields.find(field => field.name === 'actionLink').value = '';
  insist(valueOf(after, 'actionLink') === '' && preservedHash(after) === preservedHash(expected), 'Neutral empty-link correction read-back failed; rerun its plan before retrying.');
  return { ...plan, verified: 'Only the empty neutral link was corrected; Draft retained. No approval or publication.' };
}

function journalWriter(filename, scope) {
  let journal = { schemaVersion: 1, ...scope, events: [] };
  if (fs.existsSync(filename)) {
    journal = JSON.parse(fs.readFileSync(filename, 'utf8'));
    insist(Object.entries(scope).every(([key, value]) => journal[key] === value), 'Existing migration journal belongs to a different baseline or environment.');
  }
  return (stage, details) => {
    journal.events.push({ recordedAt: new Date().toISOString(), stage, ...details });
    const temporary = filename + '.' + process.pid + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(journal, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temporary, filename);
    console.log(JSON.stringify({ stage, journal: filename, ...(details.version ? { version: details.version } : {}) }));
  };
}

async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args;
  const options = {};
  for (let index = 0; index < rest.length; index++) {
    const flag = rest[index];
    insist(!Object.hasOwn(options, flag), 'Duplicate option.');
    if (['--apply', '--approve-datasources', '--normalize-empty-neutral-link'].includes(flag)) options[flag] = true;
    else if (['--baseline', '--journal'].includes(flag) && rest[index + 1] && !rest[index + 1].startsWith('--')) options[flag] = rest[++index];
    else fail('Unknown or incomplete option.');
  }
  insist(environment && !environment.startsWith('--'), 'Usage: ENVIRONMENT --baseline ABSOLUTE_BEFORE_SNAPSHOT [--apply]; or ENVIRONMENT --approve-datasources [--apply].');
  const apply = options['--apply'] === true;
  const { request, origin } = connection(environment, apply);
  const api = nativeApi(request);
  if (options['--normalize-empty-neutral-link']) {
    insist(!options['--baseline'] && !options['--journal'] && !options['--approve-datasources'], 'Empty-link correction is a separate one-time action.');
    console.log(JSON.stringify(await normalizeEmptyNeutralLink(api, apply), null, 2));
    return;
  }
  if (options['--approve-datasources']) {
    insist(!options['--baseline'] && !options['--journal'], 'Datasource approval is a separate action without a page baseline or migration journal.');
    console.log(JSON.stringify(await approveDatasources(api, request, apply), null, 2));
    return;
  }
  insist(options['--baseline'] && path.isAbsolute(options['--baseline']), 'An absolute path to the reviewed before snapshot is required.');
  const snapshot = JSON.parse(fs.readFileSync(options['--baseline'], 'utf8'));
  insist(snapshot.environment?.toLowerCase() === environment.toLowerCase(), 'Baseline environment does not match the selected CLI environment.');
  const baseline = baselineFrom(snapshot);
  await preflightDependencies(api);
  const journal = options['--journal'] || path.join(path.dirname(options['--baseline']), 'product-spotlight-migration-' + digest(origin).slice(0, 12) + '.json');
  insist(path.isAbsolute(journal) && path.resolve(journal) !== path.resolve(options['--baseline']), 'Journal must be an absolute separate JSON path.');
  const record = apply ? journalWriter(journal, { origin, pageId: IDS.page, baselineHash: fieldHash(baseline.fields), renderingInstanceId: INSTANCE }) : undefined;
  const result = await migrate({ api, baseline, apply, record });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { IDS, INSTANCE, NAME, PAGE_PATH, AVAILABLE_PATH, finalLayout, xmlShape, layoutStatus, appendRendering, validateDatasourceLink, normalizeEmptyNeutralLink, fieldHash, preservedHash, preservedPageHash, acceptGeneratedThumbnail, baselineFrom, planPage, migrate, main };
if (require.main === module) main().catch(error => {
  console.error(error.message?.startsWith('ProductSpotlight: ') ? error.message : 'ProductSpotlight: Operation failed; private native details were suppressed. Inspect the recorded stage and rerun the read-only plan.');
  process.exitCode = 1;
});
