'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  snapshotItems, expectedItem, semantic, assertResumable, readItem, preflightModel, PH, LAYOUT_PH,
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
const FIELD_IDS = {
  '__Renderings': IDS.sharedField, '__Final Renderings': IDS.finalField,
  Title: '11111111-1111-4111-8111-111111111112',
  '__Workflow state': '11111111-1111-4111-8111-111111111113',
  '__Lock': '11111111-1111-4111-8111-111111111114',
  '__Revision': '11111111-1111-4111-8111-111111111115',
  '__Shared revision': '11111111-1111-4111-8111-111111111116',
  '__Updated': '11111111-1111-4111-8111-111111111117',
  '__Updated by': '11111111-1111-4111-8111-111111111118',
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
        return { item: { itemId: id, path: definition.path, parent: { itemId: 'parent' }, template: { templateId: 'template' }, versions: [{ language: { name: 'en' }, version: 1 }] } };
      }
      if (query.includes('revision:field')) return { item: { revision: { value: 'version-revision' }, sharedRevision: { value: 'shared-revision' } } };
      return { item: { fields: { nodes: definition.fields, pageInfo: { hasNextPage: false, endCursor: null } } } };
    },
  };
}

test('preflight reads all four owned placeholder settings and all four layouts without writes', async () => {
  const model = nativeModelQuery();
  await preflightModel(model.query);
  assert.deepEqual(new Set(model.readIds), new Set([...Object.values(PH), ...Object.values(LAYOUTS)]));
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
