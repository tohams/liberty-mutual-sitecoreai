import { test, type TestContext } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { LocalJsonStateStore, RedisStateStore, getStateStore, isReviewerWorkspaceKey } from './store';
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

const workspaceKey = 'lm-portal:v1:storage-tests:pack:01';
function mockRedis(context: TestContext, initial: Record<string, { raw: string; ttl: number }> = {}, beforePersist?: (values: Map<string, { raw: string; ttl: number }>, key: string) => void) {
  const values = new Map(Object.entries(initial));
  const commands: unknown[][] = [];
  context.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    const command = JSON.parse(String(options.body)) as unknown[];
    commands.push(command);
    if (command[0] === 'GET') return Response.json({ result: values.get(String(command[1]))?.raw ?? null });
    assert.equal(command[0], 'EVAL');
    const script = String(command[1]);
    const key = String(command[3]);
    if (script.includes("redis.call('PERSIST'")) {
      assert.ok(script.includes('raw ~= ARGV[1]') && script.includes("redis.call('TTL'"));
      assert.ok(!script.includes('cjson'), 'Migration must not re-encode stored arrays or numbers with Lua');
      beforePersist?.(values, key);
      const current = values.get(key);
      if (!current || current.raw !== command[4]) return Response.json({ result: null });
      const raw = String(command[5]);
      values.set(key, { raw, ttl: -1 });
      return Response.json({ result: [raw, -1] });
    }
    assert.ok(script.includes("ARGV[3] == 'persistent'"));
    const current = values.get(key);
    const version = current ? JSON.parse(current.raw).version : -1;
    if (version !== command[4]) return Response.json({ result: null });
    const raw = String(command[5]);
    values.set(key, { raw, ttl: command[6] === 'persistent' ? -1 : Number(command[6]) });
    return Response.json({ result: raw });
  });
  return { values, commands, store: new RedisStateStore('https://redis.example', 'synthetic-private-token') };
}

test('workspace policy matches only exact metadata and agency keys, preserving unrelated TTLs', () => {
  assert.equal(isReviewerWorkspaceKey(workspaceKey), true);
  assert.equal(isReviewerWorkspaceKey(`${workspaceKey}:run:${randomUUID()}:agency:cedar-ridge`), true);
  for (const key of [`${workspaceKey}:login-rate:abc`, 'lm-portal:v1:storage-tests:login-rate:abc:0',
    `${workspaceKey}:run:invalid:agency:cedar-ridge`, `${workspaceKey}:run:${randomUUID()}:agency:cedar-ridge:other`, 'other:pack:01']) {
    assert.equal(isReviewerWorkspaceKey(key), false, key);
  }
});

test('Redis migrates legacy expiry atomically without changing payload, arrays, number precision or version', async (context) => {
  const legacy = { version: 8, expiresAt: Date.now() - 1000, value: { empty: [], nested: { array: [] }, count: 9007199254740991, favorites: ['home-renewal'], id: randomUUID() } };
  const { store, values } = mockRedis(context, { [workspaceKey]: { raw: JSON.stringify(legacy), ttl: 60 } });
  const migrated = await store.persist(workspaceKey);
  assert.deepEqual(migrated?.before, legacy);
  assert.deepEqual(migrated?.after, { ...legacy, expiresAt: null });
  assert.equal(migrated?.redisTtlSeconds, -1);
  assert.equal(values.get(workspaceKey)?.ttl, -1);
  const repeated = await store.persist(workspaceKey);
  assert.deepEqual(repeated?.before, migrated?.after);
  assert.deepEqual(repeated?.after, migrated?.after);
  assert.equal((await store.read(workspaceKey))?.expiresAt, null);
  assert.equal(await store.compareAndSet(workspaceKey, null, { overwritten: true }, null), null);
  assert.deepEqual((await store.read(workspaceKey))?.value, legacy.value);
});

test('null embedded expiry also removes a stale physical Redis TTL; missing keys stay missing', async (context) => {
  const record = { version: 2, expiresAt: null, value: { data: [] } };
  const { store, values } = mockRedis(context, { [workspaceKey]: { raw: JSON.stringify(record), ttl: 50 } });
  assert.deepEqual(await store.read(workspaceKey), record);
  assert.equal(values.get(workspaceKey)?.ttl, -1);
  const missing = workspaceKey.replace(':01', ':15');
  assert.equal(await store.persist(missing), null);
  assert.equal(values.has(missing), false);
  await assert.rejects(store.persist('lm-portal:v1:storage-tests:login-rate:abc:0'), (error) => error instanceof PortalError && error.code === 'INVALID_STATE_KEY');
});

test('Redis raw comparison retries a concurrent write without overwriting its value or version', async (context) => {
  const older = { version: 1, expiresAt: Date.now() + 5000, value: { favorites: [] } };
  const newer = { version: 2, expiresAt: Date.now() + 5000, value: { favorites: ['saved-concurrently'] } };
  let raced = false;
  const { store, values } = mockRedis(context, { [workspaceKey]: { raw: JSON.stringify(older), ttl: 5 } }, (records, key) => {
    if (!raced) { raced = true; records.set(key, { raw: JSON.stringify(newer), ttl: 5 }); }
  });
  const migrated = await store.persist(workspaceKey);
  assert.deepEqual(migrated?.after, { ...newer, expiresAt: null });
  assert.equal(values.get(workspaceKey)?.ttl, -1);
  assert.equal(await store.compareAndSet(workspaceKey, 1, { lost: true }, null), null);
  assert.deepEqual((await store.read(workspaceKey))?.value, newer.value);
});

test('workspace writes are permanent even through legacy callers; rate-limit writes still expire', async (context) => {
  const { store, values } = mockRedis(context);
  const permanent = await store.compareAndSet(workspaceKey, null, { saved: true }, 60);
  assert.equal(permanent?.expiresAt, null);
  assert.equal(values.get(workspaceKey)?.ttl, -1);
  const rateKey = 'lm-portal:v1:storage-tests:login-rate:abc:0';
  const rate = await store.compareAndSet(rateKey, null, { attempts: 1 }, 900);
  assert.ok(typeof rate?.expiresAt === 'number' && rate.expiresAt > Date.now());
  assert.equal(values.get(rateKey)?.ttl, 900);
  values.set(rateKey, { raw: JSON.stringify({ ...rate, expiresAt: Date.now() - 1 }), ttl: 1 });
  assert.equal(await store.read(rateKey), null);
});

test('local files migrate elapsed expiry under one lock and retain data indefinitely without resetting versions', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'persistent-workspace-'));
  try {
    const store = new LocalJsonStateStore(directory);
    const path = join(directory, createHash('sha256').update(workspaceKey).digest('hex') + '.json');
    const legacy = { version: 9, expiresAt: Date.now() - 1000, value: { array: [], saved: ['retain'] } };
    await writeFile(path, JSON.stringify(legacy));
    const [left, right] = await Promise.all([store.read(workspaceKey), store.persist(workspaceKey)]);
    assert.deepEqual(left, { ...legacy, expiresAt: null });
    assert.deepEqual(right?.after, left);
    assert.equal(await store.compareAndSet(workspaceKey, 8, { replace: true }, null), null);
    const updated = await store.compareAndSet(workspaceKey, 9, { array: [], saved: ['retain', 'new'] }, 60);
    assert.equal(updated?.version, 10);
    assert.equal(updated?.expiresAt, null);
    const originalNow = Date.now();
    context.mock.method(Date, 'now', () => originalNow + 100 * 365 * 24 * 60 * 60 * 1000);
    assert.deepEqual(await store.read(workspaceKey), updated, 'Permanent data remains readable beyond any fixed duration');
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), updated);
    const rateKey = 'lm-portal:v1:storage-tests:login-rate:abc:0';
    await store.compareAndSet(rateKey, null, { attempts: 1 }, -1);
    assert.equal(await store.read(rateKey), null);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
