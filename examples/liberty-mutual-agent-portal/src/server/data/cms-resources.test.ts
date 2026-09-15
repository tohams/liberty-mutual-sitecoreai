import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCmsResource, readCmsResourceCatalog } from './cms-resources';
import { PortalError } from '../errors';

const field = (value: unknown) => ({ jsonValue: { value } });
const authored = {
  id: 'E9573E8D-00D6-5FD9-9015-2F0AEC4A0B60', name: 'prepare-a-contractor-referral',
  title: field('Prepare a clear contractor referral'), summary: field('Gather the details that help the next conversation.'),
  body: field('<h2>Start with the work</h2><p>Describe operations and the risk location.</p>'),
  resourceType: field('Referral checklist'), state: field('TX'), reviewedAt: field('20260910T000000Z'),
  sourceLink: field({ href: 'https://www.libertymutual.com/' }), businessFamily: field('small-commercial'),
  product: field('contractors'), channel: field('independent-agent'),
};

test('native resource metadata stays authoritative and renaming preserves favorite identity', () => {
  const initial = mapCmsResource(authored);
  const edited = mapCmsResource({ ...authored, name: 'contractor-referral', title: field('A better contractor conversation'), summary: field('Published editorial update.') });
  assert.equal(initial.id, 'e9573e8d00d65fd990152f0aec4a0b60');
  assert.equal(edited.id, initial.id);
  assert.equal(edited.href, '/resources/contractor-referral');
  assert.equal(edited.title, 'A better contractor conversation');
  assert.equal(edited.description, 'Published editorial update.');
  assert.equal(initial.type, 'Referral checklist');
  assert.deepEqual(initial.states, ['TX']);
  assert.equal(initial.updatedAt, '2026-09-10');
  assert.equal(initial.body, 'Start with the work Describe operations and the risk location.');
  assert.equal(initial.sourceUrl, 'https://www.libertymutual.com/');
});

test('incomplete native content fails clearly instead of substituting an engineering fixture', () => {
  for (const patch of [
    { title: field('') }, { state: field('') }, { state: field('TX CA') }, { state: field('All FL') }, { businessFamily: field('unknown') },
    { id: 'invalid-identity' }, { name: '../private' },
  ]) {
    assert.throws(() => mapCmsResource({ ...authored, ...patch }),
      (error: unknown) => error instanceof PortalError && error.code === 'CONTENT_UNAVAILABLE');
  }
  const allStates = mapCmsResource({ ...authored, state: field('All'), sourceLink: field({ href: 'javascript:alert(1)' }) });
  assert.deepEqual(allStates.states, ['TX', 'FL', 'IL']);
  assert.equal(allStates.sourceUrl, undefined);
});


test('one invalid published resource is omitted while valid pages and pagination remain available', async () => {
  const invalid = { ...authored, id: '0A946D4D-2385-4D84-A2E7-31FB2DB9DDF2', summary: field('') };
  const diagnostics: string[] = [];
  const cursors: Array<string | undefined> = [];
  const catalog = await readCmsResourceCatalog(async (after) => {
    cursors.push(after);
    return after
      ? { item: { children: { results: [authored], pageInfo: { hasNext: false } } } }
      : { item: { children: { results: [invalid], pageInfo: { hasNext: true, endCursor: 'page-two' } } } };
  }, (id) => diagnostics.push(id));
  assert.deepEqual(cursors, [undefined, 'page-two']);
  assert.deepEqual(catalog.map((resource) => resource.id), [mapCmsResource(authored).id]);
  assert.deepEqual(diagnostics, ['0a946d4d23854d84a2e731fb2db9ddf2']);
  assert.equal(JSON.stringify(diagnostics).includes(String(authored.title.jsonValue.value)), false);
});

test('an invalid-only catalog stays empty and diagnostics never reflect raw invalid identifiers', async () => {
  const diagnostics: string[] = [];
  const catalog = await readCmsResourceCatalog(async () => ({ item: { children: {
    results: [{ ...authored, id: 'raw-untrusted-value', state: field('') }], pageInfo: { hasNext: false },
  } } }), (id) => diagnostics.push(id));
  assert.deepEqual(catalog, []);
  assert.deepEqual(diagnostics, ['invalid-item-id']);
});

test('catalog degradation never hides provider, root, schema, or pagination failures', async () => {
  const providerError = new Error('Provider unavailable');
  await assert.rejects(readCmsResourceCatalog(async () => { throw providerError; }), (error) => error === providerError);
  await assert.rejects(readCmsResourceCatalog(async () => ({ item: null })),
    (error) => error instanceof PortalError && error.code === 'CONTENT_UNAVAILABLE');
  await assert.rejects(readCmsResourceCatalog(async () => ({ item: { children: {
    results: [{ ...authored, id: undefined } as unknown as typeof authored], pageInfo: { hasNext: false },
  } } })), TypeError);
  await assert.rejects(readCmsResourceCatalog(async () => ({ item: { children: {
    results: [], pageInfo: { hasNext: true },
  } } })), (error) => error instanceof PortalError && error.code === 'CONTENT_UNAVAILABLE');
});
