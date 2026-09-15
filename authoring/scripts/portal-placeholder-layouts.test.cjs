'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { IDS, LAYOUTS, transformLayoutPair, planItemLayouts, resolvePolicy, assertRollbackSafe } = require('./portal-placeholder-layouts.cjs');
const HOME = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home';
const DEVICE = '{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}';
const OLD = '{96E5F4BA-A2CF-4A4C-A4E7-64DA88226362}';
const AG = '{193A0299-B5B6-5668-B792-9F3552463163}';
const SEARCH = '{15CF6EFA-C180-563A-B229-C08F2DAC3DAD}';
const ARTICLE = '{980AD02C-08E5-5F27-9F08-F28E829CA94D}';
const SPOTLIGHT = '{1962D596-4187-51C9-A91F-4D39A9318B51}';
const UID = '{11111111-1111-4111-8111-111111111111}';
const SEARCH_UID = '{22222222-2222-4222-8222-222222222222}';
const SOURCE = '{33333333-3333-4333-8333-333333333333}';
const shared = (id = AG, extra = '') => `<r><d id="${DEVICE}" l="${OLD}"><r uid="${UID}" id="${id}" ph="headless-main" ds="${SOURCE}" par="FieldNames=Default&amp;DynamicPlaceholderId=1" />${extra}</d></r>`;
const input = (sharedLayout = shared(), finalLayout = '') => ({ path: HOME + "/quote", templateId: IDS.portalTemplate, sharedLayout, finalLayout });

test('guidance move preserves source bytes, datasource, parameters and native behavior rules', () => {
  const rules = '<rls><ruleset s:pet="true"><rule uid="{44444444-4444-4444-8444-444444444444}" s:name="native_personalization"><conditions><condition s:VariantName="existing_variant" /></conditions><actions><action s:DataSource="existing_challenger" /></actions></rule></ruleset></rls>';
  const final = `<r xmlns:p="p" xmlns:s="s" p:p="1"><d id="${DEVICE}"><r uid="${UID}" s:ph="headless-main" s:par="FieldNames=Highlight&amp;DynamicPlaceholderId=1">${rules}</r></d></r>`;
  const result = transformLayoutPair(input(shared(), final));
  assert.equal(result.sharedLayout, shared().replace(OLD, '{' + LAYOUTS.PortalLayout.toUpperCase() + '}').replace('ph="headless-main"', 'ph="headless-agent-guidance"'));
  assert.equal(result.finalLayout, final.replace('s:ph="headless-main"', 's:ph="headless-agent-guidance"'));
  assert(result.finalLayout.includes(rules));
  assert.equal(result.changes.length, 3);
});

test('resources index separates Search and Guidance without changing A/B UID or final delta', () => {
  const extra = `<r uid="${SEARCH_UID}" id="${SEARCH}" ph="headless-main" ds="${SOURCE}" />`;
  const final = `<r xmlns:s="s"><d id="${DEVICE}"><r uid="${UID}" s:par="FieldNames=Highlight"><rls><ruleset s:pet="true"><rule s:name="test_arm" /></ruleset></rls></r></d></r>`;
  const result = transformLayoutPair({ ...input(shared(AG, extra), final), path: HOME + '/resources' });
  assert(result.sharedLayout.includes('ph="headless-resource-search"'));
  assert(result.sharedLayout.includes('ph="headless-agent-guidance"'));
  assert.equal(result.finalLayout, final);
});

test('Products final-only spotlight retains its UID, datasource and affinity rules', () => {
  const final = `<r xmlns:s="s"><d id="${DEVICE}" s:l="{${LAYOUTS.ProductsLayout.toUpperCase()}}"><r uid="${SEARCH_UID}" s:id="${SPOTLIGHT}" s:ph="headless-products-spotlight" s:ds="${SOURCE}"><rls><ruleset s:pet="true"><rule s:name="affinity_variant" /></ruleset></rls></r></d></r>`;
  const result = transformLayoutPair({ ...input(shared(), final), path: HOME + '/products' });
  assert.equal(result.finalLayout, final);
  assert(result.sharedLayout.includes('headless-agent-guidance'));
});

test('resource article is limited to a resource page and receives only its intended slot', () => {
  const result = transformLayoutPair({ ...input(shared(ARTICLE)), path: HOME + '/resources/texas-workers-compensation', templateId: IDS.resourceTemplate });
  assert(result.sharedLayout.includes('headless-resource-article'));
  assert.equal(result.policy.name, 'ResourceArticleLayout');
  assert.throws(() => transformLayoutPair(input(shared(ARTICLE))), /not allowed on this page role/);
});

test('Home and three owned standard-values types preserve existing template identities', () => {
  assert.equal(resolvePolicy({ path: HOME, templateId: IDS.pageTemplate }).name, 'PortalLayout');
  for (const [name, templateId, layout] of [['Page', IDS.pageTemplate, 'PortalLayout'], ['PortalPage', IDS.portalTemplate, 'PortalLayout'], ['ResourcePage', IDS.resourceTemplate, 'ResourceArticleLayout']]) {
    const result = transformLayoutPair({ path: '/sitecore/templates/Project/LibertyMutual/' + name + '/__Standard Values', templateId, sharedLayout: `<r><d id="${DEVICE}" l="${OLD}" /></r>` });
    assert.equal(result.policy.name, layout);
  }
  assert.throws(() => resolvePolicy({ path: HOME, templateId: IDS.portalTemplate }), /Unexpected Home template/);
});

test('migration is idempotent with lexical whitespace and single quotes preserved', () => {
  const before = shared().replaceAll('"', "'").replace("ph='", "ph = '");
  const first = transformLayoutPair(input(before));
  const second = transformLayoutPair(input(first.sharedLayout, first.finalLayout));
  assert.equal(second.changed, false);
  assert.equal(second.sharedLayout, first.sharedLayout);
  assert(second.sharedLayout.includes("ph = 'headless-agent-guidance'"));
});

test('rejects DTD, malformed XML and non-default or duplicate devices', () => {
  assert.throws(() => transformLayoutPair(input('<!DOCTYPE r [<!ENTITY x "y">]>' + shared())), /DTD/);
  assert.throws(() => transformLayoutPair(input('<r><d>')), /could not be parsed/);
  assert.throws(() => transformLayoutPair(input(shared().replace(DEVICE, SOURCE))), /Unexpected device/);
  assert.throws(() => transformLayoutPair(input(shared().replace('</r>', `<d id="${DEVICE}" l="${OLD}" /></r>`))), /exactly one default device/);
});

test('rejects unrecognized components, placeholders, inherited final UIDs and component swaps', () => {
  assert.throws(() => transformLayoutPair(input(shared(SOURCE))), /Unknown rendering/);
  assert.throws(() => transformLayoutPair(input(shared().replace('ph="headless-main"', 'ph="headless-footer"'))), /Unexpected placeholder/);
  assert.throws(() => transformLayoutPair(input(shared(), `<r xmlns:s="s"><d id="${DEVICE}"><r uid="${SEARCH_UID}" s:par="x" /></d></r>`)), /Unknown rendering/);
  assert.throws(() => transformLayoutPair({ ...input(shared(), `<r xmlns:s="s"><d id="${DEVICE}"><r uid="${UID}" s:id="${SEARCH}" s:ph="headless-main" /></d></r>`), path: HOME + '/resources' }), /changes a rendering component/);
});

test('all-version plan writes shared layout once and preserves version-specific final values', () => {
  const final = `<r xmlns:s="s"><d id="${DEVICE}"><r uid="${UID}" s:ph="headless-main" s:ds="${SOURCE}" /></d></r>`;
  const version = (n, value) => ({ version: n, language: 'en', fields: [{ fieldId: IDS.sharedField, name: '__Renderings', value: shared() }, { fieldId: IDS.finalField, name: '__Final Renderings', value }] });
  const item = { itemId: SOURCE, path: HOME + "/quote", template: { templateId: IDS.portalTemplate }, versions: [version(2, final), version(1, '')] };
  const before = JSON.stringify(item);
  const plan = planItemLayouts(item);
  assert(plan.sharedChange);
  assert.equal(plan.finalChanges.length, 1);
  assert.equal(plan.finalChanges[0].version, 2);
  assert.equal(JSON.stringify(item), before);
  const inconsistent = structuredClone(item); inconsistent.versions[1].fields[0].value = shared().replace(SOURCE, SEARCH_UID);
  assert.throws(() => planItemLayouts(inconsistent), /Shared layout differs across versions/);
});

test('rollback is idempotent and rejects intervening author changes', () => {
  const before = shared(), after = transformLayoutPair(input(before)).sharedLayout;
  assert.equal(assertRollbackSafe(after, after, before), before);
  assert.equal(assertRollbackSafe(before, after, before), before);
  assert.throws(() => assertRollbackSafe(after.replace(SOURCE, SEARCH_UID), after, before), /Rollback conflict/);
});
