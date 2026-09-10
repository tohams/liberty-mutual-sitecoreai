import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCmsResource } from './cms-resources';
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
    { title: field('') }, { state: field('') }, { businessFamily: field('unknown') },
    { id: 'invalid-identity' }, { name: '../private' },
  ]) {
    assert.throws(() => mapCmsResource({ ...authored, ...patch }),
      (error: unknown) => error instanceof PortalError && error.code === 'CONTENT_UNAVAILABLE');
  }
  const allStates = mapCmsResource({ ...authored, state: field('All'), sourceLink: field({ href: 'javascript:alert(1)' }) });
  assert.deepEqual(allStates.states, ['TX', 'FL', 'IL']);
  assert.equal(allStates.sourceUrl, undefined);
});
