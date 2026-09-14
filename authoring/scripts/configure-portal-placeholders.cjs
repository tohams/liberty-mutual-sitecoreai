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
const SITE_PH_ROOT = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Placeholder Settings/';
const SITE_PH_PARENT = 'e601261f-f47f-4831-b91e-ef70efab3276';
const SITE_PH_TEMPLATE = 'd2a6884c-04d5-4089-a64e-d27ca9d68d4c';
const SITE_PH = {
  'headless-agent-guidance': 'ee271523-71b1-537b-af86-4be918ccc934',
  'headless-resource-search': '30300f08-7257-5684-973d-37bfac7f859a',
  'headless-resource-article': '841765c3-50d9-5a1c-b7d2-a709c2e9085e',
  'headless-products-spotlight': '26cea173-788c-504b-afe6-14fa57a94946',
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
/**
 * Sitecore can generate a page thumbnail when shared presentation is saved.
 * Verify that one narrowly scoped native side effect; do not change the actual
 * read, baseline, expected presentation, or any native item. The returned copy
 * is solely for the existing protected-field and completed-layout comparisons.
 */
async function verifyResumableItem(query, current, before, expected) {
  const comparison = structuredClone(current);
  const sideEffects = [];
  const thumbnailChanged = current.versions.some(version => {
    const oldVersion = before.versions.find(v => versionKey(v) === versionKey(version));
    return oldVersion && value(version, '__Thumbnail') !== value(oldVersion, '__Thumbnail');
  });
  if (thumbnailChanged) {
    assert(before.path === HOME || before.path.startsWith(HOME + '/'),
      'Generated thumbnail exception is limited to owned pages, never standard values.');
    assert.equal(current.path, before.path, 'Thumbnail page path changed.');
    assert.equal(norm(current.itemId), norm(before.itemId), 'Thumbnail page identity changed.');
    const pageId = norm(before.itemId).toUpperCase();
    assert(/^[A-F\d]{32}$/.test(pageId), 'Invalid page ID for generated thumbnail.');
    assert(current.versions.length && current.versions.every(v => versionKey(v).startsWith('en:')),
      'Generated thumbnail exception requires consistent English page versions.');
    assert(before.versions.length === current.versions.length &&
      new Set(current.versions.map(versionKey)).size === current.versions.length,
    'Thumbnail version inventory changed.');
    const thumbnails = new Set();
    for (const version of comparison.versions) {
      const oldVersion = before.versions.find(v => versionKey(v) === versionKey(version));
      const newVersion = expected.versions.find(v => versionKey(v) === versionKey(version));
      assert(oldVersion && newVersion, 'Thumbnail language/version inventory changed.');
      for (const candidate of [oldVersion, version, newVersion]) {
        const field = candidate.fields.find(f => f.name === '__Thumbnail');
        assert(field && norm(field.fieldId) === 'c7c26117dbb142b2ab5ef7223845cca3',
          'Missing or unexpected native thumbnail field.');
      }
      assert.equal(value(oldVersion, '__Thumbnail'), '', 'An existing thumbnail must remain unchanged.');
      assert.equal(value(newVersion, '__Thumbnail'), '', 'The reviewed plan must preserve the blank thumbnail.');
      assert.notEqual(value(oldVersion, '__Renderings'), value(newVersion, '__Renderings'),
        'Generated thumbnail requires a reviewed shared-layout change.');
      assert.equal(value(version, '__Renderings'), value(newVersion, '__Renderings'),
        'Generated thumbnail requires the reviewed shared layout to be applied.');
      thumbnails.add(value(version, '__Thumbnail'));
    }
    assert.equal(thumbnails.size, 1, 'Generated thumbnail differs across English versions.');
    const thumbnail = [...thumbnails][0];
    const match = /^<image mediaid="\{([a-fA-F\d]{8}(?:-[a-fA-F\d]{4}){3}-[a-fA-F\d]{12})\}" \/>$/.exec(thumbnail);
    assert(match, 'Generated thumbnail must contain exactly one native image reference.');
    const mediaItemId = match[1].toLowerCase();
    const expectedMediaPath = '/sitecore/media library/Project/LibertyMutual/liberty-mutual-agent-portal/System/' +
      pageId.slice(0, 4).split('').join('/') + '/thumbnail_' + pageId;
    const media = (await query('query($id:ID!){item(where:{database:"master",itemId:$id,language:"en"}){itemId path}}', { id: mediaItemId })).item;
    assert(media && norm(media.itemId) === norm(mediaItemId) && media.path === expectedMediaPath,
      'Generated thumbnail media does not belong to this page.');
    for (const version of comparison.versions) version.fields.find(f => f.name === '__Thumbnail').value = '';
    sideEffects.push({ kind: 'native-generated-page-thumbnail', itemId: current.itemId, path: current.path,
      field: '__Thumbnail', mediaItemId, mediaPath: media.path, versions: current.versions.map(versionKey) });
  }
  assertResumable(comparison, before, expected);
  return { comparison, sideEffects };
}
/** Keep the original creation timestamp when Sitecore materializes a resource item. */
function placementUpdateInput(current, change) {
  assert(scoped(current), 'Placement update is outside the reviewed item scope.');
  assert(['__Renderings', '__Final Renderings'].includes(change.name) && typeof change.after === 'string',
    'Only a reviewed presentation field may be updated.');
  const version = current.versions.find(v => versionKey(v) === `${change.language}:${change.version}`);
  assert(version, 'Placement update version is missing.');
  assert.equal(value(version, change.name), change.before, 'Placement changed before building the update.');
  const created = version.fields.find(f => f.name === '__Created');
  assert(created && norm(created.fieldId) === '25bed78c49574165998aca1b52f67497' &&
    typeof created.value === 'string' && /^\d{8}T\d{6}Z$/.test(created.value),
  'The existing creation timestamp must be preserved explicitly.');
  return { database: 'master', itemId: current.itemId, language: change.language, version: change.version,
    fields: [{ name: change.name, value: change.after }, { name: '__Created', value: created.value }] };
}
function validateJournal(journal, context) {
  assert(journal && Array.isArray(journal.entries) && journal.baselineSha256 === context.baselineSha256 &&
    journal.environment === context.environment, 'Journal belongs to a different baseline/environment.');
}
function sitecoreTimestamp(timestamp) {
  assert(typeof timestamp === 'string' && /^\d{8}T\d{6}Z$/.test(timestamp), 'Invalid native creation timestamp.');
  const date = new Date(timestamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
  assert(Number.isFinite(date.getTime()) && date.toISOString().replace(/[-:]/g, '').replace('.000', '') === timestamp,
    'Invalid native creation timestamp.');
  return date.getTime();
}
/** Read-only review of a temporary creation-date reset caused by our own recorded save. */
async function reviewCreatedRepairs(query, current, before, expected, context) {
  const restored = structuredClone(current), creationRepairs = [];
  for (const version of restored.versions) {
    const oldVersion = before.versions.find(v => versionKey(v) === versionKey(version));
    const newVersion = expected.versions.find(v => versionKey(v) === versionKey(version));
    if (!oldVersion || value(version, '__Created') === value(oldVersion, '__Created')) continue;
    validateJournal(context.journal, context);
    assert(scoped(before) && current.path === before.path && norm(current.itemId) === norm(before.itemId),
      'Creation restoration is outside the reviewed item scope.');
    assert(newVersion && value(newVersion, '__Created') === value(oldVersion, '__Created'),
      'Creation restoration must preserve the reviewed baseline.');
    const created = version.fields.find(f => f.name === '__Created');
    assert(created && norm(created.fieldId) === '25bed78c49574165998aca1b52f67497',
      'Unexpected native creation field.');
    assert.equal(created.value, value(version, '__Updated'), 'Creation reset must exactly match the native update timestamp.');
    const createdAt = sitecoreTimestamp(created.value);
    sitecoreTimestamp(value(oldVersion, '__Created'));
    assert.equal(value(version, '__Renderings'), value(newVersion, '__Renderings'),
      'Creation reset requires the reviewed shared layout to be applied.');
    const digest = input => crypto.createHash('sha256').update(input).digest('hex');
    const matchingIntents = context.journal.entries.filter(entry => {
      if (entry.phase !== 'write-intent' || norm(entry.itemId) !== norm(before.itemId) || entry.path !== before.path ||
        `${entry.language}:${entry.version}` !== versionKey(version) || !['__Renderings', '__Final Renderings'].includes(entry.field)) return false;
      const original = value(oldVersion, entry.field), intended = value(newVersion, entry.field);
      if (original === intended || value(version, entry.field) !== intended ||
        entry.beforeSha256 !== digest(original) || entry.afterSha256 !== digest(intended)) return false;
      const intendedAt = Date.parse(entry.at);
      if (!Number.isFinite(intendedAt)) return false;
      // Sitecore serializes seconds while the journal records milliseconds.
      const firstSecond = Math.floor(intendedAt / 1000) * 1000;
      return createdAt >= firstSecond && createdAt <= firstSecond + 60000;
    });
    assert.equal(matchingIntents.length, 1, 'Creation reset requires one matching recent layout write-intent.');
    const intent = matchingIntents[0];
    creationRepairs.push({ itemId: current.itemId, path: current.path,
      language: typeof version.language === 'string' ? version.language : version.language.name, version: version.version,
      before: created.value, after: value(oldVersion, '__Created'), layoutField: intent.field, layoutIntentAt: intent.at,
      layoutBeforeSha256: intent.beforeSha256, layoutAfterSha256: intent.afterSha256 });
    created.value = value(oldVersion, '__Created');
  }
  const verified = await verifyResumableItem(query, restored, before, expected);
  return { ...verified, creationRepairs };
}
/** Restore only a reviewed native creation-date reset; uncertain writes stop without retry. */
async function restoreCreatedMetadata(query, current, before, expected, context, record, readCurrent = readItem) {
  const review = await reviewCreatedRepairs(query, current, before, expected, context);
  if (!review.creationRepairs.length) return { current, verified: { comparison: review.comparison, sideEffects: review.sideEffects } };
  for (const repair of review.creationRepairs) {
    for (const v of current.versions) assert(!value(v, '__Lock').trim() || /^<r\s*\/\s*>$/.test(value(v, '__Lock').trim()), 'Item is locked for editing.');
    const version = current.versions.find(v => versionKey(v) === `${repair.language}:${repair.version}`);
    assert.equal(value(version, '__Created'), repair.before, 'Creation value changed before restoration.');
    const restoredSnapshot = structuredClone(current);
    restoredSnapshot.versions.find(v => versionKey(v) === `${repair.language}:${repair.version}`)
      .fields.find(f => f.name === '__Created').value = repair.after;
    record({ phase: 'restore-intent', field: '__Created', ...repair });
    await query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}', {
      input: { database: 'master', itemId: current.itemId, language: repair.language, version: repair.version,
        fields: [{ name: '__Created', value: repair.after }] },
    });
    current = await readCurrent(query, current.itemId);
    assert.deepEqual(semantic(current), semantic(restoredSnapshot),
      'Creation restoration changed another protected field or did not restore the timestamp.');
    record({ phase: 'restore-verified', itemId: repair.itemId, language: repair.language, version: repair.version,
      field: '__Created', restoredValue: repair.after, layoutIntentAt: repair.layoutIntentAt });
  }
  return { current, verified: await verifyResumableItem(query, current, before, expected) };
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
    for (const [id, root, siteSpecific] of [[PH[component.to], PH_ROOT, false], [SITE_PH[component.to], SITE_PH_ROOT, true]]) {
      const setting = await readItem(query, id);
      assert.equal(norm(setting.itemId), norm(id), 'Unexpected placeholder item identity.');
      assert.equal(setting.path, root + component.to);
      if (siteSpecific) {
        assert.equal(norm(setting.template.templateId), norm(SITE_PH_TEMPLATE), 'Site placeholder must use the native SXA template.');
        assert.equal(norm(setting.parent.itemId), norm(SITE_PH_PARENT), 'Site placeholder must remain in the owned presentation folder.');
      }
      assert.equal(value(setting.versions[0], 'Placeholder Key'), component.to);
      assert.equal(value(setting.versions[0], 'Editable'), '1', 'Placeholder must support author insertion.');
      assert.equal(norm(value(setting.versions[0], 'Allowed Controls').trim()), renderingId, 'Placeholder must allow exactly its component.');
    }
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
  const journalPath = options.journal || path.join(path.dirname(options.baseline), 'placeholder-migration-journal.json');
  assert(path.isAbsolute(journalPath) && path.resolve(journalPath) !== path.resolve(options.baseline));
  const journalContext = { environment, baselineSha256: hash(raw) };
  let journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : null;
  if (journal) validateJournal(journal, journalContext);
  const query = connection(environment, Boolean(options.apply));
  // Inspect live write contract before any mutation; reject incompatible servers.
  const schema = await query('query{input:__type(name:"UpdateItemInput"){inputFields{name}} payload:__type(name:"UpdateItemPayload"){fields{name}}}');
  assert(['database', 'itemId', 'language', 'version', 'fields'].every(name => schema.input.inputFields.some(f => f.name === name)));
  assert(schema.payload.fields.some(f => f.name === 'item'));
  const states = [], initialSideEffects = [], pendingCreationRepairs = [];
  for (let i = 0; i < baselines.length; i++) {
    const current = await readItem(query, baselines[i].itemId);
    const verified = await reviewCreatedRepairs(query, current, baselines[i], expected[i], { ...journalContext, journal });
    states.push(verified.comparison);
    initialSideEffects.push(...verified.sideEffects);
    pendingCreationRepairs.push(...verified.creationRepairs);
  }
  const summary = { environment, apply: Boolean(options.apply), targetItems: plans.length,
    sharedChanges: plans.filter(p => p.sharedChange).length, finalVersionChanges: plans.reduce((sum, p) => sum + p.finalChanges.length, 0),
    alreadyConfigured: states.filter((state, i) => hash(semantic(state)) === hash(semantic(expected[i]))).length,
    verifiedNativeThumbnails: initialSideEffects.length,
    pendingCreatedRestorations: pendingCreationRepairs.length,
    createdRestorationItems: pendingCreationRepairs.map(({ path, language, version, before, after }) => ({ path, language, version, before, after })),
    baselineSha256: hash(raw) };
  if (!options.apply) { console.log(JSON.stringify(summary, null, 2)); return; }
  await preflightModel(query);
  if (!journal) journal = { ...summary, startedAt: new Date().toISOString(), entries: [] };
  validateJournal(journal, journalContext);
  const record = entry => { journal.entries.push({ at: new Date().toISOString(), ...entry }); fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), { mode: 0o600 }); fs.chmodSync(journalPath, 0o600); };
  const recordedSideEffects = new Set(journal.entries.filter(entry => entry.phase === 'verified-native-side-effect')
    .map(entry => `${norm(entry.itemId)}:${norm(entry.mediaItemId)}`));
  const recordSideEffects = effects => {
    for (const effect of effects) {
      const key = `${norm(effect.itemId)}:${norm(effect.mediaItemId)}`;
      if (recordedSideEffects.has(key)) continue;
      record({ phase: 'verified-native-side-effect', ...effect });
      recordedSideEffects.add(key);
    }
  };
  recordSideEffects(initialSideEffects);
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i]; let current = await readItem(query, plan.itemId);
    let prepared = await restoreCreatedMetadata(query, current, baselines[i], expected[i], { ...journalContext, journal }, record);
    current = prepared.current;
    let verified = prepared.verified;
    recordSideEffects(verified.sideEffects);
    const changes = [...(plan.sharedChange ? [{ ...plan.sharedChange, language: current.versions[0].language, version: current.versions[0].version }] : []), ...plan.finalChanges];
    for (const change of changes) {
      const currentVersion = current.versions.find(v => versionKey(v) === `${change.language}:${change.version}`);
      if (value(currentVersion, change.name) === change.after) continue;
      assert.equal(value(currentVersion, change.name), change.before, 'Unexpected presentation value.');
      for (const v of current.versions) assert(!value(v, '__Lock').trim() || /^<r\s*\/\s*>$/.test(value(v, '__Lock').trim()), 'Item is locked for editing.');
      const input = placementUpdateInput(current, change);
      record({ phase: 'write-intent', itemId: plan.itemId, path: plan.path, field: change.name, language: change.language, version: change.version, beforeSha256: change.beforeSha256, afterSha256: change.afterSha256 });
      await query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}', { input });
      current = await readItem(query, plan.itemId);
      prepared = await restoreCreatedMetadata(query, current, baselines[i], expected[i], { ...journalContext, journal }, record);
      current = prepared.current;
      verified = prepared.verified;
      recordSideEffects(verified.sideEffects);
      assert.equal(value(current.versions.find(v => versionKey(v) === `${change.language}:${change.version}`), change.name), change.after, 'Write read-back failed.');
      record({ phase: 'write-verified', itemId: plan.itemId, field: change.name, language: change.language, version: change.version });
    }
    assert.deepEqual(semantic(verified.comparison), semantic(expected[i]), 'Final item does not match the reviewed placement-only result.');
  }
  const restoredCreationTimestamps = journal.entries.filter(entry => entry.phase === 'restore-verified').length;
  record({ phase: 'complete', contentAndWorkflowPreserved: true, verifiedNativeThumbnails: recordedSideEffects.size, restoredCreationTimestamps });
  console.log(JSON.stringify({ ...summary, verifiedNativeThumbnails: recordedSideEffects.size,
    pendingCreatedRestorations: 0, createdRestorationItems: [], restoredCreationTimestamps,
    complete: true, contentAndWorkflowPreserved: true, journalPath }, null, 2));
}
module.exports = { snapshotItems, expectedItem, semantic, assertResumable, verifyResumableItem, placementUpdateInput,
  reviewCreatedRepairs, restoreCreatedMetadata, validateJournal, readItem, preflightModel, PH, SITE_PH, SITE_PH_ROOT, SITE_PH_TEMPLATE, SITE_PH_PARENT, LAYOUT_PH };
if (require.main === module) main().catch(() => { console.error('Portal placeholders: stopped safely. A baseline/model/concurrency check or native request failed; inspect the journal and rerun the read-only plan. No automatic retry or publication occurred.'); process.exitCode = 1; });
