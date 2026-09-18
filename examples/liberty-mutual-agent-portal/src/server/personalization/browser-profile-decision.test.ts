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
const profileRef = (browser: string) => `native-profile-${browser}`;
const withProfile = (decision: typeof fetch): typeof fetch => async (input, init) => init?.method === 'GET'
  ? Response.json({ ref: principalBrowser, customer: { ref: profileRef(principalBrowser) } })
  : decision(input, init);
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
  const profileCalls: { url: URL; init: RequestInit }[] = [];
  const transport: typeof fetch = async (input, init) => {
    if (init?.method === 'GET') {
      const url = new URL(String(input));
      const browser = url.pathname.split('/').at(-2)!;
      profileCalls.push({ url, init });
      return Response.json({ ref: browser, customer: { ref: profileRef(browser) } });
    }
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
      params: { ...campaign.params, geo: { region: 'TX' } }, pointOfSale: '', variants: campaign.pageVariantIds, browserId, guestRef: profileRef(browserId),
    });
    assert.ok(!JSON.stringify(call.body).includes('opaque-'));
    assert.equal(profileCalls[index].url.pathname, `/v1/events/v1.2/browser/${browserId}/show.json`);
    assert.equal(new Headers(profileCalls[index].init.headers).get('x-sitecore-contextid'), publicContext);
    assert.equal(profileCalls[index].init.cache, 'no-store');
    assert.ok(!('identifiers' in call.body) && !('email' in call.body));
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
  for (const resolve of [async () => null, async () => { throw new Error('Workspace unavailable'); }]) {
    const execute = createBrowserProfileDecisionExecutor(context, resolve, transport);
    assert.deepEqual(await execute(campaign), { variantId: '' });
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  assert.deepEqual(await createBrowserProfileDecisionExecutor({ ...context, contextId: '' }, async () => principal, transport)(campaign), { variantId: '' });
  assert.equal(decisions, 0);
});

test('only native variants discovered for this execution can be selected', async () => {
  for (const receipt of [null, [], {}, { variantId: null }, { variantId: 'foreign-component_principal' }, { variantId: 'https://untrusted.example' }]) {
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, withProfile(async () => Response.json(receipt)));
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  const execute = createBrowserProfileDecisionExecutor(context, async () => principal, withProfile(async () => Response.json({ variantId: 'component_default' })));
  assert.deepEqual(await execute(campaign), { variantId: 'component_default' });
});

test('HTTP failures, invalid JSON, transport errors and deadlines remain neutral; deadline aborts the request', async () => {
  for (const status of [401, 403, 429, 500]) {
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, withProfile(async () => Response.json({ variantId: 'component_principal' }, { status })));
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  for (const transport of [
    async () => new Response('Invalid native receipt', { status: 200 }),
    async () => { throw new Error('Transport failure with a confidential request'); },
  ]) {
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, withProfile(transport));
    assert.deepEqual(await execute(campaign), { variantId: '' });
  }
  let signal: AbortSignal | undefined;
  const neverRespond: typeof fetch = async (_, init) => {
    signal = init?.signal || undefined;
    return new Promise<Response>(() => {});
  };
  const execute = createBrowserProfileDecisionExecutor(context, async () => principal, withProfile(neverRespond));
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
  assert.match(result.stdout, /pass 4/);
  assert.ok(!result.stdout.includes('CONFIDENTIAL-GRAPHQL-FAILURE'));
  assert.ok(!result.stderr.includes('CONFIDENTIAL-GRAPHQL-FAILURE'));
  assert.ok(!result.stdout.includes('Personalize proxy failed'));
});

test('components share one authoritative lookup inside a request, and a new request re-reads a changed link', async () => {
  const lookup = deferred<Response>();
  const lookupStarted = deferred<void>();
  const guestRefs: unknown[] = [];
  let reads = 0;
  let identities = 0;
  const transport: typeof fetch = async (_, init) => {
    if (init?.method === 'GET') {
      reads++;
      lookupStarted.resolve();
      return reads === 1 ? lookup.promise : Response.json({ ref: principalBrowser, customer: { ref: 'new-linked-profile' } });
    }
    guestRefs.push(JSON.parse(String(init?.body)).guestRef);
    return Response.json({ variantId: 'component_default' });
  };
  const identity = async () => { identities++; return principal; };
  const execute = createBrowserProfileDecisionExecutor(context, identity, transport);
  const first = execute(campaign);
  await lookupStarted.promise;
  const second = execute({ ...campaign, friendlyId: 'second-component-experience' });
  lookup.resolve(Response.json({ ref: principalBrowser, customer: { ref: 'first-linked-profile' } }));
  assert.deepEqual(await Promise.all([first, second]), [{ variantId: 'component_default' }, { variantId: 'component_default' }]);
  assert.equal(reads, 1);
  assert.equal(identities, 1);
  await createBrowserProfileDecisionExecutor(context, identity, transport)(campaign);
  assert.equal(reads, 2, 'No profile cache survives the request');
  assert.equal(identities, 2);
  assert.deepEqual(guestRefs, ['first-linked-profile', 'first-linked-profile', 'new-linked-profile']);
});

test('missing, mismatched and malformed browser links never execute or create profiles', async () => {
  for (const response of [
    Response.json({ ref: producerBrowser, customer: { ref: 'another-profile' } }),
    Response.json({ customer: { ref: 'unbound-profile' } }),
    ...[null, '', ' padded ', 'x'.repeat(201)].map((ref) => Response.json({ ref: principalBrowser, customer: { ref } })),
    new Response('invalid JSON'),
    new Response(null, { status: 503 }),
  ]) {
    let reads = 0;
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, async (_, init) => {
      assert.equal(init?.method, 'GET', 'A failed lookup must not cause a decision or native profile creation');
      reads++;
      return response;
    });
    assert.deepEqual(await execute(campaign), { variantId: '' });
    assert.equal(reads, 1);
  }
});

test('the overall deadline includes signed identity resolution and prevents late profile lookup', async () => {
  const identity = deferred<typeof principal>();
  let calls = 0;
  const execute = createBrowserProfileDecisionExecutor(context, () => identity.promise, async () => {
    calls++;
    throw new Error('Must not run after identity deadline');
  });
  assert.deepEqual(await execute(campaign, { timeout: 15 }), { variantId: '' });
  identity.resolve(principal);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(calls, 0);
});

test('late browser lookup or response JSON cannot start a decision after the overall deadline', async () => {
  for (const delayJson of [false, true]) {
    const response = deferred<Response>();
    const body = deferred<unknown>();
    let signal: AbortSignal | undefined;
    let calls = 0;
    const execute = createBrowserProfileDecisionExecutor(context, async () => principal, async (_, init) => {
      calls++;
      assert.equal(init?.method, 'GET');
      signal = init?.signal || undefined;
      if (!delayJson) return response.promise;
      const result = Response.json(null);
      result.json = () => body.promise;
      return result;
    });
    assert.deepEqual(await execute(campaign, { timeout: 15 }), { variantId: '' });
    assert.equal(signal?.aborted, true);
    const linked = { ref: principalBrowser, customer: { ref: 'late-native-profile' } };
    response.resolve(Response.json(linked));
    body.resolve(linked);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(calls, 1, 'An abort-ignoring lookup must not issue a late POST');
  }
});
