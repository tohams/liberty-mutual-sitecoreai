import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { extractPortalVisitorGeo } from './visitor-geolocation';

function request(headers: Record<string, string>) {
  return new NextRequest('https://portal.example/products?state=IL', { headers });
}

async function onVercel(operation: () => Promise<void> | void) {
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  try { await operation(); }
  finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
  }
}

test('hosted visitor country and Oregon region come from the request, independent of risk state', () => onVercel(() => {
  const geo = extractPortalVisitorGeo(request({
    'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'OR', 'x-vercel-ip-city': 'Portland',
  }));
  assert.deepEqual(geo, { country: 'US', region: 'OR', city: 'Portland' });
  assert.equal(geo instanceof Promise, false, 'The SDK callback returns its exact geo object synchronously');
  assert.deepEqual(extractPortalVisitorGeo(request({
    'x-vercel-ip-country': 'BR', 'x-vercel-ip-country-region': 'SP', 'x-vercel-ip-city': 'S%C3%A3o%20Paulo',
  })), { country: 'BR', region: 'SP', city: 'São Paulo' });
}));

test('missing or malformed location fields are omitted without manufacturing a location', () => onVercel(() => {
  assert.deepEqual(extractPortalVisitorGeo(), {});
  for (const country of ['', 'us', 'USA', 'US,CA', 'US%00']) {
    assert.deepEqual(extractPortalVisitorGeo(request({
      'x-vercel-ip-country': country, 'x-vercel-ip-country-region': 'OR', 'x-vercel-ip-city': 'Portland',
    })), {});
  }
  for (const region of ['', 'or', 'Oregon', 'US-OR', 'OR,TX', '123']) {
    assert.deepEqual(extractPortalVisitorGeo(request({
      'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': region,
    })), { country: 'US' });
  }
  for (const city of ['', '%E0%A4%A', 'Portland%0AInjected', '%C2%85', 'x'.repeat(161), 'x'.repeat(513)]) {
    assert.deepEqual(extractPortalVisitorGeo(request({
      'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'OR', 'x-vercel-ip-city': city,
    })), { country: 'US', region: 'OR' });
  }
  assert.deepEqual(extractPortalVisitorGeo(request({
    'x-forwarded-for': '203.0.113.1', 'x-vercel-ip-country-region': 'OR', 'x-vercel-ip-city': 'Portland',
  })), {}, 'An IP or a region without country never provides an inferred location');
}));

test('local or other hosting cannot opt into visitor geography through spoofed Vercel headers', () => {
  const previous = process.env.VERCEL;
  try {
    for (const environment of [undefined, '', '0', 'true']) {
      if (environment === undefined) delete process.env.VERCEL; else process.env.VERCEL = environment;
      assert.deepEqual(extractPortalVisitorGeo(request({
        'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'OR', 'x-vercel-ip-city': 'Portland',
      })), {});
    }
  } finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
  }
});

test('the native SDK callback forwards each concurrent visitor geography to its own decision', async () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--import', 'tsx', '--experimental-test-module-mocks', '--test', '--test-reporter=tap',
    join(process.cwd(), 'src/server/personalization/visitor-geolocation.fixture.ts'),
  ], { env: environment, timeout: 15000 });
  assert.match(stdout, /pass 1/);
});
