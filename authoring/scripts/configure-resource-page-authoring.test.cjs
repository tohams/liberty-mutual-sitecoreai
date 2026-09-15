'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('./resource-page-authoring-model.cjs');
const C = require('./configure-resource-page-authoring.cjs');
const { xmlShape } = require('./configure-product-spotlight.cjs');
const ROOT = path.resolve(__dirname, '../..');

function fixture(target = C.TARGETS.find(t => t.id === M.IDS.prototype)) {
  const fields = [
    ...target.fields.map(([name, fieldId]) => ({ name, fieldId, value: name === '__Masters' ? M.brace(M.IDS.portalPageTemplate) : '' })),
    { name: 'Title', fieldId: 'd3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b', value: '$name' },
    { name: 'body', fieldId: 'e4144560-576a-559b-9110-b56e9a58a338', value: '' },
    { name: '__Revision', fieldId: '8cdc337e-a112-42fb-bbb4-4143751e123f', value: 'revision-before' },
    { name: '__Lock', fieldId: '001dd393-96c5-490b-924a-b0f25cd9efd8', value: '' },
  ];
  return { itemId: target.id, path: target.path, template: { templateId: target.template }, parent: { itemId: M.IDS.branch },
    versions: [{ language: 'en', version: 1, fields }, { language: 'en', version: 2, fields: structuredClone(fields) }] };
}
test('branch layout has one current-page article and one local image at the restricted nested slot', () => {
  const layout = xmlShape(M.branchLayout()), device = layout[3][0];
  const components = device[3].map(node => Object.fromEntries(node[1]));
  assert.equal(components.length, 2);
  assert.equal(components[0].ds, '$id');
  assert.equal(components[0].ph, 'headless-resource-article');
  assert.equal(M.norm(components[0].id), M.norm(M.IDS.articleRendering));
  assert.equal(components[1].ds, 'page:/Data/Resource image');
  assert.equal(components[1].ph, '/headless-resource-article/headless-resource-image');
  assert.equal(M.norm(components[1].id), M.norm(M.IDS.rendering));
  assert(!M.branchLayout().includes(M.IDS.prototype), 'Created pages must not point back to the branch prototype.');
});
test('resource insert rule is exact-parent scoped and idempotent while preserving other rules', () => {
  const old = '<ruleset><rule uid="{11111111-1111-4111-8111-111111111111}" name="Existing"><conditions /></rule></ruleset>';
  const combined = M.appendRule(old);
  assert(combined.startsWith(old.slice(0, -10)));
  assert.equal(M.appendRule(combined), combined);
  const rule = xmlShape(M.RULE_XML, 'rule');
  const condition = Object.fromEntries(rule[3][0][3][0][1]);
  const action = Object.fromEntries(rule[3][1][3][0][1]);
  assert.equal(M.norm(condition.id), M.norm(M.IDS.itemCondition));
  assert.equal(M.norm(condition.value), M.norm(M.IDS.resources));
  assert.equal(M.norm(condition.operatorid), M.norm(M.IDS.equalsOperator));
  assert.equal(M.norm(action.PageBranchId), M.norm(M.IDS.branch));
  assert.throws(() => M.appendRule(combined.replace('Resource page beneath', 'Changed rule beneath')), /changed/);
});
test('available renderings additions retain existing order and unknown valid IDs', () => {
  const old = '{11111111-1111-4111-8111-111111111111}\n' + M.brace(M.IDS.articleRendering);
  const next = M.appendId(old, M.IDS.rendering);
  assert(next.startsWith(old));
  assert.equal(M.appendId(next, M.IDS.rendering), next);
  assert.throws(() => M.appendId('invalid', M.IDS.rendering), /Unsupported/);
});
test('configuration plans preserve text, all versions, native variants and unrelated fields', () => {
  const target = C.TARGETS.find(t => t.id === M.IDS.prototype), before = fixture(target);
  const plan = C.planItem(before, target), expected = C.expectedItem(before, plan);
  assert.equal(plan.changes.length, 2);
  assert.equal(before.versions[0].fields.find(f => f.name === '__Renderings').value, '');
  assert.equal(expected.versions[1].fields.find(f => f.name === '__Renderings').value, M.branchLayout());
  assert.equal(expected.versions[1].fields.find(f => f.name === 'Title').value, '$name');
  C.assertResumable(before, before, plan);
  C.assertResumable(expected, before, plan);
  const partial = structuredClone(expected);
  partial.versions.forEach(v => { v.fields.find(f => f.name === '__Masters').value = M.brace(M.IDS.portalPageTemplate); });
  C.assertResumable(partial, before, plan);
  assert.equal(C.planItem(expected, target).changes.length, 0);
});
test('concurrent author edits, locks, version changes, wrong identity and unexpected layout stop safely', () => {
  const target = C.TARGETS.find(t => t.id === M.IDS.prototype), before = fixture(target), plan = C.planItem(before, target);
  for (const change of [
    item => { item.versions[0].fields.find(f => f.name === 'body').value = '<p>Author text</p>'; },
    item => { item.versions.push({ ...structuredClone(item.versions[0]), version: 3 }); },
    item => { item.versions[0].fields.find(f => f.name === '__Renderings').value = '<r><d /></r>'; },
    item => { item.path = M.SITE + '/Home/workspace'; },
  ]) {
    const current = structuredClone(before); change(current);
    assert.throws(() => C.assertResumable(current, before, plan));
  }
  const locked = structuredClone(before); locked.versions.forEach(v => { v.fields.find(f => f.name === '__Lock').value = '<r owner="another-author" />'; });
  assert.throws(() => C.planItem(locked, target), /locked/);
  const wrong = structuredClone(before); wrong.itemId = M.IDS.resources;
  assert.throws(() => C.planItem(wrong, target), /identity/);
});
test('editable branch remains CreateOnly and outside authoring resource packages', () => {
  const json = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const module = json('authoring/items/liberty-mutual/LibertyMutual.ResourcePageBranch.module.json');
  assert.deepEqual(module.items.includes, [{ name: 'resource-page-branch', path: M.BRANCH_PATH, allowedPushOperations: 'CreateOnly' }]);
  assert(!json('xmcloud.build.json').deployItems.modules.includes(module.namespace));
  assert(json('authoring/items/liberty-mutual/LibertyMutual.Content.module.json').items.includes[0].rules.some(rule =>
    rule.path === M.BRANCH_PATH.replace('/sitecore/content/LibertyMutual', '') && rule.scope === 'Ignored'));
  const manifest = json('authoring/items/liberty-mutual/resource-page-authoring-manifest.json');
  assert.equal(manifest.branchLayout, M.branchLayout());
  assert.deepEqual(manifest.localImageFields, ['image', 'caption']);
  assert.equal(manifest.IDS.pageTemplate, json('examples/liberty-mutual-agent-portal/src/data/resource-metadata-model.json').model.resourceTemplateId);
});

test('child insert overrides apply before the parent default changes inherited values', () => {
  const ids = [M.IDS.portalDefaults, M.IDS.pageDefaults, M.IDS.prototype, M.IDS.resources];
  const targets = C.TARGETS.filter(target => ids.includes(target.id));
  function migrate(order) {
    const owned = new Map([[M.IDS.portalDefaults, M.brace(M.IDS.portalPageTemplate) + '|' + M.brace(M.IDS.pageTemplate)]]);
    const inheritedFrom = new Map([
      [M.IDS.pageDefaults, M.IDS.portalDefaults],
      [M.IDS.prototype, M.IDS.pageDefaults],
      [M.IDS.resources, M.IDS.portalDefaults],
    ]);
    const resolved = id => owned.has(id) ? owned.get(id) : resolved(inheritedFrom.get(id));
    const read = target => {
      const item = fixture(target);
      item.versions.forEach(version => { version.fields.find(f => f.name === '__Masters').value = resolved(target.id); });
      return item;
    };
    const baselines = new Map(targets.map(target => [target.id, read(target)]));
    for (const target of order) {
      const before = baselines.get(target.id), plan = C.planItem(before, target), current = read(target);
      C.assertResumable(current, before, plan);
      const change = plan.changes.find(field => field.name === '__Masters');
      if (change && resolved(target.id) !== change.after) owned.set(target.id, change.after);
    }
    assert.equal(resolved(M.IDS.pageDefaults), M.brace(M.IDS.dataTemplate));
    assert.equal(resolved(M.IDS.prototype), M.brace(M.IDS.dataTemplate));
    assert.equal(resolved(M.IDS.resources), M.brace(M.IDS.branch));
    assert.equal(resolved(M.IDS.portalDefaults), M.brace(M.IDS.portalPageTemplate));
  }
  migrate(targets);
  // This is the native failure that prompted the ordering fix: the parent
  // changes inherited child values to a third value outside the reviewed plan.
  assert.throws(() => migrate([
    targets.find(target => target.id === M.IDS.portalDefaults),
    ...targets.filter(target => target.id !== M.IDS.portalDefaults),
  ]), /outside this plan/);
});
