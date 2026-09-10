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
const all = await search('all', ['IL', 'TX']);
assert.deepEqual(states(all), new Set(['TX', 'FL', 'IL', 'All']));
const daniel = await search('licensed', ['IL', 'TX']);
assert.deepEqual(states(daniel), new Set(['IL', 'TX', 'All']));
assert.deepEqual(ids(daniel), ids(all.filter((item) => item.state !== 'FL')));
const maya = await search('licensed', ['TX', 'FL', 'IL']);
assert.deepEqual(ids(maya), ids(all));
const florida = await search('FL', ['IL', 'TX']);
assert.deepEqual(states(florida), new Set(['FL', 'All']));
const nationwide = await search('All', ['IL', 'TX']);
assert.deepEqual(states(nationwide), new Set(['All']));
assert.deepEqual(ids(await search('licensed', [])), ids(nationwide));
const guidance = await search('licensed', ['IL', 'TX'], { 'Resource type': 'State guidance' });
assert.deepEqual(states(guidance), new Set(['IL', 'TX']));
const workers = await search('licensed', ['IL', 'TX'], {}, 'Workers compensation');
assert.ok(workers.length > 0);
assert.ok(workers.every((item) => item.state !== 'FL'));
assert.ok(workers.some((item) => item.state === 'All'));
assert.equal((await search('licensed', ['IL', 'TX'], {}, 'noresultsxqz9472')).length, 0);
console.log(JSON.stringify({ status: 'passed', nativeTotals: {
  all: all.length, daniel: daniel.length, maya: maya.length, floridaAndNationwide: florida.length,
  nationwide: nationwide.length, danielStateGuidance: guidance.length, danielWorkersQuery: workers.length,
}, checks: 'State OR filters, nationwide inclusion, explicit browsing, other facets, query, native six-item pagination, empty results' }, null, 2));
