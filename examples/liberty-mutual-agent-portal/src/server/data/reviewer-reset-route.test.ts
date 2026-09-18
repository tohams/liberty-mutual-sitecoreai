import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GET, POST } from '../../app/api/portal/operator/reset/route';
import { getStateStore, stateNamespace } from '../state/store';
import { getPack, packStateKey, type RestartReceipt } from './pack-state';
import { prepareProfileImport } from '../udl/profile-import';

let directory: string;
let previous: Record<string, string | undefined>;
const origin = 'https://portal.example';
const secret = 'operator-route-test-secret-at-least-32-characters';
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'reviewer-reset-route-'));
  const environment = {
    NODE_ENV: 'test', PORTAL_ENVIRONMENT: 'reset-route-tests', PORTAL_STATE_ADAPTER: 'local-json',
    PORTAL_LOCAL_STATE_DIRECTORY: directory, VERCEL: '', PORTAL_REDIS_REST_URL: '', PORTAL_REDIS_REST_TOKEN: '',
    KV_REST_API_URL: '', KV_REST_API_TOKEN: '', PORTAL_OPERATOR_SECRET: secret,
    SITECORE_PROFILE_IMPORT_URL: '', SITECORE_PROFILE_IMPORT_API_KEY: '',
  };
  previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
});
after(async () => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await rm(directory, { recursive: true, force: true });
});
const auth = { Authorization: `Bearer ${secret}` };
const statusRequest = () => new Request(`${origin}/api/portal/operator/reset?reviewerPack=15`, { headers: auth });
const postRequest = (body: unknown) => new Request(`${origin}/api/portal/operator/reset`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
});

test('operator status requires authorization and refuses cross-origin calls', async () => {
  const denied = await GET(new Request(`${origin}/api/portal/operator/reset?reviewerPack=15`));
  assert.equal(denied.status, 403);
  const crossOrigin = await GET(new Request(`${origin}/api/portal/operator/reset?reviewerPack=15`, { headers: { ...auth, Origin: 'https://other.example' } }));
  assert.equal(crossOrigin.status, 403);
  const status = await GET(statusRequest());
  assert.equal(status.status, 200);
  assert.match(status.headers.get('cache-control') ?? '', /no-store/);
  const body = await status.json();
  assert.equal(body.reviewerPack, '15');
  assert.equal(body.profileGeneration, 0);
  assert.equal(body.pendingRestart, null);
  assert.equal(JSON.stringify(body).includes(secret), false);
});

test('restart route requires explicit intent and fails safely without native import configuration', async () => {
  const before = await (await GET(statusRequest())).json();
  const missingIntent = await POST(postRequest({ reviewerPack: '15', mode: 'restart' }));
  assert.equal(missingIntent.status, 400);
  const unconfigured = await POST(postRequest({ reviewerPack: '15', mode: 'restart', requestId: randomUUID(), expectedRunId: before.runId }));
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).error.code, 'CONFIGURATION_REQUIRED');
  const after = await (await GET(statusRequest())).json();
  assert.deepEqual(after, before);
});

test('saved-work route preserves its existing simple request and native profile generation', async () => {
  const before = await (await GET(statusRequest())).json();
  const response = await POST(postRequest({ reviewerPack: '15', mode: 'saved-work' }));
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.notEqual(receipt.runId, before.runId);
  assert.equal(receipt.profileGeneration, before.profileGeneration);
  assert.equal(receipt.clearBrowserIdentity, false);
});

test('protected diagnostic GET stays read-only; explicit resume verifies the known batch without uploading', async () => {
  const store = getStateStore();
  const current = await getPack(store, '15');
  const requestId = randomUUID();
  const plan = prepareProfileImport({ reviewerPack: '15', generation: current.value.profileGeneration + 1, profileSetId: randomUUID(), identityScope: stateNamespace() });
  const batchId = randomUUID();
  const receipt: RestartReceipt = {
    reviewerPack: '15', mode: 'restart', requestId, expectedRunId: current.value.runId, status: 'failed', phase: 'failed',
    code: 'IMPORT_VERIFICATION_FAILED', runId: current.value.runId, profileGeneration: current.value.profileGeneration,
    targetGeneration: plan.generation, clearBrowserIdentity: false, profileSetId: plan.profileSetId, identityScope: plan.identityScope,
    checksumMd5: plan.checksumMd5, fileSizeBytes: plan.fileSizeBytes, batchId, profiles: plan.profiles,
  };
  await store.compareAndSet(packStateKey('15'), current.version, { ...current.value, restartReceipts: { [requestId]: receipt } }, null);
  const before = await getPack(store, '15');
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SITECORE_PROFILE_IMPORT_URL;
  const originalKey = process.env.SITECORE_PROFILE_IMPORT_API_KEY;
  const methods: string[] = [];
  process.env.SITECORE_PROFILE_IMPORT_URL = 'https://profile-import.sitecorecloud.io/v1/batches';
  process.env.SITECORE_PROFILE_IMPORT_API_KEY = 'synthetic-private-test-key';
  globalThis.fetch = async (input, init) => {
    methods.push(init?.method ?? 'GET');
    const url = String(input);
    if (url.endsWith('/status')) return Response.json({ batchId, status: 'COMPLETED', totalRecords: 7, succeededRecords: 7, failedRecords: 0 });
    if (url.endsWith('/stats')) return Response.json({ batchId, status: 'COMPLETED', checksumMd5: plan.checksumMd5, fileSizeBytes: plan.fileSizeBytes,
      totalRecords: 7, succeededRecords: 7, createdRecords: 7, updatedRecords: 0, failedRecords: 0 });
    assert.ok(url.endsWith('/results'));
    return new Response(plan.profiles.map((profile, recordIndex) => JSON.stringify({ recordIndex, id: profile.correlationId,
      recordType: 'profile', outcome: 'CREATED', profileId: randomUUID() })).join('\n'));
  };
  try {
    const path = `${origin}/api/portal/operator/reset?reviewerPack=15&requestId=${requestId}&inspectImport=true`;
    assert.equal((await GET(new Request(path))).status, 403);
    const diagnostic = await GET(new Request(path, { headers: auth }));
    assert.equal(diagnostic.status, 200);
    const diagnosis = await diagnostic.json();
    assert.equal(diagnosis.inspection.status, 'verified');
    assert.equal(diagnosis.canResume, true);
    assert.equal(JSON.stringify(diagnosis).includes('synthetic-private-test-key'), false);
    assert.deepEqual(await getPack(store, '15'), before);
    const malformed = await POST(postRequest({ reviewerPack: '15', mode: 'restart', requestId, expectedRunId: current.value.runId, resumeVerification: 'true' }));
    assert.equal(malformed.status, 400);
    const result = await POST(postRequest({ reviewerPack: '15', mode: 'restart', requestId, expectedRunId: current.value.runId, resumeVerification: true }));
    assert.equal(result.status, 200);
    const completed = await result.json();
    assert.equal(completed.status, 'completed');
    assert.equal(completed.batchId, batchId);
    assert.equal(completed.profileGeneration, plan.generation);
    assert.ok(methods.length >= 6 && methods.every((method) => method === 'GET'), 'All native requests are read-only, including recovery');
    const replay = await POST(postRequest({ reviewerPack: '15', mode: 'restart', requestId, expectedRunId: current.value.runId }));
    assert.deepEqual(await replay.json(), completed);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SITECORE_PROFILE_IMPORT_URL; else process.env.SITECORE_PROFILE_IMPORT_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SITECORE_PROFILE_IMPORT_API_KEY; else process.env.SITECORE_PROFILE_IMPORT_API_KEY = originalKey;
  }
});

test('persistence migration remains operator-only and neither resets a pack nor accesses native services', async (context) => {
  const before = await (await GET(statusRequest())).json();
  const unauthorized = await POST(new Request(`${origin}/api/portal/operator/reset`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'persist-workspace', reviewerPack: '15' }) }));
  assert.equal(unauthorized.status, 403);
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('Migration must not call native services.'); });
  const response = await POST(postRequest({ mode: 'persist-workspace', reviewerPack: '15' }));
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.equal(receipt.mode, 'persist-workspace');
  assert.equal(receipt.runId, before.runId);
  assert.equal(receipt.profileGeneration, before.profileGeneration);
  assert.ok(receipt.records.every((record: { before: { version: number; valueHash: string }; after: { version: number; valueHash: string; expiresAt: null } }) =>
    record.before.version === record.after.version && record.before.valueHash === record.after.valueHash && record.after.expiresAt === null));
  assert.equal(JSON.stringify(receipt).includes(secret), false);
  assert.deepEqual(await (await GET(statusRequest())).json(), before);
});
