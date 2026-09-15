#!/usr/bin/env node
'use strict';
/**
 * One-time, scoped resource creation configuration. Default is read-only.
 * Capture: ENVIRONMENT --snapshot /absolute/before.json
 * Review:  ENVIRONMENT --baseline /absolute/before.json
 * Apply:   ENVIRONMENT --baseline /absolute/before.json --apply --journal /absolute/journal.json
 *
 * First install the reviewed ResourceImage model and CreateOnly branch scaffold
 * using the normal Sitecore CLI. This script neither creates nor publishes items.
 * It changes only the seven declared authoring configuration items and only the
 * declared fields. It never changes a resource article's editorial fields.
 * Authoring GraphQL has no atomic revision condition: coordinate authoring for
 * the brief apply window. Fresh reads and verified readback detect divergence;
 * uncertain writes stop and are never automatically retried.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const M = require('./resource-page-authoring-model.cjs');
const { SITE, TEMPLATES, IDS, FIELDS, norm, brace, branchLayout, appendId, appendRule } = M;
const ROOT = path.resolve(__dirname, '../..');
const META = new Set(['__Revision', '__Shared revision', '__Unversioned revision', '__Updated', '__Updated by']);
const value = (version, name) => version.fields.find(f => f.name === name)?.value ?? '';
const versionKey = v => `${v.language}:${v.version}`;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const TARGETS = [
  { id: IDS.articleRendering, path: '/sitecore/layout/Renderings/Project/LibertyMutual/ResourceArticle', template: '04646a89-996f-4ee7-878a-ffdbf1f0ef0d',
    fields: [['OtherProperties', FIELDS.otherProperties, current => {
      if (current === '' || current === 'IsRenderingsWithDynamicPlaceholders=true') return 'IsRenderingsWithDynamicPlaceholders=true';
      throw new Error('ResourceArticle has custom properties; preserve and review them before enabling its dynamic placeholder.');
    }], ['Placeholders', FIELDS.placeholders, () => brace(IDS.placeholder)], ['Can select Page as a data source', FIELDS.pageDatasource, () => '1'], ['Datasource Location', FIELDS.datasourceLocation, () => '']] },
  { id: IDS.pageDefaults, path: TEMPLATES + '/ResourcePage/__Standard Values', template: IDS.pageTemplate,
    fields: [['__Masters', FIELDS.masters, () => brace(IDS.dataTemplate)]] },
  { id: IDS.resources, path: SITE + '/Home/resources', template: IDS.portalPageTemplate,
    fields: [['__Masters', FIELDS.masters, () => brace(IDS.branch)]] },
  { id: IDS.branchFolder, path: SITE + '/Presentation/Page Branches', template: IDS.branchFolderTemplate,
    fields: [['Rule', IDS.ruleField, appendRule]] },
  { id: IDS.prototype, path: M.PROTOTYPE_PATH, template: IDS.pageTemplate,
    fields: [['__Masters', FIELDS.masters, () => brace(IDS.dataTemplate)], ['__Renderings', FIELDS.renderings, branchLayout]] },
  { id: IDS.available, path: SITE + '/Presentation/Available Renderings/Agent portal', template: IDS.availableTemplate,
    fields: [['Renderings', FIELDS.availableRenderings, current => appendId(current, IDS.rendering)]] },
  // Set child/page overrides before changing their parent standard value.
  // Otherwise the parent's new value becomes an unplanned intermediate value
  // on ResourcePage and Resources, correctly tripping the preservation guard.
  { id: IDS.portalDefaults, path: TEMPLATES + '/PortalPage/__Standard Values', template: IDS.portalPageTemplate,
    fields: [['__Masters', FIELDS.masters, () => brace(IDS.portalPageTemplate)]] },
];
function identity(item, target) {
  assert(item && norm(item.itemId) === norm(target.id) && item.path === target.path &&
    norm(item.template.templateId) === norm(target.template), 'A target identity, path or template changed.');
  assert(item.versions.length && new Set(item.versions.map(versionKey)).size === item.versions.length, 'Missing or duplicate item versions.');
}
function semantic(item, omitMetadata = true) {
  return { itemId: norm(item.itemId), path: item.path, template: norm(item.template.templateId), parent: norm(item.parent.itemId),
    versions: item.versions.map(v => ({ key: versionKey(v), fields: v.fields.filter(f => !omitMetadata || !META.has(f.name))
      .map(f => [norm(f.fieldId), f.name, f.value]).sort((a, b) => a[0].localeCompare(b[0])) })).sort((a, b) => a.key.localeCompare(b.key)) };
}
function unlocked(item) {
  for (const version of item.versions) {
    assert(!value(version, '__Lock').trim() || /^<r\s*\/\s*>$/.test(value(version, '__Lock').trim()), 'An authoring configuration target is locked.');
  }
}
function planItem(item, target) {
  identity(item, target); unlocked(item);
  const changes = [];
  for (const [name, id, afterFor] of target.fields) {
    const existing = item.versions.map(v => v.fields.find(f => norm(f.fieldId) === norm(id)));
    assert(existing.every(f => f && f.name === name), 'A configured field definition changed.');
    const beforeValues = new Set(existing.map(f => f.value));
    assert(beforeValues.size === 1, 'A shared authoring field differs across versions.');
    const before = existing[0].value, after = afterFor(before);
    if (before !== after) changes.push({ name, fieldId: id, before, after });
  }
  return { itemId: target.id, path: target.path, changes };
}
function expectedItem(before, plan) {
  const expected = structuredClone(before);
  for (const version of expected.versions) for (const change of plan.changes) {
    version.fields.find(f => norm(f.fieldId) === norm(change.fieldId)).value = change.after;
  }
  return expected;
}
function assertResumable(current, before, plan) {
  for (const change of plan.changes) assert(new Set(current.versions.map(v => value(v, change.name))).size === 1,
    'A shared authoring field differs across versions; reread a stable target.');
  const normalized = structuredClone(current);
  for (const version of normalized.versions) for (const change of plan.changes) {
    const field = version.fields.find(f => norm(f.fieldId) === norm(change.fieldId));
    assert(field && [change.before, change.after].includes(field.value), 'A reviewed authoring field changed outside this plan.');
    field.value = change.before;
  }
  assert.deepEqual(semantic(normalized), semantic(before), 'A protected field, identity or version changed; preserve author work and capture a new baseline.');
  unlocked(current);
}
async function readItem(query, id) {
  const get = () => query('query($id:ID!){item(where:{database:"master",itemId:$id,language:"en"}){itemId path parent{itemId path} template{templateId} versions(allLanguages:true){version language{name}}}}', { id });
  const item = (await get()).item;
  assert(item?.versions?.length, 'Required item is missing; install the reviewed model and branch scaffold first.');
  const versions = [];
  for (const version of item.versions) {
    const where = { database: 'master', itemId: id, language: version.language.name, version: version.version, existingVersionOnly: true };
    const fields = [];
    let after;
    for (let count = 0; count < 10; count++) {
      const result = await query('query($where:ItemQueryInput!,$after:String){item(where:$where){fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false){nodes{fieldId name value}pageInfo{hasNextPage endCursor}}}}', { where, after });
      const page = result.item?.fields;
      assert(page?.nodes && typeof page.pageInfo.hasNextPage === 'boolean', 'Native field pagination failed.');
      fields.push(...page.nodes);
      if (!page.pageInfo.hasNextPage) break;
      assert(page.pageInfo.endCursor && page.pageInfo.endCursor !== after && count < 9, 'Native field pagination did not finish.');
      after = page.pageInfo.endCursor;
    }
    assert(new Set(fields.map(f => norm(f.fieldId))).size === fields.length, 'Duplicate native field IDs.');
    const stable = (await query('query($where:ItemQueryInput!){item(where:$where){revision:field(name:"__Revision"){value}sharedRevision:field(name:"__Shared revision"){value}}}', { where })).item;
    assert(stable && value({ fields }, '__Revision') === stable.revision.value && value({ fields }, '__Shared revision') === stable.sharedRevision.value, 'Item changed during read; capture a stable baseline.');
    versions.push({ language: version.language.name, version: version.version, fields });
  }
  const end = (await get()).item;
  assert(end && JSON.stringify(end) === JSON.stringify(item), 'Item version inventory changed during read.');
  return { ...item, versions };
}
async function preflight(query) {
  for (const target of [
    { id: IDS.branch, path: M.BRANCH_PATH, template: IDS.branchTemplate },
    { id: IDS.data, path: M.DATA_PATH, template: IDS.dataTemplate },
    { id: IDS.image, path: M.IMAGE_PATH, template: IDS.imageTemplate },
    { id: IDS.rendering, path: '/sitecore/layout/Renderings/Project/LibertyMutual/ResourceImage', template: '04646a89-996f-4ee7-878a-ffdbf1f0ef0d' },
    { id: IDS.placeholder, path: '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/' + M.PLACEHOLDER, template: '5c547d4e-7111-4995-95b0-6b561751bf2e' },
    { id: IDS.sitePlaceholder, path: SITE + '/Presentation/Placeholder Settings/' + M.PLACEHOLDER, template: 'd2a6884c-04d5-4089-a64e-d27ca9d68d4c' },
  ]) {
    const item = await readItem(query, target.id); identity(item, target);
    const version = item.versions.find(v => v.language === 'en');
    assert(version, 'English configuration is missing.');
    if (target.id === IDS.image) assert(!value(version, 'image') && !value(version, 'caption'), 'The branch image contains editorial content; preserve and review it.');
    if ([IDS.placeholder, IDS.sitePlaceholder].includes(target.id)) assert(value(version, 'Placeholder Key') === M.PLACEHOLDER_KEY && norm(value(version, 'Allowed Controls')) === norm(IDS.rendering), 'The resource image placeholder is not restricted.');
    if (target.id === IDS.rendering) assert(value(version, 'componentName') === 'ResourceImage' && value(version, 'Datasource Template') === TEMPLATES + '/ResourceImage' && norm(value(version, 'AllowedOnTemplates')) === norm(IDS.pageTemplate), 'ResourceImage does not match its authoring contract.');
  }
  const prototype = await readItem(query, IDS.prototype);
  for (const version of prototype.versions) for (const name of ['summary', 'body', 'state', 'resourceType', 'reviewedAt', 'sourceLink', 'businessFamily', 'product', 'channel']) {
    assert(value(version, name) === '', 'The Resource page branch contains editorial content; this migration must not overwrite it.');
  }
}
function connection(environment, apply) {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, '.sitecore/user.json'), 'utf8'));
  const find = name => Object.entries(config.endpoints).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  const endpoint = find(environment);
  assert(endpoint?.host && (!apply || endpoint.allowWrite === true), 'Select a configured writable CLI environment for apply.');
  const origin = new URL(endpoint.host);
  assert(origin.protocol === 'https:' && !origin.username && !origin.password && !origin.search && !origin.hash, 'Invalid authoring endpoint.');
  let auth = endpoint;
  const seen = new Set();
  while (auth.ref) { const key = auth.ref.toLowerCase(); assert(!seen.has(key), 'Authentication reference cycle.'); seen.add(key); auth = find(key); assert(auth); }
  assert(auth.accessToken, 'Use the normal Sitecore CLI login.');
  return { origin: origin.origin, query: async (query, variables = {}) => {
    assert(apply || /^query\b/.test(query), 'Read-only mode rejected a mutation.');
    let response, result;
    try { response = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', origin), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000),
    }); result = await response.json(); } catch { throw new Error('Native response was not confirmed. Inspect the journal and rerun the read-only plan before retrying.'); }
    assert(response.ok && !result.errors?.length && result.data, 'Native operation failed; raw response suppressed. Rerun the read-only plan before retrying.');
    return result.data;
  } };
}
function writePrivate(filename, value, exclusive = false) {
  assert(path.isAbsolute(filename), 'Snapshots and journals require absolute paths outside the repository.');
  assert(!path.resolve(filename).startsWith(ROOT + path.sep), 'Keep native snapshots and journals outside the repository.');
  fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: exclusive ? 'wx' : 'w' });
  fs.chmodSync(filename, 0o600);
}
async function run({ query, before, apply = false, record = () => {} }) {
  assert(before?.schemaVersion === 1 && Array.isArray(before.items) && before.items.length === TARGETS.length, 'Wrong baseline format or scope.');
  assert(before.sha256 === digest(before.items), 'Baseline checksum does not match.');
  const plans = TARGETS.map(target => {
    const item = before.items.find(i => norm(i.itemId) === norm(target.id));
    return planItem(item, target);
  });
  await preflight(query);
  for (const [index, target] of TARGETS.entries()) {
    const baseline = before.items.find(i => norm(i.itemId) === norm(target.id));
    const plan = plans[index], current = await readItem(query, target.id);
    identity(current, target); assertResumable(current, baseline, plan);
    const remaining = plan.changes.filter(change => current.versions.some(v => value(v, change.name) !== change.after));
    if (!apply || !remaining.length) continue;
    // Re-read the complete target immediately before submitting this one write.
    const fresh = await readItem(query, target.id);
    assert.deepEqual(semantic(fresh, false), semantic(current, false), 'Target changed during preflight.');
    const english = fresh.versions.filter(v => v.language === 'en').sort((a, b) => b.version - a.version)[0];
    assert(english && value(english, '__Created'), 'English version or creation date is unavailable.');
    const input = { database: 'master', itemId: target.id, language: 'en', version: english.version,
      fields: [...remaining.map(change => ({ name: change.fieldId, value: change.after })), { name: '__Created', value: value(english, '__Created') }] };
    record({ phase: 'write-intent', itemId: target.id, path: target.path, changes: remaining });
    await query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}', { input });
    const after = await readItem(query, target.id);
    assert.deepEqual(semantic(after), semantic(expectedItem(baseline, plan)), 'Write readback differs from the reviewed result. Stop and review the native item.');
    record({ phase: 'write-verified', itemId: target.id, path: target.path });
  }
  return { mode: apply ? 'applied' : 'read-only', plans, scope: 'Authoring configuration only. No resource text, metadata, image assets, workflow, approval, or publication changed.' };
}
async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args, options = {};
  assert(environment && !environment.startsWith('--'), 'Specify a configured Sitecore CLI environment.');
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]; assert(!Object.hasOwn(options, flag), 'Duplicate option.');
    if (flag === '--apply') options[flag] = true;
    else { assert(['--snapshot', '--baseline', '--journal'].includes(flag) && rest[i + 1] && !rest[i + 1].startsWith('--'), 'Unknown or incomplete option.'); options[flag] = rest[++i]; }
  }
  const apply = options['--apply'] === true;
  const { query, origin } = connection(environment, apply);
  if (options['--snapshot']) {
    assert(!apply && !options['--baseline'] && !options['--journal'], 'Snapshot capture is a separate read-only action.');
    const items = [];
    for (const target of TARGETS) { const item = await readItem(query, target.id); identity(item, target); items.push(item); }
    writePrivate(options['--snapshot'], { schemaVersion: 1, environment, origin, capturedAt: new Date().toISOString(), items, sha256: digest(items) }, true);
    console.log(JSON.stringify({ mode: 'captured', path: options['--snapshot'], items: items.length })); return;
  }
  assert(options['--baseline'] && path.isAbsolute(options['--baseline']), 'Specify --baseline with an absolute native snapshot path.');
  const before = JSON.parse(fs.readFileSync(options['--baseline'], 'utf8'));
  assert(before.origin === origin && before.environment.toLowerCase() === environment.toLowerCase(), 'Baseline environment differs.');
  let record = () => {};
  if (apply) {
    assert(options['--journal'] && path.isAbsolute(options['--journal']) && options['--journal'] !== options['--baseline'], 'Apply requires a separate absolute journal path.');
    const journal = fs.existsSync(options['--journal']) ? JSON.parse(fs.readFileSync(options['--journal'], 'utf8')) : { schemaVersion: 1, origin, baselineSha256: before.sha256, events: [] };
    assert(journal.origin === origin && journal.baselineSha256 === before.sha256 && Array.isArray(journal.events), 'Journal belongs to another migration.');
    record = event => { journal.events.push({ at: new Date().toISOString(), ...event }); writePrivate(options['--journal'], journal); };
  }
  console.log(JSON.stringify(await run({ query, before, apply, record }), null, 2));
}
module.exports = { TARGETS, semantic, planItem, expectedItem, assertResumable, readItem, preflight, run, digest, main };
if (require.main === module) main().catch(error => { console.error('Resource page authoring: ' + (error?.message || 'Operation failed.')); process.exitCode = 1; });
