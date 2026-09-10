import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { createBrowserProfileDecisionExecutor, type BrowserDecisionContext, type BrowserDecisionData } from './browser-profile-decision';

const principal = { provider: 'liberty-mutual-agent' as const, id: 'opaque-principal' };
const producer = { provider: 'liberty-mutual-agent' as const, id: 'opaque-producer' };
const principalBrowser = 'a1111111-1111-4111-8111-111111111111';
const producerBrowser = 'b2222222-2222-4222-8222-222222222222';
const context: BrowserDecisionContext = {
  browserId: principalBrowser, siteName: 'portal-a', contextId: 'public-scoped-context',
  edgeUrl: 'https://edge.example', userAgent: 'Agent-browser-A',
};
const campaign: BrowserDecisionData = {
  channel: 'WEB', currency: 'USD', friendlyId: 'native-component-experience', language: 'en',
  pageVariantIds: ['component_principal', 'component_producer', 'component_default'],
  params: { referrer: 'https://portal.example/login', utm: { campaign: 'agency-growth' } },
  geo: { region: 'TX' },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('concurrent browser decisions preserve their own cookie, site, headers and native campaign arguments', async () => {
  const firstResponse = deferred<Response>();
  const firstStarted = deferred<void>();
  const calls: { url: URL; init: RequestInit; body: Record<string, unknown> }[] = [];
  const transport: typeof fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ url: new URL(String(input)), init: init!, body });
    if (body.browserId === principalBrowser) {
      firstStarted.resolve();
      return firstResponse.promise;
    }
    return Response.json({ variantId: 'component_producer' });
  };
  let principalLookups = 0;
  const mutableContext = { ...context };
  const first = createBrowserProfileDecisionExecutor(mutableContext, async () => { principalLookups++; return principal; }, transport);
  const second = createBrowserProfileDecisionExecutor({
    ...context, browserId: producerBrowser, siteName: 'portal-b', contextId: 'public-scoped-b', userAgent: 'Agent-browser-B',
  }, async () => producer, transport);
  mutableContext.browserId = producerBrowser;
  const before = structuredClone(campaign);
  const pending = first(campaign, { timeout: 800 });
  await firstStarted.promise;
  assert.deepEqual(await second(campaign, { timeout: 900 }), { variantId: 'component_producer' });
  firstResponse.resolve(Response.json({ variantId: 'component_principal' }));
  assert.deepEqual(await pending, { variantId: 'component_principal' });
  for (const [index, browserId, siteName, publicContext, userAgent] of [
    [0, principalBrowser, 'portal-a', 'public-scoped-context', 'Agent-browser-A'],
    [1, producerBrowser, 'portal-b', 'public-scoped-b', 'Agent-browser-B'],
  ] as const) {
    const call = calls[index];
    assert.equal(call.url.pathname, '/v1/personalize');
    assert.equal(call.url.searchParams.get('siteId'), siteName);
    assert.equal(call.url.searchParams.size, 1, 'Context credentials do not appear in the URL');
    assert.equal(new Headers(call.init.headers).get('x-sitecore-contextid'), publicContext);
    assert.equal(new Headers(call.init.headers).get('User-Agent'), userAgent);
    assert.equal(call.init.cache, 'no-store');
    assert.equal(call.init.redirect, 'error');
    assert.deepEqual(call.body, {
      channel: 'WEB', clientKey: '', currencyCode: 'USD', friendlyId: campaign.friendlyId, language: 'en',
      params: { ...campaign.params, geo: { region: 'TX' } }, pointOfSale: '', variants: campaign.pageVariantIds, browserId,
    });
    assert.ok(!JSON.stringify(call.body).includes('opaque-'));
    assert.ok(!('identifiers' in call.body) && !('guestRef' in call.body) && !('email' in call.body));
  }
  assert.equal(principalLookups, 1);
  assert.deepEqual(campaign, before);
});

test('missing or malformed cookie, missing identity, failed identity and unavailable context never execute a decision', async () => {
  let decisions = 0;
  let lookups = 0;
  const transport: typeof fetch = async () => { decisions++; return Response.json({ variantId: 'component_principal' }); };
  for (const browserId of [undefined, '', 'someone-elses-profile', principalBrowser + ';other=value']) {
    const execute = createBrowserProfileDecisionExecutor({ ...context, browserId }, async () => { lookups++; return principal; }, transport);
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  assert.equal(lookups, 0, 'An absent browser should not initialize or look up any identity');
  for (const resolve of [async () => null, async () => { throw new Error('Workspace expired'); }]) {
    const execute = createBrowserProfileDecisionExecutor(context, resolve, transport);
    assert.deepEqual(await execute(campaign), { variantId: '' });
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  assert.deepEqual(await createBrowserProfileDecisionExecutor({ ...context, contextId: '' }, async () => principal, transport)(campaign), { variantId: '' });
  assert.equal(decisions, 0);
});

test('only native variants discovered for this execution can be selected', async () => {
  for (const receipt of [null, [], {}, { variantId: null }, { variantId: 'foreign-component_principal' }, { variantId: 'https://untrusted.example' }]) {
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, async () => Response.json(receipt));
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  const execute = createBrowserProfileDecisionExecutor(context, async () => principal, async () => Response.json({ variantId: 'component_default' }));
  assert.deepEqual(await execute(campaign), { variantId: 'component_default' });
});

test('HTTP failures, invalid JSON, transport errors and deadlines remain neutral; deadline aborts the request', async () => {
  for (const status of [401, 403, 429, 500]) {
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, async () => Response.json({ variantId: 'component_principal' }, { status }));
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  for (const transport of [
    async () => new Response('Invalid native receipt', { status: 200 }),
    async () => { throw new Error('Transport failure with a confidential request'); },
  ]) {
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, transport);
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  let signal: AbortSignal | undefined;
  const neverRespond: typeof fetch = async (_, init) => {
    signal = init?.signal || undefined;
    return new Promise<Response>(() => {});
  };
  const execute = createBrowserProfileDecisionExecutor(context, async () => principal, neverRespond);
  assert.deepEqual(await execute(campaign, { timeout: 15 }), { variantId: '' });
  assert.equal(signal?.aborted, true);
});

test('SDK proxy integration runs in the normal Next proxy module environment', async () => {
  // The backend suite uses react-server exports; SDK proxy imports also load React client helpers.
  // A separate process matches the actual proxy runtime while retaining the server-only marker in source.
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const result = await promisify(execFile)(process.execPath, [
    '--import', 'tsx', '--experimental-test-module-mocks', '--test', '--test-reporter=tap',
    path.join(process.cwd(), 'src/server/personalization/proxy-runtime.fixture.ts'),
  ], { env: environment, timeout: 15000 });
  assert.match(result.stdout, /pass 3/);
  assert.ok(!result.stdout.includes('CONFIDENTIAL-GRAPHQL-FAILURE'));
  assert.ok(!result.stderr.includes('CONFIDENTIAL-GRAPHQL-FAILURE'));
  assert.ok(!result.stdout.includes('Personalize proxy failed'));
});
