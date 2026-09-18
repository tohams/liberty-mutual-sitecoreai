import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test, { afterEach, beforeEach } from 'node:test';
import { fixtures } from '../data/fixtures';
import {
  assertProfileImportConfigured, inspectProfileImport, prepareProfileImport, ProfileImportError,
  restoreProfileImportPlan, submitProfileImport, type ProfileImportPlan, type ProfileImportSubmission,
} from './profile-import';

const endpoint = 'https://edge-platform.sitecorecloud.io/op/tenant/cdp';
const credential = 'unit-test-credential-never-returned';
const batchId = 'a1111111-1111-4111-8111-111111111111';
const originalFetch = globalThis.fetch;
const originalUrl = process.env.SITECORE_PROFILE_IMPORT_URL;
const originalKey = process.env.SITECORE_PROFILE_IMPORT_API_KEY;

beforeEach(() => {
  process.env.SITECORE_PROFILE_IMPORT_URL = endpoint;
  process.env.SITECORE_PROFILE_IMPORT_API_KEY = credential;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SITECORE_PROFILE_IMPORT_URL;
  else process.env.SITECORE_PROFILE_IMPORT_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SITECORE_PROFILE_IMPORT_API_KEY;
  else process.env.SITECORE_PROFILE_IMPORT_API_KEY = originalKey;
});

function plan(): ProfileImportPlan {
  return prepareProfileImport({ reviewerPack: '01', generation: 4, profileSetId: randomUUID(), identityScope: 'production' });
}
function submission(input: ProfileImportPlan): ProfileImportSubmission {
  return { batchId, checksumMd5: input.checksumMd5, fileSizeBytes: input.fileSizeBytes };
}
function status() {
  return { batchId, status: 'COMPLETED', totalRecords: 7, succeededRecords: 7, failedRecords: 0 };
}
function stats(input: ProfileImportPlan) {
  return { ...status(), ...submission(input), createdRecords: 7, updatedRecords: 0 };
}
function records(input: ProfileImportPlan) {
  return input.profiles.map((profile, recordIndex) => ({
    recordIndex, id: profile.correlationId, recordType: 'profile', outcome: 'CREATED', profileId: randomUUID(),
  }));
}
function mockResponses(input: ProfileImportPlan, options: {
  status?: unknown; stats?: unknown; results?: unknown[] | string;
} = {}) {
  const lines = options.results ?? records(input);
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/status')) return Response.json(options.status ?? status());
    if (String(url).endsWith('/stats')) return Response.json(options.stats ?? stats(input));
    if (String(url).endsWith('/results')) return new Response(typeof lines === 'string' ? lines : lines.map((item) => JSON.stringify(item)).join('\n') + '\n');
    throw new Error('Unexpected request.');
  };
}
function isImportError(code: string, retryable: boolean, uploadUncertain: boolean) {
  return (error: unknown) => {
    assert.ok(error instanceof ProfileImportError);
    assert.equal(error.code, code);
    assert.equal(error.retryable, retryable);
    assert.equal(error.uploadUncertain, uploadUncertain);
    assert.ok(!String(error).includes(credential));
    assert.ok(!JSON.stringify(error).includes(credential));
    assert.ok(!('cause' in error));
    return true;
  };
}

test('seven immutable profiles preserve the accepted scalar attributes and isolate new sets/scopes', () => {
  const input = plan();
  const rows = input.payload.trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(rows.length, 7);
  assert.equal(new Set(input.profiles.map((entry) => entry.identifier)).size, 7);
  assert.equal(new Set(input.profiles.map((entry) => entry.correlationId)).size, 7);
  assert.ok(Object.isFrozen(input) && Object.isFrozen(input.profiles));
  assert.ok(input.profiles.every(Object.isFrozen));
  assert.equal(input.fileSizeBytes, Buffer.byteLength(input.payload));
  assert.equal(input.checksumMd5, createHash('md5').update(input.payload).digest('hex'));
  for (const [index, row] of rows.entries()) {
    const agent = fixtures.agents[index];
    assert.equal(row.id, input.profiles[index].correlationId);
    assert.deepEqual(row.identifiers, [{ provider: 'liberty-mutual-agent', id: input.profiles[index].identifier }]);
    assert.deepEqual(row.contact, { firstName: agent.firstName, lastName: agent.lastName });
    assert.equal(row.extensions.agentId, agent.id);
    assert.equal(row.extensions.role, agent.role);
    assert.equal(row.extensions.licensedInTexas, agent.licensedStates.includes('TX'));
    assert.equal(row.extensions.licensedInFlorida, agent.licensedStates.includes('FL'));
    assert.equal(row.extensions.profileGeneration, 4);
    assert.equal(row.extensions.profileSetId, input.profileSetId);
    assert.ok(Object.values(row.extensions).every((value) => ['string', 'boolean', 'number'].includes(typeof value)));
    assert.ok(!('email' in row.contact));
  }
  const same = prepareProfileImport(input);
  assert.deepEqual(same.profiles.map((p) => p.identifier), input.profiles.map((p) => p.identifier));
  assert.notEqual(same.profiles[0].correlationId, input.profiles[0].correlationId);
  assert.notEqual(prepareProfileImport({ ...input, identityScope: 'preview' }).profiles[0].identifier, input.profiles[0].identifier);
  assert.notEqual(plan().profiles[0].identifier, input.profiles[0].identifier);
});

test('builder rejects unknown packs, noninteger generations and invalid identity inputs', () => {
  const valid = plan();
  for (const change of [{ reviewerPack: '99' }, { generation: -1 }, { generation: NaN }, { generation: 1.2 },
    { profileSetId: 'old-generation' }, { identityScope: '' }, { identityScope: 'not/a/scope' }]) {
    assert.throws(() => prepareProfileImport({ ...valid, ...change }), isImportError('INVALID_IMPORT_PLAN', false, false));
  }
});

test('retained descriptors reconstruct the exact immutable upload without network access', () => {
  const input = plan();
  globalThis.fetch = async () => { assert.fail('Restoration must not make native requests'); };
  const restored = restoreProfileImportPlan(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(restored, input);
  assert.ok(Object.isFrozen(restored) && Object.isFrozen(restored.profiles));
  assert.ok(restored.profiles.every(Object.isFrozen));
});

test('restoration rejects altered descriptors, fixture bytes and missing or repeated correlations', () => {
  const input = plan();
  const changes = [
    { checksumMd5: 'f'.repeat(32) }, { fileSizeBytes: input.fileSizeBytes + 1 },
    { generation: input.generation + 1 }, { profileSetId: randomUUID() }, { identityScope: 'another-host' },
    { profiles: input.profiles.slice(1) }, { profiles: [...input.profiles].reverse() },
    { profiles: new Array(7) },
    { profiles: input.profiles.map((p, i) => i === 0 ? { ...p, identifier: 'wrong' } : p) },
    { profiles: input.profiles.map((p, i) => i === 0 ? { ...p, correlationId: input.profiles[1].correlationId } : p) },
    { profiles: input.profiles.map((p, i) => i === 0 ? { ...p, correlationId: randomUUID() } : p) },
  ];
  globalThis.fetch = async () => { assert.fail('Invalid restoration must not make native requests'); };
  for (const change of changes) assert.throws(() => restoreProfileImportPlan({ ...input, ...change }),
    isImportError('INVALID_IMPORT_PLAN', false, false));
});

test('configuration accepts the native HTTPS path and rejects secret-bearing or untrusted URLs', () => {
  assert.doesNotThrow(assertProfileImportConfigured);
  for (const url of ['http://edge-platform.sitecorecloud.io', 'https://sitecorecloud.io.evil.example',
    'https://not-sitecorecloud.io', 'https://localhost', 'https://user:pass@edge-platform.sitecorecloud.io',
    `${endpoint}?key=x`, `${endpoint}#key`, 'https://edge-platform.sitecorecloud.io:444']) {
    process.env.SITECORE_PROFILE_IMPORT_URL = url;
    assert.throws(assertProfileImportConfigured, isImportError('IMPORT_NOT_CONFIGURED', false, false));
  }
  process.env.SITECORE_PROFILE_IMPORT_URL = endpoint;
  for (const value of ['', ' bad', 'bad\r\nvalue']) {
    process.env.SITECORE_PROFILE_IMPORT_API_KEY = value;
    assert.throws(assertProfileImportConfigured, isImportError('IMPORT_NOT_CONFIGURED', false, false));
  }
});

test('single upload sends exact bytes/checksum and server-only authentication without redirects or caching', async () => {
  const input = plan();
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, `${endpoint}/v1/batches`);
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.cache, 'no-store');
    assert.equal(new Headers(init?.headers).get('Authorization'), `ApiKey ${credential}`);
    assert.ok(!String(url).includes(credential));
    assert.ok(!new Headers(init?.headers).has('content-type'), 'FormData owns the boundary');
    const form = init?.body as FormData;
    assert.equal(form.get('md5'), input.checksumMd5);
    const file = form.get('file') as File;
    assert.equal(await file.text(), input.payload);
    assert.equal(file.size, input.fileSizeBytes);
    return Response.json({ ...submission(input), status: 'QUEUED' }, { status: 202 });
  };
  assert.deepEqual(await submitProfileImport(input), submission(input));
  assert.equal(calls, 1);
});

test('tampered persisted payload, mapping or checksum is rejected before network access', async () => {
  const input = plan();
  globalThis.fetch = async () => { assert.fail('No network call should occur'); };
  for (const change of [{ payload: input.payload + ' ' }, { checksumMd5: 'a'.repeat(32) },
    { fileSizeBytes: input.fileSizeBytes + 1 }, { profiles: [...input.profiles].reverse() }]) {
    await assert.rejects(submitProfileImport({ ...input, ...change }), isImportError('INVALID_IMPORT_PLAN', false, false));
  }
});

test('only explicit upload 429 is safe to retry; rejected credentials and unknown upload outcomes remain distinct', async () => {
  const input = plan();
  for (const code of [400, 401, 403, 429, 500, 503, 408, 200, 302]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(credential, { status: code }); };
    const uncertain = code >= 500 || code === 408 || code < 400;
    await assert.rejects(submitProfileImport(input), isImportError(code === 429 ? 'IMPORT_QUEUE_BUSY' : uncertain ? 'UPLOAD_UNCERTAIN' : 'IMPORT_REQUEST_REJECTED', code === 429, uncertain));
    assert.equal(calls, 1, 'Adapter must not resubmit automatically');
  }
  globalThis.fetch = async () => { throw new Error(credential); };
  await assert.rejects(submitProfileImport(input), isImportError('UPLOAD_UNCERTAIN', false, true));
});

test('invalid successful upload acknowledgements are uncertain and cannot activate or be resubmitted', async () => {
  const input = plan();
  for (const value of ['not JSON ' + credential, { ...submission(input), status: 'COMPLETED' },
    { ...submission(input), status: 'QUEUED', checksumMd5: '0'.repeat(32) },
    { ...submission(input), status: 'QUEUED', fileSizeBytes: 1 },
    { ...submission(input), status: 'QUEUED', batchId: 'invalid' }]) {
    globalThis.fetch = async () => new Response(typeof value === 'string' ? value : JSON.stringify(value), { status: 202 });
    await assert.rejects(submitProfileImport(input), isImportError('UPLOAD_UNCERTAIN', false, true));
  }
});

test('queued and running batches remain pending without reading results', async () => {
  const input = plan();
  for (const state of ['QUEUED', 'RUNNING']) {
    let calls = 0;
    globalThis.fetch = async (url) => { calls++; assert.ok(String(url).endsWith('/status')); return Response.json({ batchId, status: state }); };
    assert.deepEqual(await inspectProfileImport(input, submission(input)), { status: 'pending', retryAfterSeconds: 3 });
    assert.equal(calls, 1);
  }
});

test('unordered successful results are correlated to all seven agents with unique canonical IDs', async () => {
  const input = plan();
  const results = records(input);
  mockResponses(input, { results: [...results].reverse() });
  const result = await inspectProfileImport(input, submission(input));
  assert.equal(result.status, 'verified');
  if (result.status !== 'verified') assert.fail('Expected verified receipt');
  assert.deepEqual(result.receipt.counts, { CREATED: 7, UPDATED: 0, FAILED: 0 });
  assert.deepEqual(result.receipt.profiles, input.profiles.map((profile, index) => ({ ...profile, profileId: results[index].profileId })));
  assert.ok(Number.isFinite(Date.parse(result.receipt.verifiedAt)));
  assert.ok(Object.isFrozen(result.receipt) && Object.isFrozen(result.receipt.profiles));
});

test('status counts, terminal failures, wrong batch and unknown states fail closed', async () => {
  const input = plan();
  for (const change of [{ status: 'COMPLETED_WITH_ERRORS' }, { status: 'FAILED' }, { status: 'NEW_STATE' },
    { batchId: randomUUID() }, { totalRecords: 8 }, { succeededRecords: 6 }, { failedRecords: 1 },
    { totalRecords: '7' }, { succeededRecords: 7.5 }, { failedRecords: null }]) {
    mockResponses(input, { status: { ...status(), ...change } });
    assert.equal((await inspectProfileImport(input, submission(input))).status, 'failed');
  }
});

test('stats require exact bytes, checksum, counts and batch identity', async () => {
  const input = plan();
  for (const change of [{ checksumMd5: 'f'.repeat(32) }, { fileSizeBytes: input.fileSizeBytes + 1 },
    { batchId: randomUUID() }, { totalRecords: 8 }, { succeededRecords: 6 }, { createdRecords: 6 },
    { updatedRecords: 1 }, { failedRecords: 1 }, { createdRecords: '7' }, { updatedRecords: null }, { status: 'RUNNING' }]) {
    mockResponses(input, { stats: { ...stats(input), ...change } });
    assert.equal((await inspectProfileImport(input, submission(input))).status, 'failed');
  }
});

test('results reject duplicates, missing/extra records, updates, bad UUIDs and wrong correlations', async () => {
  const input = plan();
  const good = records(input);
  const bad: unknown[][] = [good.slice(1), [...good, good[0]], [good[0], good[0], ...good.slice(2)]];
  for (const change of [{ outcome: 'UPDATED' }, { outcome: 'FAILED' }, { recordIndex: 8 }, { recordIndex: 1.5 },
    { recordIndex: '0' }, { id: randomUUID() }, { id: undefined }, { recordType: 'other' },
    { profileId: 'not-a-native-uuid' }, { profileId: good[1].profileId }]) {
    bad.push([{ ...good[0], ...change }, ...good.slice(1)]);
  }
  for (const results of bad) {
    mockResponses(input, { results });
    assert.equal((await inspectProfileImport(input, submission(input))).status, 'failed');
  }
});

test('failed verification exposes only allowlisted stage and shape diagnostics', async () => {
  const input = plan();
  const scenarios = [
    { options: { status: { ...status(), totalRecords: '7', [credential]: credential } }, code: 'STATUS_COUNTS_MISMATCH', stage: 'status' },
    { options: { stats: { ...stats(input), checksumMd5: 'f'.repeat(32), [credential]: credential } }, code: 'STATS_METADATA_MISMATCH', stage: 'stats' },
    { options: { results: records(input).map((r, i) => i === 0 ? { ...r, id: undefined, [credential]: credential } : r) }, code: 'RESULT_CORRELATION_MISMATCH', stage: 'results' },
  ];
  for (const scenario of scenarios) {
    mockResponses(input, scenario.options);
    const result = await inspectProfileImport(input, submission(input));
    assert.equal(result.status, 'failed');
    if (result.status !== 'failed') assert.fail('Expected failed receipt');
    assert.equal(result.code, 'IMPORT_VERIFICATION_FAILED');
    assert.equal(result.diagnosticCode, scenario.code);
    assert.equal(result.diagnostic?.stage, scenario.stage);
    assert.ok(!JSON.stringify(result).includes(credential));
    assert.ok(!JSON.stringify(result).includes(input.profiles[0].correlationId));
    assert.ok(!JSON.stringify(result).includes(input.checksumMd5));
    if (scenario.stage === 'results') assert.equal(result.diagnostic?.fieldTypes?.id, 'missing');
  }
});

test('malformed and oversized responses cannot leak upstream content or verify a pack', async () => {
  const input = plan();
  for (const body of [credential, '[1,2]', '{"status":Infinity}', 'x'.repeat(65_537)]) {
    globalThis.fetch = async () => new Response(body);
    const result = await inspectProfileImport(input, submission(input));
    assert.equal(result.status, 'failed');
    assert.ok(!JSON.stringify(result).includes(credential));
  }
  globalThis.fetch = async () => new Response(credential, { headers: { 'content-length': '999999999' } });
  assert.equal((await inspectProfileImport(input, submission(input))).status, 'failed');
  globalThis.fetch = async () => new Response(new Uint8Array([0xff, 0xff]));
  assert.equal((await inspectProfileImport(input, submission(input))).status, 'failed');
  globalThis.fetch = async () => new Response('x'.repeat(65_537), { status: 202 });
  await assert.rejects(submitProfileImport(input), isImportError('UPLOAD_UNCERTAIN', false, true));
});

test('transient GET failures are safely retryable without another upload', async () => {
  const input = plan();
  for (const code of [404, 408, 429, 500, 503]) {
    globalThis.fetch = async (_, init) => { assert.equal(init?.method, 'GET'); return new Response(credential, { status: code }); };
    await assert.rejects(inspectProfileImport(input, submission(input)), isImportError('IMPORT_READ_UNAVAILABLE', true, false));
  }
  globalThis.fetch = async () => { throw new Error(credential); };
  await assert.rejects(inspectProfileImport(input, submission(input)), isImportError('IMPORT_READ_UNAVAILABLE', true, false));
  mockResponses(input);
  assert.equal((await inspectProfileImport(input, submission(input))).status, 'verified');
});

test('one eight-second deadline covers a hung upload and read, even if transport ignores abort', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const input = plan();
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_, init) => { signal = init?.signal as AbortSignal; return new Promise(() => undefined); };
  const upload = submitProfileImport(input);
  const uploadCheck = assert.rejects(upload, isImportError('UPLOAD_UNCERTAIN', false, true));
  t.mock.timers.tick(8_000);
  await uploadCheck;
  assert.equal(signal?.aborted, true);
  const inspection = inspectProfileImport(input, submission(input));
  const readCheck = assert.rejects(inspection, isImportError('IMPORT_READ_TIMEOUT', true, false));
  t.mock.timers.tick(8_000);
  await readCheck;
  assert.equal(signal?.aborted, true);
});

test('deadline includes stalled response body parsing, not only response headers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const input = plan();
  globalThis.fetch = async () => new Response(new ReadableStream({ start() { /* Deliberately never produces bytes. */ } }));
  const inspection = inspectProfileImport(input, submission(input));
  const checked = assert.rejects(inspection, isImportError('IMPORT_READ_TIMEOUT', true, false));
  await Promise.resolve();
  t.mock.timers.tick(8_000);
  await checked;
});

test('a late status response cannot start statistics or result reads after the deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const input = plan();
  let finish!: (response: Response) => void;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Promise<Response>((resolve) => { finish = resolve; });
  };
  const inspection = inspectProfileImport(input, submission(input));
  const checked = assert.rejects(inspection, isImportError('IMPORT_READ_TIMEOUT', true, false));
  t.mock.timers.tick(8_000);
  await checked;
  finish(Response.json(status()));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
});
