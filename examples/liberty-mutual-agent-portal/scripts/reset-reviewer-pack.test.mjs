import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReset } from './reset-reviewer-pack.mjs';

const ORIGIN = 'https://portal.example';
const PACK = '15';
const SECRET = 'operator-test-secret-do-not-persist-123456';
const REQUEST = '11111111-1111-4111-8111-111111111111';
const RUN = '22222222-2222-4222-8222-222222222222';
const NEXT = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const args = [ORIGIN, PACK, 'restart'];
const body = { reviewerPack: PACK, mode: 'restart', requestId: REQUEST, expectedRunId: RUN };
const state = () => ({ reviewerPack: PACK, runId: RUN, profileGeneration: 9, pendingRestart: null, operation: null });
const pending = () => ({ ...body, status: 'pending', phase: 'verifying', runId: RUN, profileGeneration: 9, targetGeneration: 10, clearBrowserIdentity: false, retryAfterSeconds: 1 });
const completed = () => ({ ...pending(), status: 'completed', phase: 'completed', runId: NEXT, profileGeneration: 10, clearBrowserIdentity: true });
const failed = () => ({ ...pending(), status: 'failed', phase: 'failed', code: 'UPLOAD_UNCERTAIN', message: SECRET });
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const isError = (code) => (error) => error.code === code && !error.message.includes(SECRET);

async function harness(t, handler, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'portal-restart-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  const progress = [];
  let clock = 0;
  const dependencies = {
    env: { PORTAL_OPERATOR_SECRET: SECRET }, operationDirectory: directory,
    now: () => clock, sleep: async (ms) => { clock += ms; }, timeoutMs: 5000,
    requestIdFactory: () => REQUEST, onProgress: (message) => progress.push(message),
    fetchImpl: async (url, options) => {
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, `Bearer ${SECRET}`);
      const call = { url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined };
      calls.push(call);
      return handler(call, calls.length, directory);
    }, ...overrides,
  };
  return { directory, calls, progress, dependencies, run: (input = args) => runReset(input, dependencies) };
}

async function onlyOperation(directory) {
  const files = await readdir(directory);
  assert.equal(files.length, 1);
  const path = join(directory, files[0]);
  return { path, text: await readFile(path, 'utf8') };
}

test('pending, network ambiguity, throttling and server errors repeat exactly one persisted request until verified completion', async (t) => {
  const h = await harness(t, async (call, index, directory) => {
    if (index === 1) return json(state());
    assert.deepEqual(call.body, body);
    const file = await onlyOperation(directory);
    assert.equal(JSON.parse(file.text).requestId, REQUEST, 'Request identity is persisted before POST');
    assert.equal(file.text.includes(SECRET), false);
    if (process.platform !== 'win32') assert.equal((await stat(file.path)).mode & 0o777, 0o600);
    if (index === 2) throw new Error(SECRET);
    if (index === 3) return json({ error: { message: SECRET } }, 429, { 'retry-after': '1' });
    if (index === 4) return json({ error: { message: SECRET } }, 503, { 'retry-after': '1' });
    if (index === 5) return json(pending(), 202);
    return json({ ...completed(), secret: SECRET, message: SECRET });
  }, { timeoutMs: 10000 });
  const receipt = await h.run();
  assert.equal(receipt.status, 'completed');
  assert.equal(receipt.profileGeneration, 10, 'Generations beyond the original four sets are supported');
  assert.equal(h.calls.length, 6);
  assert.equal(h.calls[0].method, 'GET');
  assert.ok(h.calls.slice(1).every((call) => call.method === 'POST' && JSON.stringify(call.body) === JSON.stringify(body)));
  assert.equal(JSON.stringify(receipt).includes(SECRET), false);
  assert.equal(h.progress.join('\n').includes(SECRET), false);
  assert.deepEqual(await readdir(h.directory), [], 'Successful verification removes the resumable operation file');
});

test('a timed-out command retains its identity and a later command resumes without reading a new run or creating a new UUID', async (t) => {
  let resume = false;
  let ids = 0;
  const h = await harness(t, (call) => call.method === 'GET' ? json(state()) : json(resume ? completed() : pending(), resume ? 200 : 202), { requestIdFactory: () => { ids++; return REQUEST; } });
  await assert.rejects(h.run(), isError('TIMEOUT'));
  const original = await onlyOperation(h.directory);
  assert.equal(JSON.parse(original.text).expectedRunId, RUN);
  resume = true;
  const before = h.calls.length;
  assert.equal((await h.run()).status, 'completed');
  assert.equal(ids, 1);
  assert.deepEqual(h.calls.slice(before).map((call) => call.method), ['POST']);
  assert.deepEqual(h.calls.at(-1).body, body);
});

test('a lost local file resumes the server pending request instead of reserving another generation', async (t) => {
  const h = await harness(t, (call) => call.method === 'GET' ? json({ ...state(), pendingRestart: pending() }) : json(completed()), { requestIdFactory: () => assert.fail('A server pending restart must retain its request UUID') });
  assert.equal((await h.run()).status, 'completed');
  assert.deepEqual(h.calls[1].body, body);
});

test('explicit request and expected run resume an already completed operation directly', async (t) => {
  const h = await harness(t, (call) => { assert.equal(call.method, 'POST'); return json(completed()); }, { requestIdFactory: () => assert.fail('Explicit resume must not generate a UUID') });
  const receipt = await h.run([...args, '--request-id', REQUEST, '--expected-run-id', RUN]);
  assert.equal(receipt.runId, NEXT);
  assert.equal(h.calls.length, 1);
});

test('uncertain upload stops immediately, preserves the operation, and never retries with a new request', async (t) => {
  const h = await harness(t, (call) => call.method === 'GET' ? json(state()) : json(failed(), 409));
  await assert.rejects(h.run(), isError('UPLOAD_UNCERTAIN'));
  assert.equal(h.calls.length, 2);
  const file = await onlyOperation(h.directory);
  assert.equal(JSON.parse(file.text).requestId, REQUEST);
  assert.equal(file.text.includes(SECRET), false);
  assert.equal(h.progress.join('\n').includes(SECRET), false);
});

test('malformed and cross-operation receipts never activate or discard the saved request', async (t) => {
  const invalid = [
    { ...completed(), reviewerPack: '14' }, { ...completed(), requestId: OTHER },
    { ...completed(), expectedRunId: OTHER }, { ...completed(), runId: RUN },
    { ...completed(), profileGeneration: 9 }, { ...completed(), clearBrowserIdentity: false },
    { ...pending(), runId: OTHER }, { ...pending(), targetGeneration: 9 },
    { ...completed(), status: 'pending' }, { ...completed(), profileGeneration: '10' },
  ];
  for (const [index, value] of invalid.entries()) {
    await t.test(String(index), async (inner) => {
      const h = await harness(inner, (call) => call.method === 'GET' ? json(state()) : json(value));
      await assert.rejects(h.run(), isError('INVALID_RECEIPT'));
      assert.equal(h.calls.length, 2);
      assert.ok(await onlyOperation(h.directory));
    });
  }
});

test('malformed current status prevents any POST and any local operation reservation', async (t) => {
  const h = await harness(t, () => json({ ...state(), runId: SECRET }));
  await assert.rejects(h.run(), isError('INVALID_RECEIPT'));
  assert.equal(h.calls.length, 1);
  assert.deepEqual(await readdir(h.directory), []);
});

test('receipt and HTTP status must agree, and permanent configuration errors are not polled', async (t) => {
  for (const [receipt, status] of [[completed(), 202], [pending(), 200], [failed(), 200]]) {
    await t.test(`${receipt.status}/${status}`, async (inner) => {
      const h = await harness(inner, (call) => call.method === 'GET' ? json(state()) : json(receipt, status));
      await assert.rejects(h.run(), isError('INVALID_RECEIPT'));
      assert.equal(h.calls.length, 2);
      assert.ok(await onlyOperation(h.directory));
    });
  }
  const h = await harness(t, () => json({ error: { code: 'CONFIGURATION_REQUIRED', message: SECRET } }, 503));
  await assert.rejects(h.run(), isError('CONFIGURATION_REQUIRED'));
  assert.equal(h.calls.length, 1);
  assert.equal(h.progress.join('\n').includes(SECRET), false);
});

test('resume files reject a different host, pack or explicit request before sending network traffic', async (t) => {
  for (const change of [{ origin: 'https://other.example' }, { reviewerPack: '14' }, { requestId: OTHER }]) {
    await t.test(JSON.stringify(change), async (inner) => {
      const h = await harness(inner, () => assert.fail('Invalid resume may not send a request'));
      const path = join(h.directory, 'operation.json');
      await writeFile(path, JSON.stringify({ schemaVersion: 1, origin: ORIGIN, ...body, ...change }));
      await assert.rejects(h.run([...args, '--operation-file', path, '--request-id', REQUEST, '--expected-run-id', RUN]), isError('RESUME_FILE'));
      assert.equal(h.calls.length, 0);
    });
  }
});

test('invalid arguments and missing authorization make no requests', async (t) => {
  const h = await harness(t, () => assert.fail('Invalid command may not send a request'));
  for (const input of [
    [ORIGIN, '21', 'restart'], [ORIGIN, '1', 'restart'], [ORIGIN, PACK, 'delete'],
    ['http://external.example', PACK, 'restart'], ['https://user:password@portal.example', PACK, 'restart'],
    [ORIGIN + '/path', PACK, 'restart'], [...args, '--request-id', REQUEST],
    [...args, '--request-id', 'bad', '--expected-run-id', RUN],
    [ORIGIN, PACK, 'saved-work', '--operation-file', '/tmp/unused'],
  ]) await assert.rejects(h.run(input), isError('ARGUMENTS'));
  await assert.rejects(runReset(args, { ...h.dependencies, env: {} }), isError('AUTHORIZATION'));
  assert.equal(h.calls.length, 0);
});

test('saved-work remains one POST without a restart UUID, and ambiguous replies are not repeated', async (t) => {
  const h = await harness(t, (call) => {
    assert.deepEqual(call.body, { reviewerPack: PACK, mode: 'saved-work' });
    return json({ reviewerPack: PACK, mode: 'saved-work', runId: NEXT, profileGeneration: 9, clearBrowserIdentity: false });
  });
  assert.equal((await h.run([ORIGIN, PACK, 'saved-work'])).profileGeneration, 9);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(await readdir(h.directory), []);
  const broken = await harness(t, () => { throw new Error(SECRET); });
  await assert.rejects(broken.run([ORIGIN, PACK, 'saved-work']), isError('SAVED_WORK_UNCERTAIN'));
  assert.equal(broken.calls.length, 1);
});
