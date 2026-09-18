import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GET, POST } from '../../app/api/portal/operator/reset/route';

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
