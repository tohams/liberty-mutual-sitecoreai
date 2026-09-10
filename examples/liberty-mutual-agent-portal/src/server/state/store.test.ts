import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RedisStateStore, getStateStore } from './store';
import { PortalError } from '../errors';

test('Redis adapter uses one atomic EVAL command and sends its token only in the authorization header', async (context) => {
  const calls: { url: string; command: unknown[]; authorization: string | null }[] = [];
  const values = new Map<string, string>();
  context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    const command = JSON.parse(String(options.body)) as unknown[];
    calls.push({ url, command, authorization: new Headers(options.headers).get('authorization') });
    let result: unknown;
    if (command[0] === 'GET') result = values.get(String(command[1])) ?? null;
    else {
      assert.equal(command[0], 'EVAL');
      assert.match(String(command[1]), /redis.call\('GET'/);
      assert.match(String(command[1]), /redis.call\('SET'/);
      const key = String(command[3]);
      const current = values.get(key);
      const version = current ? JSON.parse(current).version : -1;
      if (version !== command[4]) result = null;
      else { result = command[5]; values.set(key, String(result)); }
    }
    return Response.json({ result });
  });
  const store = new RedisStateStore('https://redis.example', 'secret-test-token');
  const first = await store.compareAndSet('test-key', null, { saved: true }, 60);
  assert.equal(first?.version, 0);
  assert.equal((await store.read<{ saved: boolean }>('test-key'))?.value.saved, true);
  assert.equal(await store.compareAndSet('test-key', null, { saved: false }, 60), null);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => !call.url.includes('secret-test-token') && call.authorization === 'Bearer secret-test-token'));
});

test('deployed environments cannot fall back to a local file store', () => {
  const old = { VERCEL: process.env.VERCEL, PORTAL_STATE_ADAPTER: process.env.PORTAL_STATE_ADAPTER, PORTAL_REDIS_REST_URL: process.env.PORTAL_REDIS_REST_URL, PORTAL_REDIS_REST_TOKEN: process.env.PORTAL_REDIS_REST_TOKEN, KV_REST_API_URL: process.env.KV_REST_API_URL, KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN };
  try {
    process.env.VERCEL = '1'; process.env.PORTAL_STATE_ADAPTER = 'local-json';
    delete process.env.PORTAL_REDIS_REST_URL; delete process.env.PORTAL_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    assert.throws(getStateStore, (error) => error instanceof PortalError && error.code === 'CONFIGURATION_REQUIRED');
  } finally {
    for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
