import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requestReviewerRestart, getReviewerResetStatus, type ProfileImporter } from './reviewer-restart';
import { getPack, packStateKey, PACK_METADATA_TTL_SECONDS, type PackMetadata } from './pack-state';
import { LocalJsonStateStore, type StateStore } from '../state/store';
import { fixtures } from './fixtures';
import { getProfileIdentifier, getFreshProfileIdentifier } from '../auth/profile-identity';
import { createSession } from '../auth/session';
import { getPortalBootstrap, getPortalPersonalizationIdentity, resetReviewerPack, applyPortalAction } from './portal';
import { prepareProfileImport, type ProfileImportPlan, type ProfileImportSubmission, type VerifiedProfileImport, ProfileImportError } from '../udl/profile-import';
import { PortalError } from '../errors';

let directory: string;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'reviewer-restart-'));
  process.env.PORTAL_ENVIRONMENT = 'restart-tests';
  process.env.PORTAL_CONTENT_ADAPTER = 'fixtures';
  process.env.PORTAL_SESSION_SECRET = 'test-only-signing-key-with-more-than-32-characters';
  process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS = '0,1,2,3';
});
after(async () => { await rm(directory, { recursive: true, force: true }); });
const errorCode = (code: string) => (error: unknown) => error instanceof PortalError && error.code === code;
const storeFor = (name: string) => new LocalJsonStateStore(join(directory, name));

function fakeImporter(overrides: Partial<ProfileImporter> = {}) {
  const state = { submissions: 0, inspections: 0, plans: [] as ProfileImportPlan[] };
  const importer: ProfileImporter = {
    assertConfigured() {}, prepareProfileImport,
    async submitProfileImport(plan) {
      state.submissions++; state.plans.push(plan);
      return { batchId: randomUUID(), checksumMd5: plan.checksumMd5, fileSizeBytes: plan.fileSizeBytes };
    },
    async inspectProfileImport(plan, submission) { state.inspections++; return { status: 'verified', receipt: verifiedReceipt(plan, submission) }; },
    ...overrides,
  };
  return { importer, state };
}
function verifiedReceipt(plan: ProfileImportPlan, submission: ProfileImportSubmission): VerifiedProfileImport {
  return { ...submission, counts: { CREATED: 7, UPDATED: 0, FAILED: 0 }, verifiedAt: new Date().toISOString(),
    profiles: plan.profiles.map((profile) => ({ ...profile, profileId: randomUUID() })) };
}
async function intent(store: StateStore, pack = '15') {
  const current = await getPack(store, pack);
  return { reviewerPack: pack, requestId: randomUUID(), expectedRunId: current.value.runId };
}
async function session(pack = '15', agentId = 'maya', now = new Date()) {
  const agent = fixtures.agents.find((candidate) => candidate.id === agentId)!;
  return (await createSession({ reviewerPack: pack, agentId, agencyId: agent.agencyId, username: `${agentId}.${pack}` }, now)).session;
}

test('new restarts activate all seven verified identities atomically beyond the preloaded generation limit', async () => {
  const store = storeFor('unlimited');
  let current = await getPack(store, '15');
  await store.compareAndSet(packStateKey('15'), current.version, { ...current.value, profileGeneration: 3 }, PACK_METADATA_TTL_SECONDS);
  const originalSession = await session('15', 'maya', new Date(Date.now() - 1000));
  const oldIdentity = await getPortalPersonalizationIdentity(originalSession, store);
  assert.equal(oldIdentity?.id, getProfileIdentifier('15', 'maya', 3));
  const { importer, state } = fakeImporter();
  for (const generation of [4, 5, 6]) {
    const request = await intent(store);
    const pending = await requestReviewerRestart(request, { store, importer });
    assert.equal(pending.status, 'pending');
    assert.equal(pending.runId, request.expectedRunId);
    assert.equal((await getPack(store, '15')).value.profileGeneration, generation - 1);
    const complete = await requestReviewerRestart(request, { store, importer });
    assert.equal(complete.status, 'completed');
    assert.equal(complete.profileGeneration, generation);
    assert.notEqual(complete.runId, request.expectedRunId);
    current = await getPack(store, '15');
    assert.equal(Object.keys(current.value.profileSet!.identifiers).length, 7);
    for (const agent of fixtures.agents) {
      const fresh = await session('15', agent.id, new Date(Date.now() + 1));
      const bootstrap = await getPortalBootstrap(fresh, store);
      const expected = current.value.profileSet!.identifiers[agent.id];
      assert.equal(bootstrap.session.profileId, expected);
      assert.equal(bootstrap.udlIdentity?.id, expected);
      assert.equal((await getPortalPersonalizationIdentity(fresh, store))?.id, expected);
    }
    assert.deepEqual(await requestReviewerRestart(request, { store, importer }), complete, 'An acknowledged or lost completion is replayed without another restart');
  }
  assert.equal(state.submissions, 3);
  assert.equal(new Set(state.plans.flatMap((plan) => plan.profiles.map((profile) => profile.identifier))).size, 21);
  await assert.rejects(getPortalBootstrap(originalSession, store), errorCode('UNAUTHENTICATED'));
  const other = await getPack(store, '14');
  assert.equal(other.value.profileGeneration, 0);
  assert.equal(other.value.profileSet, undefined);
});

test('upload failures preserve current saved work, native identity, generation, run and timestamps', async () => {
  const store = storeFor('fail-safe');
  const agentSession = await session();
  const before = await getPortalBootstrap(agentSession, store);
  await applyPortalAction(agentSession, { type: 'toggle-favorite', resourceId: 'home-renewal', expectedVersion: before.session.stateVersion, runId: before.session.runId, idempotencyKey: randomUUID() }, store);
  const initial = (await getPack(store, '15')).value;
  const { importer } = fakeImporter({ async submitProfileImport() { throw new Error('Uncertain upstream error with sensitive body'); } });
  const request = await intent(store);
  const failed = await requestReviewerRestart(request, { store, importer });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.code, 'UPLOAD_UNCERTAIN');
  assert.equal(JSON.stringify(failed).includes('sensitive'), false);
  const after = (await getPack(store, '15')).value;
  for (const field of ['runId', 'profileGeneration', 'createdAt', 'restartedAt'] as const) assert.equal(after[field], initial[field]);
  assert.equal(after.pendingRestart, undefined);
  const bootstrap = await getPortalBootstrap(agentSession, store);
  assert.equal(bootstrap.udlIdentity?.id, before.udlIdentity?.id);
  assert.deepEqual(bootstrap.favorites, ['home-renewal']);
  assert.deepEqual(await requestReviewerRestart(request, { store, importer }), failed);
  const next = await intent(store);
  const good = fakeImporter();
  await requestReviewerRestart(next, { store, importer: good.importer });
  const completed = await requestReviewerRestart(next, { store, importer: good.importer });
  assert.equal(completed.status, 'completed');
  assert.deepEqual(await requestReviewerRestart(request, { store, importer }), failed, 'Older failed request IDs stay failed after later success');
});

test('incomplete, updated, duplicate or mismatched native results never activate a profile set', async () => {
  const corruptions: Array<(receipt: VerifiedProfileImport) => VerifiedProfileImport> = [
    (receipt) => ({ ...receipt, counts: { CREATED: 6, UPDATED: 0, FAILED: 1 } }),
    (receipt) => ({ ...receipt, counts: { CREATED: 6, UPDATED: 1, FAILED: 0 } }),
    (receipt) => ({ ...receipt, checksumMd5: '0'.repeat(32) }),
    (receipt) => ({ ...receipt, fileSizeBytes: receipt.fileSizeBytes + 1 }),
    (receipt) => ({ ...receipt, batchId: randomUUID() }),
    (receipt) => ({ ...receipt, profiles: receipt.profiles.slice(1) }),
    (receipt) => ({ ...receipt, profiles: receipt.profiles.map((profile) => ({ ...profile, profileId: receipt.profiles[0].profileId })) }),
    (receipt) => ({ ...receipt, profiles: receipt.profiles.map(() => ({ ...receipt.profiles[0], profileId: randomUUID() })) }),
  ];
  for (const [index, corrupt] of corruptions.entries()) {
    const store = storeFor(`invalid-${index}`);
    const request = await intent(store);
    const { importer } = fakeImporter({ async inspectProfileImport(plan, submission) { return { status: 'verified', receipt: corrupt(verifiedReceipt(plan, submission)) }; } });
    await requestReviewerRestart(request, { store, importer });
    const failed = await requestReviewerRestart(request, { store, importer });
    assert.equal(failed.status, 'failed');
    assert.equal(failed.code, 'IMPORT_VERIFICATION_FAILED');
    assert.equal((await getPack(store, '15')).value.runId, request.expectedRunId);
  }
});

test('concurrent same-key requests submit once; another request and saved-work reset cannot race activation', async () => {
  const store = storeFor('concurrent');
  const request = await intent(store);
  const { importer, state } = fakeImporter();
  const results = await Promise.all(Array.from({ length: 8 }, () => requestReviewerRestart(request, { store, importer })));
  assert.ok(results.every((result) => result.status === 'pending'));
  assert.equal(state.submissions, 1);
  await assert.rejects(requestReviewerRestart({ ...request, requestId: randomUUID() }, { store, importer }), errorCode('RESTART_PENDING'));
  await assert.rejects(resetReviewerPack('15', 'saved-work', store), errorCode('RESTART_PENDING'));
  const completions = await Promise.all(Array.from({ length: 8 }, () => requestReviewerRestart(request, { store, importer })));
  assert.ok(completions.some((result) => result.status === 'completed'));
  assert.equal((await getPack(store, '15')).value.profileGeneration, 1);
  assert.equal(state.submissions, 1);
  const completed = await requestReviewerRestart(request, { store, importer });
  await resetReviewerPack('15', 'saved-work', store);
  assert.deepEqual(await requestReviewerRestart(request, { store, importer }), completed, 'Saved-work reset cannot erase restart idempotency');
  await assert.rejects(requestReviewerRestart({ ...request, requestId: randomUUID() }, { store, importer }), errorCode('VERSION_CONFLICT'));
});

test('expired uploading lease fails closed after process loss without resending the batch', async () => {
  const local = storeFor('upload-crash');
  const request = await intent(local);
  let now = Date.now();
  let rejectAfterUpload = true;
  const store: StateStore = {
    read: local.read.bind(local),
    async compareAndSet<T>(key: string, version: number | null, value: T, ttl: number) {
      if (rejectAfterUpload && (value as PackMetadata).pendingRestart?.phase === 'verifying') {
        rejectAfterUpload = false; throw new Error('Storage reply lost');
      }
      return local.compareAndSet(key, version, value, ttl);
    },
  };
  const { importer, state } = fakeImporter();
  await assert.rejects(requestReviewerRestart(request, { store, importer, now: () => now }));
  assert.equal(state.submissions, 1);
  assert.equal((await getPack(store, '15')).value.pendingRestart?.phase, 'uploading');
  now += 46_000;
  const failed = await requestReviewerRestart(request, { store, importer, now: () => now });
  assert.equal(failed.code, 'UPLOAD_UNCERTAIN');
  assert.equal(state.submissions, 1);
  assert.equal((await getPack(store, '15')).value.runId, request.expectedRunId);
});

test('safe 429 retries retain the exact plan; transient polling retries never upload twice', async () => {
  const store = storeFor('retry');
  const request = await intent(store);
  let now = Date.now();
  let submissions = 0;
  let inspections = 0;
  const plans: ProfileImportPlan[] = [];
  const { importer } = fakeImporter({
    async submitProfileImport(plan) {
      plans.push(plan); submissions++;
      if (submissions === 1) throw new ProfileImportError('RATE_LIMITED', 'Try later', true, false);
      return { batchId: randomUUID(), checksumMd5: plan.checksumMd5, fileSizeBytes: plan.fileSizeBytes };
    },
    async inspectProfileImport(plan, submission) {
      inspections++;
      if (inspections === 1) throw new ProfileImportError('TEMPORARY_READ', 'Try later', true, false);
      return { status: 'verified', receipt: verifiedReceipt(plan, submission) };
    },
  });
  const first = await requestReviewerRestart(request, { store, importer, now: () => now });
  assert.equal(first.phase, 'preparing');
  now += 4000;
  await requestReviewerRestart(request, { store, importer, now: () => now });
  assert.deepEqual(plans[0], plans[1]);
  await requestReviewerRestart(request, { store, importer, now: () => now });
  now += 4000;
  const complete = await requestReviewerRestart(request, { store, importer, now: () => now });
  assert.equal(complete.status, 'completed');
  assert.equal(submissions, 2);
  assert.equal(inspections, 2);
});

test('legacy identity mappings stay unchanged and fresh scopes/sets cannot collide across hosts', () => {
  const set = randomUUID();
  const scopes = ['lm-portal:v1:production', 'lm-portal:v1:preview'];
  const ids = scopes.flatMap((scope) => fixtures.agents.map((agent) => getFreshProfileIdentifier(scope, set, '15', agent.id)));
  assert.equal(new Set(ids).size, 14);
  assert.notEqual(getFreshProfileIdentifier(scopes[0], set, '15', 'maya'), getFreshProfileIdentifier(scopes[0], randomUUID(), '15', 'maya'));
  assert.notEqual(ids[0], getProfileIdentifier('15', fixtures.agents[0].id, 0));
});

test('operator status exposes only sanitized receipts and preserves all historical request outcomes', async () => {
  const store = storeFor('status');
  const request = await intent(store);
  const { importer } = fakeImporter();
  await requestReviewerRestart(request, { store, importer });
  const pending = await getReviewerResetStatus('15', request.requestId, store);
  assert.equal(pending.operation?.status, 'pending');
  assert.ok(pending.operation?.profileSetId);
  assert.ok(pending.operation?.batchId);
  assert.equal(pending.operation?.profiles.length, 7);
  const serialized = JSON.stringify(pending);
  for (const privateField of ['payload', 'submission', 'lease', 'apiKey', 'authorization']) assert.equal(serialized.includes(privateField), false);
  const complete = await requestReviewerRestart(request, { store, importer });
  assert.deepEqual(complete.counts, { CREATED: 7, UPDATED: 0, FAILED: 0 });
  assert.equal(complete.profiles.filter((profile) => profile.profileId).length, 7);
  assert.deepEqual((await getReviewerResetStatus('15', request.requestId, store)).operation, complete);
  const second = await intent(store);
  await requestReviewerRestart(second, { store, importer });
  await requestReviewerRestart(second, { store, importer });
  assert.deepEqual((await getReviewerResetStatus('15', request.requestId, store)).operation, complete);
  await assert.rejects(requestReviewerRestart({ ...request, expectedRunId: randomUUID() }, { store, importer }), errorCode('IDEMPOTENCY_CONFLICT'));
});

test('missing import configuration fails before reserving or changing the active pack', async () => {
  const store = storeFor('configuration');
  const request = await intent(store);
  const before = await getPack(store, '15');
  const { importer } = fakeImporter({ assertConfigured() { throw new ProfileImportError('IMPORT_NOT_CONFIGURED', 'Sensitive configuration detail'); } });
  await assert.rejects(requestReviewerRestart(request, { store, importer }), errorCode('CONFIGURATION_REQUIRED'));
  assert.deepEqual(await getPack(store, '15'), before);
});

test('restart invalidates sessions issued in the exact activation millisecond', async () => {
  const store = storeFor('timestamp-boundary');
  const request = await intent(store);
  const { importer } = fakeImporter();
  const timestamp = Date.now();
  const stale = await session('15', 'maya', new Date(timestamp));
  await requestReviewerRestart(request, { store, importer, now: () => timestamp });
  await requestReviewerRestart(request, { store, importer, now: () => timestamp });
  await assert.rejects(getPortalBootstrap(stale, store), errorCode('UNAUTHENTICATED'));
  assert.ok(await getPortalBootstrap(await session('15', 'maya', new Date(timestamp + 1)), store));
});

test('permanent inspection errors terminate safely with operator audit metadata retained', async () => {
  const store = storeFor('permanent-read-error');
  const request = await intent(store);
  const { importer } = fakeImporter({ async inspectProfileImport() { throw new ProfileImportError('IMPORT_REQUEST_REJECTED', 'Private upstream body', false, false); } });
  await requestReviewerRestart(request, { store, importer });
  const failed = await requestReviewerRestart(request, { store, importer });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.code, 'IMPORT_VERIFICATION_FAILED');
  assert.ok(failed.profileSetId && failed.batchId && failed.checksumMd5 && failed.fileSizeBytes);
  assert.equal(failed.profiles.length, 7);
  assert.equal(JSON.stringify(failed).includes('Private upstream'), false);
  assert.equal((await getPack(store, '15')).value.runId, request.expectedRunId);
});

test('a lost activation response is recovered from the committed receipt without a second restart', async () => {
  const local = storeFor('activation-response-loss');
  const request = await intent(local);
  let dropReceipt = true;
  const store: StateStore = {
    read: local.read.bind(local),
    async compareAndSet<T>(key: string, version: number | null, value: T, ttl: number) {
      const result = await local.compareAndSet(key, version, value, ttl);
      if (result && dropReceipt && (value as PackMetadata).restartReceipts?.[request.requestId]?.status === 'completed') {
        dropReceipt = false;
        throw new Error('Activation committed; response lost');
      }
      return result;
    },
  };
  const { importer, state } = fakeImporter();
  await requestReviewerRestart(request, { store, importer });
  await assert.rejects(requestReviewerRestart(request, { store, importer }));
  const committed = await getPack(store, '15');
  const recovered = await requestReviewerRestart(request, { store, importer });
  assert.equal(recovered.status, 'completed');
  assert.equal(recovered.runId, committed.value.runId);
  assert.equal(recovered.profileGeneration, 1);
  assert.equal(state.submissions, 1);
  assert.equal(state.inspections, 1);
  await resetReviewerPack('15', 'saved-work', store);
  const reset = await getPack(store, '15');
  assert.deepEqual(reset.value.profileSet, committed.value.profileSet, 'Saved-work reset retains the verified native profile set');
  assert.deepEqual(reset.value.restartReceipts, committed.value.restartReceipts);
});
