import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import type { PersonalizeProxyConfig } from '@sitecore-content-sdk/nextjs/proxy';

mock.module('server-only', { namedExports: {} });

test('native proxy forwards request-local visitor geography without shared SDK initialization', async () => {
  const { extractPortalVisitorGeo } = await import('./visitor-geolocation');
  const { PortalPersonalizeProxy } = await import('./PortalPersonalizeProxy');
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  try {
    const browsers = ['a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222'];
    const expected = [
      { country: 'US', region: 'OR', city: 'Portland' },
      { country: 'US', region: 'TX', city: 'Houston' },
    ];
    const calls = new Map<string, Record<string, unknown>>();
    const transport: typeof fetch = async (input, init) => {
      if (init?.method === 'GET') {
        const browser = new URL(String(input)).pathname.split('/').at(-2)!;
        return Response.json({ ref: browser, customer: { ref: `native-${browser}` } });
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.set(String(body.browserId), body);
      return Response.json({ variantId: 'component_treatment' });
    };
    const config: PersonalizeProxyConfig = {
      sites: [{ name: 'portal', hostName: 'portal.example', language: 'en' }],
      contextId: 'synthetic-private-discovery-context', clientContextId: 'synthetic-public-context',
      edgeUrl: 'https://edge.example', enabled: true, cdpTimeout: 500, edgeTimeout: 500,
      scope: '', channel: 'WEB', currency: 'USD',
      extractGeoDataCb: extractPortalVisitorGeo,
      personalizeService: { getPersonalizeInfo: async () => ({
        pageId: 'native-page', variantIds: ['component_treatment'],
      }) } as unknown as PersonalizeProxyConfig['personalizeService'],
    };
    const proxy = new PortalPersonalizeProxy(config, async () => null, transport);
    const responses = await Promise.all(browsers.map((browser, index) =>
      proxy.forRequest(async () => ({ provider: 'liberty-mutual-agent', id: `verified-agent-${index}` })).handle(
        new NextRequest('https://portal.example/products?state=IL', { headers: {
          host: 'portal.example', cookie: `sc_cid=${browser}`, 'user-agent': 'Agent browser',
          'x-vercel-ip-country': expected[index].country, 'x-vercel-ip-country-region': expected[index].region,
          'x-vercel-ip-city': expected[index].city,
        } }), NextResponse.next(),
      ),
    ));
    assert.equal(calls.size, 2, 'Only one decision is executed for each visitor');
    for (const [index, browser] of browsers.entries()) {
      assert.deepEqual((calls.get(browser)?.params as { geo: unknown }).geo, expected[index]);
      assert.equal(calls.get(browser)?.guestRef, `native-${browser}`);
      assert.ok(responses[index].headers.get('x-middleware-rewrite')?.includes('component_treatment'));
    }
  } finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
  }
});
