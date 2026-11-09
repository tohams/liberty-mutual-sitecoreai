'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { verifyComposition } = require('./verify-edge-content.cjs');
const manifest = require('../items/liberty-mutual/content-manifest.json');

function resourceLayout(configuration) {
  return { itemId: 'resource-search', placeholders: {
    'headless-resource-search': [{ componentName: 'ResourceSearch', fields: {
      search: { value: JSON.stringify(configuration) },
    } }],
    'headless-agent-guidance': [{ componentName: 'AgentGuidance', fields: {
      headline: { value: 'Learning and resources' }, body: { value: '<p>Guidance</p>' },
    } }],
  } };
}

test('verifies the native Search source, technical result fields, and mapped facets against the current manifest', () => {
  const configuration = structuredClone(manifest.resourceSearch.configuration);
  assert.equal(verifyComposition('/resources', resourceLayout(configuration), manifest).length, 2);
  for (const mutate of [
    (config) => { config.searchIndex = 'retired-source'; },
    (config) => { config.fieldsMapping.title = 'Title'; },
    (config) => { config.facetMapping.Product = 'Product'; },
  ]) {
    const invalid = structuredClone(configuration);
    mutate(invalid);
    assert.throws(() => verifyComposition('/resources', resourceLayout(invalid), manifest), /Missing native search configuration/);
  }
});
