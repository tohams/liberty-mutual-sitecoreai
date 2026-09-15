'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  snapshotItems, expectedItem, semantic, assertResumable, verifyResumableItem, placementUpdateInput,
  reviewCreatedRepairs, restoreCreatedMetadata, readItem, preflightModel, PH, SITE_PH, SITE_PH_ROOT, SITE_PH_TEMPLATE, SITE_PH_PARENT, LAYOUT_PH,
} = require('./configure-portal-placeholders.cjs');
const { IDS, LAYOUTS, COMPONENTS, planItemLayouts } = require('./portal-placeholder-layouts.cjs');

const HOME = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home';
const TEMPLATE_ROOT = '/sitecore/templates/Project/LibertyMutual/';
const DEVICE = '{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}';
const OLD_LAYOUT = '{96E5F4BA-A2CF-4A4C-A4E7-64DA88226362}';
const GUIDANCE = '{193A0299-B5B6-5668-B792-9F3552463163}';
const SEARCH = '{15CF6EFA-C180-563A-B229-C08F2DAC3DAD}';
const GUIDANCE_UID = '{11111111-1111-4111-8111-111111111111}';
const SEARCH_UID = '{22222222-2222-4222-8222-222222222222}';
const SOURCE = '{33333333-3333-4333-8333-333333333333}';
// Ground this system-field fixture in the serialized native Home item rather
// than repeating a manually supplied ID from the implementation under test.
const CREATED_FIELD_ID = readFileSync(path.join(__dirname,
  '../items/liberty-mutual/items/content/LibertyMutual/liberty-mutual-agent-portal/Home.yml'), 'utf8')
  .match(/ID: "([^"]+)"\s+Hint: __Created\s/)[1];
const FIELD_IDS = {
  '__Renderings': IDS.sharedField, '__Final Renderings': IDS.finalField,
  Title: '11111111-1111-4111-8111-111111111112',
  '__Workflow state': '11111111-1111-4111-8111-111111111113',
  '__Lock': '11111111-1111-4111-8111-111111111114',
  '__Revision': '11111111-1111-4111-8111-111111111115',
  '__Shared revision': '11111111-1111-4111-8111-111111111116',
  '__Updated': '11111111-1111-4111-8111-111111111117',
  '__Updated by': '11111111-1111-4111-8111-111111111118',
  '__Thumbnail': 'c7c26117-dbb1-42b2-ab5e-f7223845cca3',
  '__Created': CREATED_FIELD_ID,
};
const SHARED = `<r><d id="${DEVICE}" l="${OLD_LAYOUT}"><r uid="${SEARCH_UID}" id="${SEARCH}" ph="headless-main" ds="${SOURCE}" /><r uid="${GUIDANCE_UID}" id="${GUIDANCE}" ph="headless-main" ds="${SOURCE}" /></d></r>`;
const FINAL = `<r xmlns:s="s"><d id="${DEVICE}"><r uid="${GUIDANCE_UID}" s:ph="headless-main"><rls><ruleset s:pet="true"><rule s:name="native_ab_arm"><actions><action s:DataSource="existing_challenger" /></actions></rule></ruleset></rls></r></d></r>`;
const field = (version, name) => version.fields.find(f => f.name === name);
const versionKey = v => `${typeof v.language === 'string' ? v.language : v.language.name}:${v.version}`;
function fixture() {
  const version = (language, n, final) => ({
    language, version: n,
    fields: Object.entries({
      '__Renderings': SHARED, '__Final Renderings': final,
      Title: `Authored resource library ${typeof language === 'string' ? language : language.name} ${n}`,
      '__Workflow state': 'Approved-existing-workflow', '__Lock': '<r />',
      '__Revision': 'revision-before', '__Shared revision': 'shared-before',
      '__Updated': '20260914T100000Z', '__Updated by': 'existing-author',
      '__Thumbnail': '', '__Created': '20260910T140000Z',
    }).map(([name, value]) => ({ fieldId: FIELD_IDS[name], name, value })),
  });
  return {
    itemId: SOURCE, path: HOME + '/resources', template: { templateId: IDS.portalTemplate },
    parent: { itemId: GUIDANCE_UID, path: HOME },
    versions: [version('en', 1, ''), version({ name: 'en' }, 2, FINAL), version('fr', 1, FINAL.replace('native_ab_arm', 'native_fr_variant'))],
  };
}
function planned() {
  const before = fixture();
  const plan = planItemLayouts(before);
  return { before, plan, after: expectedItem(before, plan) };
}

test('expectedItem changes only reviewed presentation fields on their intended versions', () => {
  const before = fixture();
  const original = structuredClone(before);
  const plan = planItemLayouts(before);
  const after = expectedItem(before, plan);
  assert.deepEqual(before, original, 'Baseline is immutable');
  assert.notEqual(after, before);
  assert.equal(plan.finalChanges.length, 2);
  assert.equal(field(after.versions[0], '__Final Renderings').value, '');
  for (let i = 0; i < after.versions.length; i++) {
    const version = after.versions[i];
    assert.equal(versionKey(version), versionKey(before.versions[i]));
    assert.equal(field(version, '__Renderings').value, plan.sharedChange.after);
    for (const f of version.fields.filter(f => !['__Renderings', '__Final Renderings'].includes(f.name))) {
      assert.deepEqual(f, field(before.versions[i], f.name));
    }
  }
  assert.match(field(after.versions[1], '__Final Renderings').value, /native_ab_arm/);
  assert.match(field(after.versions[2], '__Final Renderings').value, /native_fr_variant/);
});

test('resumable states include before, shared-only, individual final versions and completed migration', () => {
  const { before, plan, after } = planned();
  const sharedOnly = structuredClone(before);
  for (const v of sharedOnly.versions) field(v, '__Renderings').value = plan.sharedChange.after;
  const partiallyCompleted = structuredClone(sharedOnly);
  field(partiallyCompleted.versions[1], '__Final Renderings').value = field(after.versions[1], '__Final Renderings').value;
  for (const current of [before, sharedOnly, partiallyCompleted, after]) {
    const original = structuredClone(current);
    assert.doesNotThrow(() => assertResumable(current, before, after));
    assert.deepEqual(current, original, 'Resume validation must not mutate its input');
  }
});

test('resume guard ignores only update metadata and normalizes inventory order', () => {
  const { before, after } = planned();
  const current = structuredClone(after);
  for (const v of current.versions) {
    for (const name of ['__Revision', '__Shared revision', '__Updated', '__Updated by']) field(v, name).value = `native-write-${name}`;
    v.fields.reverse();
  }
  current.versions.reverse();
  assert.doesNotThrow(() => assertResumable(current, before, after));
  assert.deepEqual(semantic(current), semantic(after));
});

test('resume guard rejects a third layout value, including changed datasource or personalization', () => {
  const { before, after } = planned();
  for (const [index, name, mutate] of [
    [0, '__Renderings', value => value.replace(SOURCE, GUIDANCE_UID)],
    [1, '__Final Renderings', value => value.replace('existing_challenger', 'another_challenger')],
    [2, '__Final Renderings', value => value.replace('native_fr_variant', 'revised_variant')],
  ]) {
    const current = structuredClone(after);
    for (const version of name === '__Renderings' ? current.versions : [current.versions[index]]) {
      field(version, name).value = mutate(field(version, name).value);
    }
    assert.throws(() => assertResumable(current, before, after), /Presentation changed/);
  }
});

test('resume guard rejects shared presentation that differs across languages or versions', () => {
  const { before, after } = planned();
  const inconsistent = structuredClone(before);
  field(inconsistent.versions[1], '__Renderings').value = field(after.versions[1], '__Renderings').value;
  assert.throws(() => assertResumable(inconsistent, before, after), /shared|Shared|inconsistent/i);
});

test('resume guard protects editorial content, workflow, lock state, hierarchy and template', () => {
  const { before, after } = planned();
  const mutations = [
    item => { field(item.versions[0], 'Title').value = 'Author edited this title'; },
    item => { field(item.versions[1], '__Workflow state').value = 'Draft'; },
    item => { field(item.versions[0], '__Lock').value = '<r owner="another-author" />'; },
    item => { item.template.templateId = GUIDANCE_UID; },
    item => { item.parent.itemId = SOURCE; },
    item => { item.path = HOME + '/different-page'; },
    item => { item.itemId = SEARCH_UID; },
    item => { item.versions[0].fields = item.versions[0].fields.filter(f => f.name !== 'Title'); },
  ];
  for (const mutate of mutations) {
    const current = structuredClone(after); mutate(current);
    assert.throws(() => assertResumable(current, before, after), /protected field, template, parent or version/);
  }
});

test('resume guard rejects added, removed or renumbered versions and languages', () => {
  const { before, after } = planned();
  const mutations = [
    item => { item.versions.pop(); },
    item => { item.versions.push({ ...structuredClone(item.versions[0]), version: 3 }); },
    item => { item.versions[0].version = 8; },
    item => { item.versions[2].language = 'es'; },
  ];
  for (const mutate of mutations) {
    const current = structuredClone(after); mutate(current);
    assert.throws(() => assertResumable(current, before, after), /inventory changed|protected field, template, parent or version/);
  }
});

test('snapshot scope includes only owned pages and the three owned standard-values items', () => {
  const targets = [fixture(), ...['Page', 'PortalPage', 'ResourcePage'].map((name, index) => ({
    ...fixture(), itemId: `00000000-0000-4000-8000-00000000000${index}`, path: TEMPLATE_ROOT + name + '/__Standard Values',
  }))];
  const outside = { ...fixture(), itemId: 'outside', path: '/sitecore/content/AnotherSite/Home' };
  assert.deepEqual(snapshotItems({ captured: [{ items: targets }, { items: [outside] }] }), targets);
  assert.deepEqual(snapshotItems({ items: [...targets, outside] }), targets);
  assert.throws(() => snapshotItems({ items: [targets[0]] }), /Unexpected page scope/);
  assert.throws(() => snapshotItems({ items: [...targets, targets[0]] }), /Duplicate target/);
});

test('readItem inventories all versions and paginates complete native fields using read-only queries', async () => {
  const calls = [];
  const result = await readItem(async (query, variables) => {
    assert.match(query, /^query\b/);
    calls.push({ query, variables });
    if (variables.id) return { item: {
      itemId: SOURCE, path: HOME + '/resources', parent: { itemId: GUIDANCE_UID }, template: { templateId: IDS.portalTemplate },
      versions: [{ language: { name: 'en' }, version: 2 }, { language: { name: 'fr' }, version: 1 }],
    } };
    assert.equal(variables.where.existingVersionOnly, true);
    assert.equal(variables.where.database, 'master');
    if (query.includes('revision:field')) return { item: { revision: { value: 'version-revision' }, sharedRevision: { value: 'shared-revision' } } };
    assert.match(query, /ownFields:false,withLanguageFallback:false/);
    const secondPage = variables.after === 'page-2';
    return { item: { fields: {
      nodes: [
        { fieldId: secondPage ? 'second' : 'first', name: secondPage ? 'Title' : '__Renderings', value: `${variables.where.language}-${variables.where.version}` },
        ...(secondPage ? [] : [
          { fieldId: 'revision', name: '__Revision', value: 'version-revision' },
          { fieldId: 'shared-revision', name: '__Shared revision', value: 'shared-revision' },
        ]),
      ],
      pageInfo: { hasNextPage: !secondPage, endCursor: secondPage ? null : 'page-2' },
    } } };
  }, SOURCE);
  assert.equal(calls.length, 7);
  assert.deepEqual(result.versions.map(v => [v.language, v.version, v.fields.length]), [['en', 2, 4], ['fr', 1, 4]]);
});

function nativeModelQuery(change) {
  const definitions = new Map();
  for (const [renderingId, component] of Object.entries(COMPONENTS)) definitions.set(PH[component.to], {
    path: '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/' + component.to,
    fields: [
      { fieldId: 'key', name: 'Placeholder Key', value: component.to },
      { fieldId: 'allowed', name: 'Allowed Controls', value: renderingId },
      { fieldId: 'editable', name: 'Editable', value: '1' },
    ],
  });
  for (const component of Object.values(COMPONENTS)) definitions.set(SITE_PH[component.to], {
    ...structuredClone(definitions.get(PH[component.to])),
    path: SITE_PH_ROOT + component.to, templateId: SITE_PH_TEMPLATE, parentId: SITE_PH_PARENT,
  });
  for (const [name, id] of Object.entries(LAYOUTS)) definitions.set(id, {
    path: '/sitecore/layout/Layouts/Project/LibertyMutual/' + name,
    fields: [{ fieldId: 'placeholders', name: 'Placeholders', value: LAYOUT_PH[name].map(key => `{${PH[key]}}`).join('|') }],
  });
  for (const definition of definitions.values()) definition.fields.push(
    { fieldId: 'revision', name: '__Revision', value: 'version-revision' },
    { fieldId: 'shared-revision', name: '__Shared revision', value: 'shared-revision' },
  );
  if (change) change(definitions);
  const readIds = [];
  return {
    readIds,
    query: async (query, variables) => {
      assert.match(query, /^query\b/);
      const id = variables.id || variables.where.itemId;
      const definition = definitions.get(id);
      if (!definition) return { item: null };
      if (variables.id) {
        readIds.push(id);
        return { item: { itemId: id, path: definition.path, parent: { itemId: definition.parentId || 'parent' }, template: { templateId: definition.templateId || 'template' }, versions: [{ language: { name: 'en' }, version: 1 }] } };
      }
      if (query.includes('revision:field')) return { item: { revision: { value: 'version-revision' }, sharedRevision: { value: 'shared-revision' } } };
      return { item: { fields: { nodes: definition.fields, pageInfo: { hasNextPage: false, endCursor: null } } } };
    },
  };
}

test('preflight reads global and SXA site settings for all four placeholders and all four layouts without writes', async () => {
  const model = nativeModelQuery();
  await preflightModel(model.query);
  assert.deepEqual(new Set(model.readIds), new Set([...Object.values(PH), ...Object.values(SITE_PH), ...Object.values(LAYOUTS)]));
});

test('preflight SXA placeholder identities, paths and templates match the actual serialized model', () => {
  for (const [key, id] of Object.entries(SITE_PH)) {
    const source = readFileSync(path.join(__dirname, '../items/liberty-mutual/items',
      `site-${key.slice('headless-'.length)}`, key + '.yml'), 'utf8');
    assert.equal(source.match(/^ID: "([^"]+)"/m)[1], id);
    assert.equal(source.match(/^Parent: "([^"]+)"/m)[1], SITE_PH_PARENT);
    assert.equal(source.match(/^Template: "([^"]+)"/m)[1], SITE_PH_TEMPLATE);
    assert.equal(source.match(/^Path: "([^"]+)"/m)[1], SITE_PH_ROOT + key);
  }
});

test('preflight rejects missing or incorrectly configured SXA site overrides even with valid global settings', async () => {
  const changes = [
    [definitions => definitions.delete(SITE_PH['headless-resource-search']), /Target item or version missing/],
    [definitions => { definitions.get(SITE_PH['headless-agent-guidance']).fields.find(f => f.name === 'Allowed Controls').value = ''; }, /allow exactly its component/],
    [definitions => { definitions.get(SITE_PH['headless-resource-search']).fields.find(f => f.name === 'Editable').value = ''; }, /author insertion/],
    [definitions => { definitions.get(SITE_PH['headless-resource-article']).templateId = '5c547d4e-7111-4995-95b0-6b561751bf2e'; }, /native SXA template/],
    [definitions => { definitions.get(SITE_PH['headless-products-spotlight']).parentId = GUIDANCE_UID; }, /owned presentation folder/],
    [definitions => { definitions.get(SITE_PH['headless-resource-search']).path = SITE_PH_ROOT + 'headless-main'; }, /Expected values to be strictly equal/],
  ];
  for (const [change, message] of changes) await assert.rejects(() => preflightModel(nativeModelQuery(change).query), message);
});

test('preflight rejects missing definitions, broad component allow-lists and wrong layout scope', async () => {
  const changes = [
    [definitions => definitions.delete(PH['headless-resource-search']), /Target item or version missing/],
    [definitions => { definitions.get(PH['headless-agent-guidance']).fields.find(f => f.name === 'Allowed Controls').value += '|' + SEARCH; }, /allow exactly its component/],
    [definitions => { definitions.get(LAYOUTS.ResourceArticleLayout).fields[0].value += '|{' + PH['headless-resource-search'] + '}'; }, /Layout exposes an unexpected placeholder/],
    [definitions => { definitions.get(LAYOUTS.ResourcesLayout).path += '/Other'; }, /Expected values to be strictly equal/],
  ];
  for (const [change, message] of changes) await assert.rejects(() => preflightModel(nativeModelQuery(change).query), message);
});

test('preflight rejects malformed layout multilist values instead of extracting and accepting only valid GUIDs', async () => {
  for (const mutate of [value => value + '|not-an-item-id', value => value.slice(1), value => value.slice(0, -1)]) {
    await assert.rejects(() => preflightModel(nativeModelQuery(definitions => {
      definitions.get(LAYOUTS.ResourcesLayout).fields[0].value = mutate(definitions.get(LAYOUTS.ResourcesLayout).fields[0].value);
    }).query), /Malformed layout placeholder list/);
  }
});

test('preflight requires an editable placeholder for component insertion', async () => {
  await assert.rejects(() => preflightModel(nativeModelQuery(definitions => {
    definitions.get(PH['headless-resource-search']).fields.find(f => f.name === 'Editable').value = '';
  }).query), /author insertion/);
});

test('native read rejects version or shared revision changes during pagination', async () => {
  for (const revision of ['revision', 'sharedRevision']) {
    const model = nativeModelQuery();
    const changedDuringRead = async (query, variables) => {
      const result = await model.query(query, variables);
      if (query.includes('revision:field')) result.item[revision].value = 'changed-after-fields-read';
      return result;
    };
    await assert.rejects(() => readItem(changedDuringRead, PH['headless-agent-guidance']), /Item changed during native read/);
  }
});

const GENERATED_MEDIA_ID = '44444444-4444-4444-8444-444444444444';
const GENERATED_THUMBNAIL = `<image mediaid="{${GENERATED_MEDIA_ID.toUpperCase()}}" />`;
function thumbnailScenario(route = '/resources') {
  const before = fixture();
  before.versions = before.versions.filter(v => versionKey(v).startsWith('en:'));
  before.path = HOME + route;
  if (route !== '/resources') {
    for (const v of before.versions) field(v, '__Renderings').value = SHARED.replace(`<r uid="${SEARCH_UID}" id="${SEARCH}" ph="headless-main" ds="${SOURCE}" />`, '');
    if (!route) before.template.templateId = IDS.pageTemplate;
  }
  const plan = planItemLayouts(before);
  const after = expectedItem(before, plan);
  const current = structuredClone(after);
  for (const v of current.versions) field(v, '__Thumbnail').value = GENERATED_THUMBNAIL;
  const pageId = before.itemId.replace(/[{}-]/g, '').toUpperCase();
  const mediaPath = `/sitecore/media library/Project/LibertyMutual/liberty-mutual-agent-portal/System/${pageId.slice(0, 4).split('').join('/')}/thumbnail_${pageId}`;
  const media = { itemId: GENERATED_MEDIA_ID, path: mediaPath };
  const calls = [];
  const query = async (queryText, variables) => {
    assert.match(queryText, /^query\b/);
    assert.match(queryText, /database:"master"/);
    assert.deepEqual(variables, { id: GENERATED_MEDIA_ID });
    calls.push(variables.id);
    return { item: media };
  };
  return { before, after, current, plan, media, query, calls };
}

test('verified native thumbnail permits an applied Home or Quote layout to resume without changing any input', async () => {
  for (const route of ['', '/quote']) {
    const scenario = thumbnailScenario(route);
    const originals = [scenario.before, scenario.after, scenario.current].map(item => structuredClone(item));
    const result = await verifyResumableItem(scenario.query, scenario.current, scenario.before, scenario.after);
    assert.equal(scenario.calls.length, 1);
    assert.deepEqual(result.comparison, scenario.after, 'Only the verified thumbnail is normalized for comparison');
    assert.deepEqual(result.sideEffects, [{
      kind: 'native-generated-page-thumbnail', itemId: scenario.current.itemId, path: scenario.current.path,
      field: '__Thumbnail', mediaItemId: GENERATED_MEDIA_ID, mediaPath: scenario.media.path,
      versions: ['en:1', 'en:2'],
    }]);
    assert.deepEqual([scenario.before, scenario.after, scenario.current], originals);
    assert.equal(field(scenario.current.versions[0], '__Thumbnail').value, GENERATED_THUMBNAIL);
    assert.equal(field(result.comparison.versions[0], '__Renderings').value, scenario.plan.sharedChange.after);
  }
});

test('unchanged existing thumbnails remain protected and require no media query', async () => {
  const scenario = thumbnailScenario();
  for (const item of [scenario.before, scenario.after]) for (const v of item.versions) field(v, '__Thumbnail').value = GENERATED_THUMBNAIL;
  const result = await verifyResumableItem(async () => { throw new Error('No thumbnail exception should be needed'); }, scenario.current, scenario.before, scenario.after);
  assert.deepEqual(result.sideEffects, []);
  assert.equal(field(result.comparison.versions[0], '__Thumbnail').value, GENERATED_THUMBNAIL);
  for (const v of scenario.current.versions) field(v, '__Thumbnail').value = '<image mediaid="{55555555-5555-4555-8555-555555555555}" />';
  await assert.rejects(() => verifyResumableItem(scenario.query, scenario.current, scenario.before, scenario.after), /existing thumbnail must remain unchanged/);
  assert.equal(scenario.calls.length, 0);
});

test('thumbnail exception requires an actual shared-layout change already applied to every version', async () => {
  const scenario = thumbnailScenario();
  const unmigrated = structuredClone(scenario.before);
  for (const v of unmigrated.versions) field(v, '__Thumbnail').value = GENERATED_THUMBNAIL;
  await assert.rejects(() => verifyResumableItem(scenario.query, unmigrated, scenario.before, scenario.after), /shared layout to be applied/);
  const noLayoutChange = structuredClone(scenario.current);
  for (const v of noLayoutChange.versions) field(v, '__Renderings').value = field(scenario.before.versions[0], '__Renderings').value;
  await assert.rejects(() => verifyResumableItem(scenario.query, noLayoutChange, scenario.before, scenario.before), /reviewed shared-layout change/);
  const mixed = structuredClone(scenario.current);
  field(mixed.versions[1], '__Renderings').value = field(scenario.before.versions[1], '__Renderings').value;
  await assert.rejects(() => verifyResumableItem(scenario.query, mixed, scenario.before, scenario.after), /shared layout to be applied/);
  assert.equal(scenario.calls.length, 0);
});

test('thumbnail exception rejects standard values, another site, and changed page identity or path', async () => {
  for (const invalidPath of [TEMPLATE_ROOT + 'PortalPage/__Standard Values', '/sitecore/content/AnotherSite/Home']) {
    const s = thumbnailScenario();
    for (const item of [s.current, s.before, s.after]) item.path = invalidPath;
    await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /limited to owned pages/);
    assert.equal(s.calls.length, 0);
  }
  for (const mutate of [item => { item.itemId = GUIDANCE_UID; }, item => { item.path = HOME + '/quote'; }]) {
    const s = thumbnailScenario(); mutate(s.current);
    await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /page identity changed|page path changed/);
  }
});

test('thumbnail exception rejects inconsistent versions, changed language inventory and non-English updates', async () => {
  const mutations = [
    item => { field(item.versions[1], '__Thumbnail').value = ''; },
    item => { item.versions[1].language = 'fr'; },
    item => { item.versions.pop(); },
    item => { item.versions[1].version = 1; },
  ];
  for (const mutate of mutations) {
    const s = thumbnailScenario(); mutate(s.current);
    await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /English|inventory/);
    assert.equal(s.calls.length, 0);
  }
});

test('thumbnail exception requires the native thumbnail field and an exactly empty baseline', async () => {
  for (const mutate of [
    item => { field(item.versions[0], '__Thumbnail').fieldId = GUIDANCE_UID; },
    item => { item.versions[0].fields = item.versions[0].fields.filter(f => f.name !== '__Thumbnail'); },
  ]) {
    const s = thumbnailScenario(); mutate(s.before);
    await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /native thumbnail field/);
  }
  const whitespace = thumbnailScenario();
  for (const v of whitespace.before.versions) field(v, '__Thumbnail').value = ' ';
  await assert.rejects(() => verifyResumableItem(whitespace.query, whitespace.current, whitespace.before, whitespace.after), /existing thumbnail must remain unchanged/);
});

test('thumbnail XML accepts only one exact native image reference', async () => {
  const invalid = [
    GENERATED_THUMBNAIL + GENERATED_THUMBNAIL,
    GENERATED_THUMBNAIL.replace(' />', ' alt="unreviewed" />'),
    GENERATED_THUMBNAIL.replace('mediaid', 'src'),
    GENERATED_THUMBNAIL.replace('<image', '<IMAGE'),
    GENERATED_THUMBNAIL.replace('{', ''),
    GENERATED_THUMBNAIL.replace('44444444-', 'invalid-'),
    ' ' + GENERATED_THUMBNAIL,
    '<!DOCTYPE image>' + GENERATED_THUMBNAIL,
  ];
  for (const image of invalid) {
    const s = thumbnailScenario();
    for (const v of s.current.versions) field(v, '__Thumbnail').value = image;
    await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /exactly one native image reference/);
    assert.equal(s.calls.length, 0);
  }
});

test('thumbnail media must exist and have this exact page-specific native system path and identity', async () => {
  const s = thumbnailScenario();
  for (const media of [
    null,
    { ...s.media, itemId: GUIDANCE_UID },
    { ...s.media, path: s.media.path.replace('/System/3/', '/System/4/') },
    { ...s.media, path: s.media.path.replace('thumbnail_', 'other_') },
    { ...s.media, path: s.media.path + '/child' },
    { ...s.media, path: s.media.path.replace('LibertyMutual', 'AnotherSite') },
  ]) {
    await assert.rejects(() => verifyResumableItem(async () => ({ item: media }), s.current, s.before, s.after), /does not belong to this page/);
  }
  await assert.rejects(() => verifyResumableItem(async () => { throw new Error('Native media lookup failed'); }, s.current, s.before, s.after), /Native media lookup failed/);
});

test('verified thumbnail cannot mask creation, content, workflow or personalization changes', async () => {
  const mutations = [
    item => { field(item.versions[0], '__Created').value = '20260914T214251Z'; },
    item => { field(item.versions[0], 'Title').value = 'Concurrent title edit'; },
    item => { field(item.versions[0], '__Workflow state').value = 'Draft'; },
    item => { field(item.versions[1], '__Final Renderings').value += ' '; },
  ];
  for (const mutate of mutations) {
    const s = thumbnailScenario(); mutate(s.current);
    await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /protected field|Presentation changed/);
    assert.equal(field(s.current.versions[0], '__Thumbnail').value, GENERATED_THUMBNAIL);
  }
});

test('placement payload preserves the guarded creation timestamp and never writes a thumbnail or workflow', () => {
  assert.equal(CREATED_FIELD_ID, '25bed78c-4957-4165-998a-ca1b52f67497');
  const { before, plan } = planned();
  const shared = { ...plan.sharedChange, language: 'en', version: 1 };
  const final = plan.finalChanges.find(change => change.language === 'en');
  for (const change of [shared, final]) {
    const original = structuredClone(before);
    const payload = placementUpdateInput(before, change);
    assert.deepEqual(payload, { database: 'master', itemId: before.itemId, language: change.language, version: change.version,
      fields: [{ name: change.name, value: change.after }, { name: '__Created', value: '20260910T140000Z' }] });
    assert.deepEqual(before, original);
  }
});

test('placement payload rejects missing creation metadata, altered layout, wrong field or missing version', () => {
  const { before, plan } = planned();
  const change = { ...plan.sharedChange, language: 'en', version: 1 };
  const noCreated = structuredClone(before);
  noCreated.versions[0].fields = noCreated.versions[0].fields.filter(f => f.name !== '__Created');
  assert.throws(() => placementUpdateInput(noCreated, change), /creation timestamp/);
  const altered = structuredClone(before); field(altered.versions[0], '__Renderings').value += ' ';
  assert.throws(() => placementUpdateInput(altered, change), /Placement changed/);
  assert.throws(() => placementUpdateInput(before, { ...change, name: '__Thumbnail' }), /Only a reviewed presentation field/);
  assert.throws(() => placementUpdateInput(before, { ...change, version: 99 }), /version is missing/);
});

function creationScenario() {
  const s = thumbnailScenario('/clients');
  field(s.current.versions[0], '__Created').value = '20260914T215403Z';
  field(s.current.versions[0], '__Updated').value = '20260914T215403Z';
  const digest = value => createHash('sha256').update(value).digest('hex');
  const intent = {
    phase: 'write-intent', at: '2026-09-14T21:54:02.999Z',
    itemId: s.before.itemId, path: s.before.path, language: 'en', version: 1, field: '__Renderings',
    beforeSha256: digest(s.plan.sharedChange.before), afterSha256: digest(s.plan.sharedChange.after),
  };
  const context = { environment: 'reviewed-environment', baselineSha256: 'reviewed-baseline-sha256', journal: {
    environment: 'reviewed-environment', baselineSha256: 'reviewed-baseline-sha256', entries: [intent],
  } };
  return { ...s, context, intent };
}

test('read-only creation repair review reports a journal-bound reset without mutations or discarded actual values', async () => {
  const s = creationScenario();
  const beforeInputs = structuredClone([s.current, s.before, s.after, s.context]);
  const review = await reviewCreatedRepairs(s.query, s.current, s.before, s.after, s.context);
  assert.equal(review.creationRepairs.length, 1);
  assert.equal(review.creationRepairs[0].before, '20260914T215403Z');
  assert.equal(review.creationRepairs[0].after, '20260910T140000Z');
  assert.equal(review.creationRepairs[0].layoutIntentAt, s.intent.at);
  assert.equal(field(review.comparison.versions[0], '__Created').value, '20260910T140000Z');
  assert.deepEqual([s.current, s.before, s.after, s.context], beforeInputs);
  assert.equal(s.calls.length, 1, 'Only the existing generated media was read');
  await assert.rejects(() => verifyResumableItem(s.query, s.current, s.before, s.after), /protected field/,
    'Final audit remains strict until the timestamp has really been restored');
});

test('creation repair requires the same validated journal baseline and environment', async () => {
  for (const change of [context => { context.journal = null; }, context => { context.journal.baselineSha256 = 'another-baseline'; }, context => { context.journal.environment = 'another-environment'; }]) {
    const s = creationScenario(); change(s.context);
    await assert.rejects(() => reviewCreatedRepairs(s.query, s.current, s.before, s.after, s.context), /different baseline\/environment/);
    assert.equal(s.calls.length, 0);
  }
});

test('creation repair requires one exact item/version/layout intent with matching before and after hashes', async () => {
  for (const change of [
    intent => { intent.itemId = SEARCH_UID; }, intent => { intent.path = HOME + '/quote'; },
    intent => { intent.language = 'fr'; }, intent => { intent.version = 2; },
    intent => { intent.field = 'Title'; }, intent => { intent.phase = 'write-verified'; },
    intent => { intent.beforeSha256 = 'wrong'; }, intent => { intent.afterSha256 = 'wrong'; },
  ]) {
    const s = creationScenario(); change(s.intent);
    await assert.rejects(() => reviewCreatedRepairs(s.query, s.current, s.before, s.after, s.context), /one matching recent layout write-intent/);
  }
  const duplicate = creationScenario(); duplicate.context.journal.entries.push(structuredClone(duplicate.intent));
  await assert.rejects(() => reviewCreatedRepairs(duplicate.query, duplicate.current, duplicate.before, duplicate.after, duplicate.context), /one matching recent layout write-intent/);
});

test('creation repair is limited to an equal Updated timestamp within sixty seconds of the recorded save', async () => {
  for (const at of ['2026-09-14T21:53:02.999Z', '2026-09-14T21:54:04.000Z', 'not-a-date']) {
    const s = creationScenario(); s.intent.at = at;
    await assert.rejects(() => reviewCreatedRepairs(s.query, s.current, s.before, s.after, s.context), /one matching recent layout write-intent/);
  }
  const differentUpdated = creationScenario(); field(differentUpdated.current.versions[0], '__Updated').value = '20260914T215404Z';
  await assert.rejects(() => reviewCreatedRepairs(differentUpdated.query, differentUpdated.current, differentUpdated.before, differentUpdated.after, differentUpdated.context), /exactly match the native update timestamp/);
  const sameSecond = creationScenario(); sameSecond.intent.at = '2026-09-14T21:54:03.987Z';
  assert.equal((await reviewCreatedRepairs(sameSecond.query, sameSecond.current, sameSecond.before, sameSecond.after, sameSecond.context)).creationRepairs.length, 1);
});

test('creation repair review rejects unapplied layouts and every unrelated protected field change', async () => {
  for (const mutate of [
    s => { field(s.current.versions[0], '__Renderings').value = s.plan.sharedChange.before; },
    s => { field(s.current.versions[0], 'Title').value = 'Concurrent author title'; },
    s => { field(s.current.versions[0], '__Workflow state').value = 'Draft'; },
    s => { field(s.current.versions[1], '__Final Renderings').value += ' '; },
    s => { field(s.current.versions[0], '__Thumbnail').value = '<image mediaid="{55555555-5555-4555-8555-555555555555}" />'; },
  ]) {
    const s = creationScenario(); mutate(s);
    await assert.rejects(() => reviewCreatedRepairs(s.query, s.current, s.before, s.after, s.context));
  }
});

test('creation restoration journals intent, writes only the original creation value and verifies all fields', async () => {
  const s = creationScenario();
  let live = structuredClone(s.current), writes = 0;
  const entries = [];
  const query = async (queryText, variables) => {
    if (queryText.startsWith('query')) return s.query(queryText, variables);
    writes++;
    assert.equal(entries.at(-1).phase, 'restore-intent');
    assert.deepEqual(variables.input, { database: 'master', itemId: s.current.itemId, language: 'en', version: 1,
      fields: [{ name: '__Created', value: '20260910T140000Z' }] });
    field(live.versions[0], '__Created').value = '20260910T140000Z';
    field(live.versions[0], '__Updated').value = '20260914T220000Z';
    field(live.versions[0], '__Revision').value = 'native-restoration-revision';
    return { updateItem: { item: { itemId: live.itemId } } };
  };
  const result = await restoreCreatedMetadata(query, s.current, s.before, s.after, s.context,
    entry => entries.push(entry), async () => structuredClone(live));
  assert.equal(writes, 1);
  assert.deepEqual(entries.map(entry => entry.phase), ['restore-intent', 'restore-verified']);
  assert.equal(field(result.current.versions[0], '__Created').value, '20260910T140000Z');
  assert.equal(field(result.current.versions[0], '__Thumbnail').value, GENERATED_THUMBNAIL);
  assert.equal(field(s.current.versions[0], '__Created').value, '20260914T215403Z', 'Original snapshot remains unchanged');
  assert.deepEqual(semantic(result.verified.comparison), semantic(s.after));
});

test('uncertain creation restoration stops after one write and a subsequent read-only review observes success', async () => {
  const s = creationScenario();
  let live = structuredClone(s.current), writes = 0, readsAfterWrite = 0;
  const entries = [];
  const query = async (queryText, variables) => {
    if (queryText.startsWith('query')) return s.query(queryText, variables);
    writes++;
    field(live.versions[0], '__Created').value = '20260910T140000Z';
    throw new Error('Uncertain restoration response');
  };
  await assert.rejects(() => restoreCreatedMetadata(query, s.current, s.before, s.after, s.context,
    entry => entries.push(entry), async () => { readsAfterWrite++; return structuredClone(live); }), /Uncertain restoration response/);
  assert.equal(writes, 1);
  assert.equal(readsAfterWrite, 0);
  assert.deepEqual(entries.map(entry => entry.phase), ['restore-intent']);
  assert.deepEqual((await reviewCreatedRepairs(s.query, live, s.before, s.after, s.context)).creationRepairs, []);
});

test('creation restoration rejects unrelated changes during its one-field write', async () => {
  const s = creationScenario();
  const live = structuredClone(s.current), entries = [];
  const query = async (queryText, variables) => {
    if (queryText.startsWith('query')) return s.query(queryText, variables);
    field(live.versions[0], '__Created').value = '20260910T140000Z';
    field(live.versions[0], 'Title').value = 'Concurrent edit after intent';
    return { updateItem: { item: { itemId: live.itemId } } };
  };
  await assert.rejects(() => restoreCreatedMetadata(query, s.current, s.before, s.after, s.context,
    entry => entries.push(entry), async () => structuredClone(live)), /changed another protected field/);
  assert.deepEqual(entries.map(entry => entry.phase), ['restore-intent']);
});
