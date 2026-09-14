#!/usr/bin/env node
'use strict';
/** Guarded placement-only migration; never publishes or changes workflow.
 * ENVIRONMENT --baseline ABSOLUTE_NATIVE_SNAPSHOT [--apply] [--journal ABSOLUTE_PATH]
 * Accepts a snapshot with items[] or captured[].items from the native audit.
 * Rechecks all fields and versions before writing. After an uncertain response,
 * rerun the plan: only exact before/after placement values are resumable.
 * Coordinate editing during apply: Authoring API has no atomic revision guard.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { IDS, LAYOUTS, COMPONENTS, planItemLayouts } = require('./portal-placeholder-layouts.cjs');
const ROOT = path.resolve(__dirname, '../..');
const HOME = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home';
const STANDARD = '/sitecore/templates/Project/LibertyMutual/';
const PH_ROOT = '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/';
const PH = {
  'headless-agent-guidance': '427c0c0a-38cb-5c1b-aa2d-34b20594a9aa',
  'headless-resource-search': 'f64643c1-6280-57c2-8695-02d4c563b4ae',
  'headless-resource-article': '27225f95-329c-5193-b6d9-8ea86c0010a5',
  'headless-products-spotlight': '8428148d-9f3b-5323-a166-88d0c5ea56ac',
};
const LAYOUT_PH = {
  PortalLayout: ['headless-agent-guidance'],
  ResourcesLayout: ['headless-resource-search', 'headless-agent-guidance'],
  ResourceArticleLayout: ['headless-resource-article'],
  ProductsLayout: ['headless-agent-guidance', 'headless-products-spotlight'],
};
const META = new Set(['__Revision', '__Shared revision', '__Updated', '__Updated by']);
const norm = value => String(value).replace(/[{}-]/g, '').toLowerCase();
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const value = (version, field) => version.fields.find(f => f.name === field)?.value ?? '';
const versionKey = version => `${typeof version.language === 'string' ? version.language : version.language.name}:${version.version}`;
const scoped = item => item.path === HOME || item.path.startsWith(HOME + '/') ||
  ['Page', 'PortalPage', 'ResourcePage'].some(name => item.path === STANDARD + name + '/__Standard Values');
function snapshotItems(snapshot) {
  const items = snapshot.items ?? snapshot.captured?.flatMap(scope => scope.items);
  assert(Array.isArray(items), 'Snapshot must contain native items.');
  const targets = items.filter(scoped);
  assert(targets.length > 3 && targets.length < 200, 'Unexpected page scope.');
  assert.equal(new Set(targets.map(item => norm(item.itemId))).size, targets.length, 'Duplicate target.');
  return targets;
}
function expectedItem(before, plan) {
  const result = structuredClone(before);
  for (const version of result.versions) {
    if (plan.sharedChange) version.fields.find(f => f.name === '__Renderings').value = plan.sharedChange.after;
    const change = plan.finalChanges.find(c => `${c.language}:${c.version}` === versionKey(version));
    if (change) version.fields.find(f => f.name === '__Final Renderings').value = change.after;
  }
  return result;
}
function semantic(item) {
  return { id: norm(item.itemId), path: item.path, template: norm(item.template.templateId), parent: norm(item.parent.itemId),
    versions: item.versions.map(v => ({ key: versionKey(v), fields: v.fields.filter(f => !META.has(f.name))
      .map(f => [norm(f.fieldId), f.value]).sort((a, b) => a[0].localeCompare(b[0])) })).sort((a, b) => a.key.localeCompare(b.key)) };
}
function assertResumable(current, before, expected) {
  assert.equal(new Set(current.versions.map(v => value(v, '__Renderings'))).size, 1,
    'Shared layout differs across versions; reread before continuing.');
  const normalized = structuredClone(current);
  for (const version of normalized.versions) {
    const oldVersion = before.versions.find(v => versionKey(v) === versionKey(version));
    const newVersion = expected.versions.find(v => versionKey(v) === versionKey(version));
    assert(oldVersion && newVersion, 'Language/version inventory changed; capture a new baseline.');
    for (const fieldName of ['__Renderings', '__Final Renderings']) {
      const field = version.fields.find(f => f.name === fieldName);
      assert(field && [value(oldVersion, fieldName), value(newVersion, fieldName)].includes(field.value),
        'Presentation changed outside the reviewed migration.');
      field.value = value(oldVersion, fieldName);
    }
  }
  assert.deepEqual(semantic(normalized), semantic(before), 'A protected field, template, parent or version changed.');
}
function connection(environment, apply) {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, '.sitecore/user.json'), 'utf8'));
  const find = name => Object.entries(config.endpoints).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  const endpoint = find(environment);
  assert(endpoint?.host && (!apply || endpoint.allowWrite === true), 'Select an authorized CLI environment.');
  const origin = new URL(endpoint.host);
  assert(origin.protocol === 'https:' && !origin.username && !origin.password && !origin.search && !origin.hash, 'Invalid CM origin.');
  let auth = endpoint;
  const seen = new Set();
  while (auth.ref) { assert(!seen.has(auth.ref)); seen.add(auth.ref); auth = find(auth.ref); assert(auth); }
  assert(auth.accessToken, 'Use the normal Sitecore CLI login.');
  return async (query, variables = {}) => {
    assert(apply || /^query\b/.test(query), 'Read-only plan rejected a write.');
    const response = await fetch(new URL('/sitecore/api/authoring/graphql/v1/', origin), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    assert(response.ok && !result.errors?.length && result.data, 'Native request failed; rerun the plan before retrying.');
    return result.data;
  };
}
async function readItem(query, id) {
  const item = (await query('query($id:ID!){item(where:{database:"master",itemId:$id,language:"en"}){itemId path parent{itemId path} template{templateId} versions(allLanguages:true){version language{name}}}}', { id })).item;
  assert(item && item.versions.length, 'Target item or version missing.');
  const versions = [];
  for (const v of item.versions) {
    const fields = []; let after;
    do {
      const data = (await query('query($where:ItemQueryInput!,$after:String){item(where:$where){fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false){nodes{fieldId name value}pageInfo{hasNextPage endCursor}}}}', {
        where: { database: 'master', itemId: id, language: v.language.name, version: v.version, existingVersionOnly: true }, after,
      })).item;
      assert(data, 'Version disappeared during read.');
      fields.push(...data.fields.nodes); assert(fields.length <= 1000, 'Unexpected field count.');
      after = data.fields.pageInfo.hasNextPage ? data.fields.pageInfo.endCursor : undefined;
    } while (after);
    const stable = (await query('query($where:ItemQueryInput!){item(where:$where){revision:field(name:"__Revision"){value} sharedRevision:field(name:"__Shared revision"){value}}}', {
      where: { database: 'master', itemId: id, language: v.language.name, version: v.version, existingVersionOnly: true },
    })).item;
    assert(stable && fields.find(f => f.name === '__Revision')?.value === stable.revision.value &&
      fields.find(f => f.name === '__Shared revision')?.value === stable.sharedRevision.value,
    'Item changed during native read; capture a stable baseline.');
    versions.push({ language: v.language.name, version: v.version, fields });
  }
  return { ...item, versions };
}
async function preflightModel(query) {
  for (const [renderingId, component] of Object.entries(COMPONENTS)) {
    const setting = await readItem(query, PH[component.to]);
    assert.equal(setting.path, PH_ROOT + component.to);
    assert.equal(value(setting.versions[0], 'Placeholder Key'), component.to);
    assert.equal(value(setting.versions[0], 'Editable'), '1', 'Placeholder must support author insertion.');
    assert.equal(norm(value(setting.versions[0], 'Allowed Controls').trim()), renderingId, 'Placeholder must allow exactly its component.');
  }
  for (const [name, id] of Object.entries(LAYOUTS)) {
    const layout = await readItem(query, id);
    assert.equal(layout.path, '/sitecore/layout/Layouts/Project/LibertyMutual/' + name);
    const tokens = value(layout.versions[0], 'Placeholders').split(/[|\r\n]+/).map(token => token.trim()).filter(Boolean);
    const guid = '[a-f\\d]{8}(?:-[a-f\\d]{4}){3}-[a-f\\d]{12}';
    const tokenPattern = new RegExp(`^(?:${guid}|\\{${guid}\\})$`, 'i');
    assert(tokens.every(token => tokenPattern.test(token)), 'Malformed layout placeholder list.');
    const actual = tokens.map(norm).sort();
    assert.deepEqual(actual, LAYOUT_PH[name].map(key => norm(PH[key])).sort(), 'Layout exposes an unexpected placeholder.');
  }
}
async function main() {
  const [environment, ...args] = process.argv.slice(2);
  assert(environment && !environment.startsWith('--'), 'Specify the existing CLI environment.');
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') options.apply = true;
    else if (['--baseline', '--journal'].includes(args[i]) && args[i + 1]) options[args[i].slice(2)] = args[++i];
    else throw new Error('Unknown or incomplete option.');
  }
  assert(options.baseline && path.isAbsolute(options.baseline), 'An absolute native baseline path is required.');
  const raw = fs.readFileSync(options.baseline, 'utf8');
  const baselines = snapshotItems(JSON.parse(raw));
  const plans = baselines.map(planItemLayouts);
  const expected = baselines.map((item, index) => expectedItem(item, plans[index]));
  const query = connection(environment, Boolean(options.apply));
  // Inspect live write contract before any mutation; reject incompatible servers.
  const schema = await query('query{input:__type(name:"UpdateItemInput"){inputFields{name}} payload:__type(name:"UpdateItemPayload"){fields{name}}}');
  assert(['database', 'itemId', 'language', 'version', 'fields'].every(name => schema.input.inputFields.some(f => f.name === name)));
  assert(schema.payload.fields.some(f => f.name === 'item'));
  const states = [];
  for (let i = 0; i < baselines.length; i++) {
    const current = await readItem(query, baselines[i].itemId);
    assertResumable(current, baselines[i], expected[i]);
    states.push(current);
  }
  const summary = { environment, apply: Boolean(options.apply), targetItems: plans.length,
    sharedChanges: plans.filter(p => p.sharedChange).length, finalVersionChanges: plans.reduce((sum, p) => sum + p.finalChanges.length, 0),
    alreadyConfigured: states.filter((state, i) => hash(semantic(state)) === hash(semantic(expected[i]))).length,
    baselineSha256: hash(raw) };
  if (!options.apply) { console.log(JSON.stringify(summary, null, 2)); return; }
  await preflightModel(query);
  const journalPath = options.journal || path.join(path.dirname(options.baseline), 'placeholder-migration-journal.json');
  assert(path.isAbsolute(journalPath) && path.resolve(journalPath) !== path.resolve(options.baseline));
  const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : { ...summary, startedAt: new Date().toISOString(), entries: [] };
  assert(journal.baselineSha256 === summary.baselineSha256 && journal.environment === environment, 'Journal belongs to a different baseline/environment.');
  const record = entry => { journal.entries.push({ at: new Date().toISOString(), ...entry }); fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), { mode: 0o600 }); fs.chmodSync(journalPath, 0o600); };
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i]; let current = await readItem(query, plan.itemId);
    assertResumable(current, baselines[i], expected[i]);
    const changes = [...(plan.sharedChange ? [{ ...plan.sharedChange, language: current.versions[0].language, version: current.versions[0].version }] : []), ...plan.finalChanges];
    for (const change of changes) {
      const currentVersion = current.versions.find(v => versionKey(v) === `${change.language}:${change.version}`);
      if (value(currentVersion, change.name) === change.after) continue;
      assert.equal(value(currentVersion, change.name), change.before, 'Unexpected presentation value.');
      for (const v of current.versions) assert(!value(v, '__Lock').trim() || /^<r\s*\/\s*>$/.test(value(v, '__Lock').trim()), 'Item is locked for editing.');
      record({ phase: 'write-intent', itemId: plan.itemId, path: plan.path, field: change.name, language: change.language, version: change.version, beforeSha256: change.beforeSha256, afterSha256: change.afterSha256 });
      await query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}', { input: { database: 'master', itemId: plan.itemId, language: change.language, version: change.version, fields: [{ name: change.name, value: change.after }] } });
      current = await readItem(query, plan.itemId);
      assertResumable(current, baselines[i], expected[i]);
      assert.equal(value(current.versions.find(v => versionKey(v) === `${change.language}:${change.version}`), change.name), change.after, 'Write read-back failed.');
      record({ phase: 'write-verified', itemId: plan.itemId, field: change.name, language: change.language, version: change.version });
    }
    assert.deepEqual(semantic(current), semantic(expected[i]), 'Final item does not match the reviewed placement-only result.');
  }
  record({ phase: 'complete', contentAndWorkflowPreserved: true });
  console.log(JSON.stringify({ ...summary, complete: true, contentAndWorkflowPreserved: true, journalPath }, null, 2));
}
module.exports = { snapshotItems, expectedItem, semantic, assertResumable, readItem, preflightModel, PH, LAYOUT_PH };
if (require.main === module) main().catch(() => { console.error('Portal placeholders: stopped safely. A baseline/model/concurrency check or native request failed; inspect the journal and rerun the read-only plan. No automatic retry or publication occurred.'); process.exitCode = 1; });
