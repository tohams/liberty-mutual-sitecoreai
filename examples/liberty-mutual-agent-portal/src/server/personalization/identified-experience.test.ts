import assert from 'node:assert/strict';
import test from 'node:test';
import type { PersonalizeData, PersonalizeOpts } from '@sitecore-content-sdk/personalize';
import { createIdentifiedExperienceExecutor } from './identified-experience';

const principal = { provider: 'liberty-mutual-agent' as const, id: 'opaque-principal' };
const producer = { provider: 'liberty-mutual-agent' as const, id: 'opaque-producer' };
const request: PersonalizeData = {
  channel: 'WEB', currency: 'USD', friendlyId: 'native-component-experience', language: 'en',
  pageVariantIds: ['component_principal', 'component_producer'],
  params: { referrer: 'https://portal.example/login', utm: { campaign: 'agency-growth' } },
  geo: { region: 'TX' },
};

test('concurrent requests keep identifiers isolated and preserve native campaign arguments', async () => {
  let releasePrincipal!: (identity: typeof principal) => void;
  const pendingPrincipal = new Promise<typeof principal>((resolve) => { releasePrincipal = resolve; });
  let principalLookups = 0;
  const calls: { data: PersonalizeData; options?: PersonalizeOpts }[] = [];
  const execute = async (data: PersonalizeData, options?: PersonalizeOpts) => {
    calls.push({ data, options });
    return { variantId: data.identifier?.id === principal.id ? 'component_principal' : 'component_producer' };
  };
  const principalRequest = createIdentifiedExperienceExecutor(() => { principalLookups++; return pendingPrincipal; }, execute);
  const producerRequest = createIdentifiedExperienceExecutor(async () => producer, execute);
  const before = structuredClone(request);
  const first = principalRequest(request, { timeout: 450 });
  assert.deepEqual(await producerRequest(request, { timeout: 650 }), { variantId: 'component_producer' });
  assert.equal(calls.length, 1, 'An unresolved identity must not issue a browser-only decision');
  releasePrincipal(principal);
  assert.deepEqual(await first, { variantId: 'component_principal' });
  await principalRequest({ ...request, friendlyId: 'second-native-component' }, { timeout: 450 });
  assert.equal(principalLookups, 1, 'Multiple components in one request share only that request identity');
  assert.deepEqual(calls[0], { data: { ...request, identifier: producer }, options: { timeout: 650 } });
  assert.deepEqual(calls[1], { data: { ...request, identifier: principal }, options: { timeout: 450 } });
  assert.deepEqual(request, before, 'Native discovery arguments are not mutated');
});

test('editor, unverified, or failed identity resolution stays neutral without using browser history', async () => {
  let decisions = 0;
  const execute = async () => { decisions++; return { variantId: 'previous-agent-variant' }; };
  for (const resolve of [async () => null, async () => { throw new Error('Expired or restarted run'); }]) {
    const run = createIdentifiedExperienceExecutor(resolve, execute);
    assert.deepEqual(await run(request), { variantId: '' });
    assert.deepEqual(await run(request), { variantId: '' });
  }
  assert.equal(decisions, 0);
});

test('missing or failed native decision receipts do not become selected variants', async () => {
  for (const response of [null, {}, { status: 'failed' }, { variantId: null }]) {
    const run = createIdentifiedExperienceExecutor(async () => principal, async () => response);
    assert.deepEqual(await run(request), { variantId: '' });
  }
});
