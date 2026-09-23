'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { plan, targets } = require('./configure-product-catalog.cjs');
const M = require('../items/liberty-mutual/product-catalog-authoring-manifest.json');
const brace = id => '{' + id.toUpperCase() + '}';

function item(target, current) {
  return {
    itemId: target.id, path: target.path, version: 1,
    fields: [{ name: target.field, value: current }, { name: '__Lock', value: '' },
      { name: 'Title', value: 'Keep the current title' }],
  };
}

test('product insert options append the branch without dropping or reordering existing choices', () => {
  const target = targets.find(target => target.field === '__Masters');
  const current = '{D8E5D742-1AE3-5B2E-ABA9-553D4A53C3FC}\n{11111111-1111-4111-8111-111111111111}';
  const before = item(target, current);
  const unchanged = structuredClone(before);
  const change = plan(before, target);
  assert.equal(change.after, current + '|' + brace(M.ids.branch));
  assert.deepEqual(before, unchanged);
  assert.equal(plan(item(target, change.after), target).after, change.after);
  const lowercase = current + '|' + brace(M.ids.branch).toLowerCase();
  assert.equal(plan(item(target, lowercase), target).after, lowercase);
  assert.throws(() => plan(item(target, 'invalid'), target), /Unsupported item-reference list/);
});

test('product rule appends once and preserves unrelated rule text verbatim', () => {
  const target = targets.find(target => target.field === 'Rule');
  const existing = '<rule uid="{11111111-1111-4111-8111-111111111111}" name="Existing resource rule"><conditions /></rule>';
  const current = '<ruleset>\n' + existing + '\n</ruleset>';
  const change = plan(item(target, current), target);
  assert(change.after.startsWith('<ruleset>\n' + existing + '\n'));
  assert.equal(plan(item(target, change.after), target).after, change.after);
  assert.equal(plan(item(target, ''), target).after, M.branchInsertRule);
});

test('equivalent lowercase GUIDs and formatted XML do not duplicate the product rule', () => {
  const target = targets.find(target => target.field === 'Rule');
  const current = M.branchInsertRule.replace(/\{[A-F\d-]+\}/g, id => id.toLowerCase()).replace(/></g, '>\n  <');
  assert.equal(plan(item(target, current), target).after, current);
});

test('customized matching rules, duplicate IDs, and malformed XML stop without a plan', () => {
  const target = targets.find(target => target.field === 'Rule');
  const lower = M.branchInsertRule.replace(/\{[A-F\d-]+\}/g, id => id.toLowerCase());
  assert.throws(() => plan(item(target, lower.replace('Product page beneath Products', 'Customized')), target), /customized/);
  assert.throws(() => plan(item(target, lower.replace(M.ids.productsPage, '11111111-1111-4111-8111-111111111111')), target), /customized/);
  const repeated = M.branchInsertRule.replace('</ruleset>', lower.replace(/^<ruleset>/, ''));
  assert.throws(() => plan(item(target, repeated), target), /duplicated/);
  assert.throws(() => plan(item(target, '<ruleset><rule>'), target), /could not be parsed/);
});

test('component palette additions preserve existing IDs and detect normalized membership', () => {
  const target = targets.find(target => target.field === 'Renderings');
  const current = '{193A0299-B5B6-5668-B792-9F3552463163}|{1962D596-4187-51C9-A91F-4D39A9318B51}';
  assert.equal(plan(item(target, current), target).after, current + '|' + brace(M.renderingIds.ProductDetails));
  const lower = current + '|' + brace(M.renderingIds.ProductDetails).toLowerCase();
  assert.equal(plan(item(target, lower), target).after, lower);
});

test('locked items and changed target identities fail before configuration is planned', () => {
  const target = targets[0];
  const locked = item(target, '');
  locked.fields.find(field => field.name === '__Lock').value = '<r owner="another-author" />';
  assert.throws(() => plan(locked, target), /locked/);
  assert.throws(() => plan({ ...item(target, ''), path: M.site + '/Home' }, target), /identity/);
  assert.throws(() => plan({ ...item(target, ''), itemId: M.ids.branch }, target), /identity/);
});
