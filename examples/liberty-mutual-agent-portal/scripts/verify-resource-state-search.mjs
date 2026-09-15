/** Read-only acceptance against the published native Search index. */
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { SearchService } from '@sitecore-content-sdk/search';
import { buildResourceSearchFacet } from '../src/components/resource-search/resource-search-facets.ts';

const { values } = parseArgs({ options: {
  'public-context': { type: 'string' }, index: { type: 'string' },
} });
assert.ok(values['public-context'] && values.index,
  'Use node --import tsx scripts/verify-resource-state-search.mjs --public-context PUBLIC_CONTEXT --index NATIVE_INDEX');
const service = new SearchService({ contextId: values['public-context'] });

async function search(scope, licenses, selection = {}, keyphrase = '') {
  const results = [];
  let total;
  for (let offset = 0; offset < (total ?? 1); offset += 6) {
    assert.ok(offset < 600, 'Acceptance catalog exceeded its bounded page limit');
    const page = await service.search({
      searchIndexId: values.index, keyphrase, locale: 'en', limit: 6, offset,
      facet: buildResourceSearchFacet(scope, licenses, selection),
    });
    total ??= page.total;
    assert.equal(page.total, total, 'Native total changed during pagination');
    assert.equal(page.results.length, Math.min(6, total - offset));
    results.push(...page.results);
  }
  assert.equal(results.length, total);
  assert.equal(new Set(results.map((item) => item.sc_item_id)).size, total, 'Duplicate result across native pages');
  return results;
}
const states = (items) => new Set(items.map((item) => item.state));
const ids = (items) => items.map((item) => item.sc_item_id).sort();
const allLicenses = ['TX', 'FL', 'IL'];
const all = await search('licensed', allLicenses);
assert.deepEqual(states(all), new Set(['TX', 'FL', 'IL', 'All']));
const daniel = await search('licensed', ['IL', 'TX']);
assert.deepEqual(states(daniel), new Set(['IL', 'TX', 'All']));
assert.deepEqual(ids(daniel), ids(all.filter((item) => item.state !== 'FL')));
const maya = await search('licensed', ['TX', 'FL', 'IL']);
assert.deepEqual(ids(maya), ids(all));
assert.deepEqual(ids(await search('all', ['IL', 'TX'])), ids(daniel), 'Legacy All states cannot broaden licenses');
assert.deepEqual(ids(await search('FL', ['IL', 'TX'])), ids(daniel), 'A forged Florida filter cannot broaden licenses');
const florida = await search('FL', ['FL']);
assert.deepEqual(states(florida), new Set(['FL', 'All']));
const nationwide = await search('All', ['IL', 'TX']);
assert.deepEqual(states(nationwide), new Set(['All']));
assert.deepEqual(ids(await search('licensed', [])), ids(nationwide));
const guidance = await search('licensed', ['IL', 'TX'], { 'Resource type': 'State guidance' });
assert.deepEqual(states(guidance), new Set(['IL', 'TX']));

// Compare each native filter with an independently retrieved, unfiltered catalog.
// Keep the field names distinct from the configured facet display names used by the SDK.
const metadataFacets = [
  ['Product', 'product'],
  ['Business family', 'businessFamily'],
  ['Distribution channel', 'channel'],
  ['Resource type', 'resourceType'],
];
const metadataChecks = {};
for (const [facetName, fieldName] of metadataFacets) {
  assert.ok(all.every((item) => typeof item[fieldName] === 'string' && item[fieldName].trim()),
    `Every indexed resource must retain its scalar ${fieldName} value`);
  const terms = [...new Set(all.map((item) => item[fieldName]))].sort();
  assert.ok(terms.length > 1, `${facetName} needs distinct values to verify exclusion`);
  for (const term of terms) {
    const selection = { [facetName]: term };
    assert.deepEqual(ids(await search('licensed', allLicenses, selection)),
      ids(all.filter((item) => item[fieldName] === term)),
      `${facetName} must return exactly the resources matching ${term}`);
    assert.deepEqual(ids(await search('licensed', ['IL', 'TX'], selection)),
      ids(daniel.filter((item) => item[fieldName] === term)),
      `${facetName} must intersect the licensed-state filter for ${term}`);
  }
  const absentTerm = '__unmatched_resource_metadata__';
  assert.ok(!terms.includes(absentTerm));
  assert.equal((await search('licensed', allLicenses, { [facetName]: absentTerm })).length, 0,
    `${facetName} must exclude all resources for an unknown value`);
  metadataChecks[facetName] = { valuesVerified: terms.length, exactAndLicensedFilters: terms.length * 2 };
}

// A combination must AND the separate facets together, while risk-state values stay ORed.
const combinations = [...new Set(all.map((item) =>
  JSON.stringify(metadataFacets.map(([, fieldName]) => item[fieldName]))))];
for (const combination of combinations) {
  const terms = JSON.parse(combination);
  const selection = Object.fromEntries(metadataFacets.map(([facetName], index) => [facetName, terms[index]]));
  const matches = (item) => metadataFacets.every(([, fieldName], index) => item[fieldName] === terms[index]);
  assert.deepEqual(ids(await search('licensed', allLicenses, selection)), ids(all.filter(matches)),
    'Combined metadata facets must intersect all selected values');
  assert.deepEqual(ids(await search('licensed', ['IL', 'TX'], selection)), ids(daniel.filter(matches)),
    'Combined metadata facets must preserve licensed-state eligibility');
}
const workers = await search('licensed', ['IL', 'TX'], {}, 'Workers compensation');
assert.ok(workers.length > 0);
assert.ok(workers.every((item) => item.state !== 'FL'));
assert.ok(workers.some((item) => item.state === 'All'));
assert.equal((await search('licensed', ['IL', 'TX'], {}, 'noresultsxqz9472')).length, 0);
console.log(JSON.stringify({ status: 'passed', nativeTotals: {
  all: all.length, daniel: daniel.length, maya: maya.length, floridaAndNationwide: florida.length,
  nationwide: nationwide.length, danielStateGuidance: guidance.length, danielWorkersQuery: workers.length,
}, metadataFacets: metadataChecks, metadataCombinationsVerified: combinations.length,
checks: 'Licensed state OR filters, nationwide inclusion, forged-filter restrictions, every product/business-family/channel/resource-type value, exact facet intersections, unknown facet values, query, native six-item pagination, empty results' }, null, 2));
