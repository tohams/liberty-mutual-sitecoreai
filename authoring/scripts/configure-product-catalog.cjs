#!/usr/bin/env node
'use strict';
// Scoped authoring configuration. Capture a baseline, review, then apply.
// Editorial pages and their content are never written by this script.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { connection, read, value, writePrivate } = require('./campaign-native-client.cjs');
const { xmlShape } = require('./configure-product-spotlight.cjs');
const M = require('../items/liberty-mutual/product-catalog-authoring-manifest.json');
const norm = value => String(value).replace(/[{}-]/g, '').toLowerCase();
const brace = id => '{' + id.toUpperCase() + '}';
function appendId(current, id) {
  const tokens = current.split(/[|\r\n]+/).map(token => token.trim()).filter(Boolean);
  assert(tokens.every(token => /^\{[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}$/i.test(token)), 'Unsupported item-reference list.');
  if (tokens.some(token => norm(token) === norm(id))) return current;
  return current + (tokens.length ? '|' : '') + brace(id);
}
function normalizedRule([tag, attributes, text, children]) {
  return [tag, attributes.map(([key, val]) => [key,
    /^[a-f\d]{32}$/.test(norm(val)) ? norm(val) : val,
  ]), text, children.map(normalizedRule)];
}
function appendBranchRule(current) {
  if (!current.trim()) return M.branchInsertRule;
  const expected = xmlShape(M.branchInsertRule, 'ruleset')[3][0];
  const shape = xmlShape(current, 'ruleset');
  const matching = shape[3].filter(node => node[0] === 'rule' && norm(Object.fromEntries(node[1]).uid) === norm(M.branchRuleId));
  if (matching.length) {
    assert(matching.length === 1, 'Product page insert rule is duplicated.');
    assert.deepEqual(normalizedRule(matching[0]), normalizedRule(expected), 'Existing Product page insert rule was customized.');
    return current;
  }
  assert(/<\/ruleset>\s*$/.test(current), 'Unexpected page branch rules.');
  const rule = M.branchInsertRule.replace(/^<ruleset>/, '').replace(/<\/ruleset>$/, '');
  return current.replace(/<\/ruleset>\s*$/, rule + '</ruleset>');
}
const targets = [
  { id: M.ids.productsPage, path: M.site + '/Home/products', field: '__Masters', fieldId: '1172f251-dad4-4efb-a329-0c63500e4f1e',
    next: current => appendId(current, M.ids.branch) },
  { id: M.ids.branchFolder, path: M.site + '/Presentation/Page Branches', field: 'Rule', fieldId: M.branchRuleFieldId,
    next: appendBranchRule },
  { id: 'e49da1ae-6054-5b18-b221-384f51d1e376', path: M.site + '/Presentation/Available Renderings/Agent portal',
    field: 'Renderings', fieldId: '715ae6c0-71c8-4744-ab4f-65362d20ad65',
    next: current => appendId(current, M.renderingIds.ProductDetails) },
];
function plan(item, target) {
  assert(item && norm(item.itemId) === norm(target.id) && item.path === target.path, 'Target identity changed.');
  assert(!value(item, '__Lock').trim() || /^<r\s*\/\s*>$/.test(value(item, '__Lock')), 'Target is locked.');
  const before = value(item, target.field);
  return { itemId: item.itemId, path: item.path, field: target.field, fieldId: target.fieldId, before, after: target.next(before) };
}
async function run() {
  const [environment, ...args] = process.argv.slice(2);
  const option = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const apply = args.includes('--apply');
  const { query } = connection(environment, apply);
  const items = [];
  for (const target of targets) items.push(await read(query, { itemId: target.id }));
  const plans = items.map((item, index) => plan(item, targets[index]));
  if (option('--snapshot')) { assert(!apply); writePrivate(option('--snapshot'), items); }
  if (apply) {
    assert(option('--baseline') && option('--journal'), 'Apply requires a captured baseline and an external journal.');
    const baseline = JSON.parse(fs.readFileSync(option('--baseline'), 'utf8'));
    assert.deepEqual(items, baseline, 'Authoring configuration changed. Capture and review a fresh baseline.');
    const journal = [];
    for (const [index, change] of plans.entries()) {
      if (change.before === change.after) continue;
      const fresh = await read(query, { itemId: change.itemId });
      assert.deepEqual(fresh, items[index], 'Authoring configuration changed before update.');
      journal.push({ ...change, status: 'submitted' }); writePrivate(option('--journal'), journal);
      await query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}', { input: {
        database: 'master', itemId: change.itemId, language: 'en', version: fresh.version,
        fields: [{ name: change.field, value: change.after }],
      } });
      const after = await read(query, { itemId: change.itemId });
      assert.equal(value(after, change.field), change.after, 'Readback did not confirm the authoring update.');
      for (const field of fresh.fields) {
        if (field.name === change.field || /^__(Revision|Shared revision|Unversioned revision|Updated|Updated by)$/.test(field.name)) continue;
        assert.equal(value(after, field.name), field.value, 'An unrelated field changed during the update.');
      }
      journal.at(-1).status = 'verified'; writePrivate(option('--journal'), journal);
    }
  }
  console.log(JSON.stringify(plans, null, 2));
}
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { plan, targets };
