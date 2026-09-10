import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import type { PersonalizeProxyConfig, ProxiesContext } from '@sitecore-content-sdk/nextjs/proxy';
import { GraphQLRequestClient } from '@sitecore-content-sdk/core';
import { PortalPersonalizeService } from './PortalPersonalizeService';

// This marker is enforced by Next's compiler. The actual SDK and proxy remain unmocked.
mock.module('server-only', { namedExports: {} });
const principal = { provider: 'liberty-mutual-agent' as const, id: 'opaque-principal' };
const producer = { provider: 'liberty-mutual-agent' as const, id: 'opaque-producer' };
const principalBrowser = 'a1111111-1111-4111-8111-111111111111';
const producerBrowser = 'b2222222-2222-4222-8222-222222222222';
const context = { contextId: 'public-scoped-context', edgeUrl: 'https://edge.example' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('request-local proxy instances retain native discovery, variant validation and rewrites without global initialization', async () => {
  const { PortalPersonalizeProxy } = await import('./PortalPersonalizeProxy');
  const calls: Record<string, unknown>[] = [];
  const firstResponse = deferred<Response>();
  const firstStarted = deferred<void>();
  const transport: typeof fetch = async (_, init) => {
    assert.equal(new Headers(init?.headers).get('x-sitecore-contextid'), 'public-scoped-context');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push(body);
    if (body.browserId === principalBrowser) {
      firstStarted.resolve();
      return firstResponse.promise;
    }
    return Response.json({ variantId: 'component_producer' });
  };
  let discoveries = 0;
  const config: PersonalizeProxyConfig = {
    sites: [{ name: 'portal-a', hostName: 'portal.example', language: 'en' }],
    contextId: 'private-discovery-context', clientContextId: context.contextId, edgeUrl: context.edgeUrl,
    enabled: true, cdpTimeout: 800, edgeTimeout: 800, scope: '', channel: 'WEB', currency: 'USD',
    personalizeService: { getPersonalizeInfo: async () => {
      discoveries++;
      return { pageId: 'native-page', variantIds: ['component_principal', 'component_producer'] };
    } } as unknown as PersonalizeProxyConfig['personalizeService'],
  };
  const sharedDiscovery = new PortalPersonalizeProxy(config, async () => null, transport);
  const request = (browserId: string) => new NextRequest('https://portal.example/workspace', {
    headers: { host: 'portal.example', cookie: `sc_cid=${browserId}`, 'user-agent': 'Agent-browser' },
  });
  const firstContext: ProxiesContext = new Map();
  const secondContext: ProxiesContext = new Map();
  const first = sharedDiscovery.forRequest(async () => principal).handle(request(principalBrowser), NextResponse.next(), firstContext);
  await firstStarted.promise;
  const second = await sharedDiscovery.forRequest(async () => producer).handle(request(producerBrowser), NextResponse.next(), secondContext);
  firstResponse.resolve(Response.json({ variantId: 'component_principal' }));
  const firstResult = await first;
  assert.equal(discoveries, 2);
  assert.equal(calls.length, 2, 'Only one native decision per request; no browser creation or profile lookup');
  assert.deepEqual(calls.map((call) => call.browserId), [principalBrowser, producerBrowser]);
  assert.ok(firstResult.headers.get('x-middleware-rewrite')?.includes('component_principal'));
  assert.ok(second.headers.get('x-middleware-rewrite')?.includes('component_producer'));
  assert.ok(!second.headers.get('x-middleware-rewrite')?.includes('component_principal'));
  assert.equal(firstResult.headers.get('set-cookie'), null, 'Personalization does not create or alter native identity cookies');
  assert.equal(firstContext.get('PersonalizeProxy')?.executedSuccessfully, true);
  assert.equal(secondContext.get('PersonalizeProxy')?.executedSuccessfully, true);
  const rejectUnknown = new PortalPersonalizeProxy(config, async () => principal, async () => Response.json({ variantId: 'other_component' }));
  const unchanged = await rejectUnknown.forRequest(async () => principal).handle(request(principalBrowser), NextResponse.next());
  assert.equal(unchanged.headers.get('x-middleware-rewrite'), null);
});

test('guarded native discovery keeps its cache and prevents confidential failures reaching the base proxy logger', async () => {
  const { PortalPersonalizeProxy } = await import('./PortalPersonalizeProxy');
  const marker = 'CONFIDENTIAL-GRAPHQL-FAILURE';
  let queries = 0;
  const transport: typeof fetch = async (_, init) => {
    queries++;
    const query = JSON.parse(String(init?.body)) as { variables: { itemPath: string } };
    if (query.variables.itemPath === '/failure') throw new Error(marker);
    return Response.json({ data: { layout: { item: {
      id: 'native-page', version: '1', personalization: { variantIds: ['component_principal'] },
    } } } });
  };
  const service = new PortalPersonalizeService({
    clientFactory: GraphQLRequestClient.createClientFactory({ endpoint: 'https://edge.example/graphql', retries: 0 }),
    fetch: transport, timeout: 800, cacheEnabled: true, cacheTimeout: 0.1,
  });
  const expected = { pageId: 'native-page', variantIds: ['component_principal'] };
  assert.deepEqual(await service.getPersonalizeInfo('/workspace', 'en', 'portal-a'), expected);
  assert.deepEqual(await service.getPersonalizeInfo('/workspace', 'en', 'portal-a'), expected);
  assert.equal(queries, 1, 'Repeated native discovery reuses the SDK cache');
  let decisions = 0;
  const proxy = new PortalPersonalizeProxy({
    sites: [{ name: 'portal-a', hostName: 'portal.example', language: 'en' }],
    contextId: marker, clientContextId: context.contextId, edgeUrl: context.edgeUrl,
    enabled: true, cdpTimeout: 800, edgeTimeout: 800, scope: '', channel: 'WEB', currency: 'USD',
    personalizeService: service,
  }, async () => principal, async () => { decisions++; return Response.json({ variantId: 'component_principal' }); });
  process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS = 'true';
  const result = await proxy.forRequest(async () => principal).handle(new NextRequest('https://portal.example/failure', {
    headers: { host: 'portal.example', cookie: `sc_cid=${principalBrowser}` },
  }), NextResponse.next());
  delete process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS;
  assert.equal(result.headers.get('x-middleware-rewrite'), null);
  assert.equal(decisions, 0);
  assert.equal(queries, 2);
});

test('concurrent discovery misses cannot clear another request deadline', async () => {
  const firstResponse = deferred<Response>();
  const secondStarted = deferred<void>();
  const service = new PortalPersonalizeService({
    clientFactory: GraphQLRequestClient.createClientFactory({ endpoint: 'https://edge.example/graphql', retries: 0 }),
    timeout: 30, cacheEnabled: false,
    fetch: async (_, init) => {
      const query = JSON.parse(String(init?.body)) as { variables: { itemPath: string } };
      if (query.variables.itemPath === '/second') {
        secondStarted.resolve();
        return new Promise<Response>(() => {});
      }
      return firstResponse.promise;
    },
  });
  const first = service.getPersonalizeInfo('/first', 'en', 'portal-a');
  const second = service.getPersonalizeInfo('/second', 'en', 'portal-a');
  await secondStarted.promise;
  firstResponse.resolve(Response.json({ data: { layout: { item: {
    id: 'first-page', version: '1', personalization: { variantIds: ['component_principal'] },
  } } } }));
  assert.deepEqual(await first, { pageId: 'first-page', variantIds: ['component_principal'] });
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      second,
      new Promise<string>((resolve) => { watchdog = setTimeout(() => resolve('deadline-was-lost'), 150); }),
    ]);
    assert.equal(outcome, undefined, 'The still-pending request must independently time out to neutral');
  } finally {
    clearTimeout(watchdog);
  }
});
