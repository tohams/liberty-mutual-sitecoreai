import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { applyPortalAction, getEditorBootstrap, getPolicyDocument, getPortalBootstrap, getPortalPersonalizationIdentity, resetReviewerPack } from './portal';
import { fixtures, validateFixtures } from './fixtures';
import { getPack, packStateKey, PACK_METADATA_TTL_SECONDS, type PackMetadata } from './pack-state';
import { LocalJsonStateStore, stateNamespace, type StateStore } from '../state/store';
import { createSession, verifySession } from '../auth/session';
import { authenticate } from '../auth/credentials';
import logins from '../../../fixtures/portal-logins.json';
import runtimeCredentials from '../../../fixtures/portal-credentials.json';
import { requireSameOrigin, readJson } from '../http';
import { PortalError } from '../errors';
import type { PortalAction, PortalBootstrap } from '../../contracts/portal';

let directory: string;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'liberty-portal-test-'));
  process.env.PORTAL_ENVIRONMENT = 'automated-tests';
  process.env.PORTAL_CONTENT_ADAPTER = 'fixtures';
  process.env.PORTAL_SESSION_SECRET = 'test-only-signing-key-with-more-than-32-characters';
  process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS = '0,1,2,3';
});
after(async () => { await rm(directory, { recursive: true, force: true }); });

async function login(agentId: string, pack = '01') {
  const agent = fixtures.agents.find((entry) => entry.id === agentId)!;
  return (await createSession({ agentId, agencyId: agent.agencyId, reviewerPack: pack, username: `${agentId}.${pack}` })).session;
}
const errorCode = (code: string) => (error: unknown) => error instanceof PortalError && error.code === code;
const requestMetadata = (bootstrap: PortalBootstrap) => ({ expectedVersion: bootstrap.session.stateVersion, runId: bootstrap.session.runId, idempotencyKey: randomUUID() });

test('session signatures reject tampering and expire after eight hours', async () => {
  const now = new Date('2026-09-10T12:00:00Z');
  const { token } = await createSession({ agentId: 'maya', agencyId: 'cedar-ridge', reviewerPack: '01', username: 'maya.01' }, now);
  assert.equal((await verifySession(token, now))?.agentId, 'maya');
  const parts = token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ agentId: 'elena' })).toString('base64url');
  assert.equal(await verifySession(parts.join('.'), now), null);
  assert.equal(await verifySession(token, new Date('2026-09-10T20:00:00Z')), null);
});

test('personalization identity reads only pack metadata and honors verified generation, restart and agent scope without a pack age limit', async () => {
  const session = await login('maya');
  const keys: string[] = [];
  const metadata = { runId: 'identity-test', profileGeneration: 0, createdAt: Date.now(), restartedAt: 0 };
  const store: StateStore = {
    read: async <T>(key: string) => { keys.push(key); return { value: metadata as T, version: 0, expiresAt: Date.now() + 10000 }; },
    compareAndSet: async () => { throw new Error('Identity resolution must not hydrate agency state'); },
  };
  const identity = await getPortalPersonalizationIdentity(session, store);
  assert.equal(identity?.provider, 'liberty-mutual-agent');
  assert.deepEqual(keys, [`${stateNamespace()}:pack:01`]);
  metadata.profileGeneration = 999;
  assert.equal(await getPortalPersonalizationIdentity(session, store), null);
  metadata.profileGeneration = 0;
  metadata.restartedAt = Date.parse(session.issuedAt) + 1000;
  await assert.rejects(getPortalPersonalizationIdentity(session, store), errorCode('UNAUTHENTICATED'));
  metadata.restartedAt = 0;
  metadata.createdAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
  assert.deepEqual(await getPortalPersonalizationIdentity(session, store), identity, 'Pack age must not expire a valid native identity');
  await assert.rejects(getPortalPersonalizationIdentity({ ...session, agencyId: 'wrong-agency' }, store), errorCode('UNAUTHENTICATED'));
});

test('all 105 reviewer logins authenticate and establish sessions in their assigned packs', async () => {
  const expectedPacks = Array.from({ length: 15 }, (_, index) => String(index + 1).padStart(2, '0'));
  assert.deepEqual(fixtures.manifest.reviewerPacks, expectedPacks);
  assert.equal(logins.logins.length, 105);
  assert.equal(runtimeCredentials.logins.length, 105);
  assert.equal(new Set(runtimeCredentials.logins.map((entry) => entry.salt)).size, 105, 'Each credential keeps its independent salt');
  const usernames = new Set<string>();
  for (const pack of expectedPacks) {
    const packLogins = logins.logins.filter((entry) => entry.reviewerPack === pack);
    assert.deepEqual(packLogins.map((entry) => entry.agentId).sort(), fixtures.agents.map((agent) => agent.id).sort());
    for (const source of packLogins) {
      assert.equal(source.username, `${source.agentId}.${pack}`);
      assert.equal(source.password, 'Sitecore');
      assert.equal(source.enabled, true);
      assert.equal(usernames.has(source.username), false, 'Reviewer usernames must be unique');
      usernames.add(source.username);
      const identity = await authenticate(source.username, source.password);
      assert.ok(identity, `${source.username} must authenticate`);
      assert.equal(identity.agentId, source.agentId);
      assert.equal(identity.reviewerPack, pack);
      assert.equal(identity.agencyId, fixtures.agents.find((agent) => agent.id === source.agentId)!.agencyId);
      const { token } = await createSession(identity);
      const session = await verifySession(token);
      assert.equal(session?.username, source.username, `${source.username} session must survive verification`);
      assert.equal(session?.reviewerPack, pack);
    }
  }
  assert.equal(await authenticate('maya.15', 'incorrect-password'), null);
  assert.equal(await authenticate('unknown.15', 'Sitecore'), null);
});

test('unconfigured and malformed reviewer packs are rejected by authentication, sessions, and resets', async () => {
  const store = new LocalJsonStateStore(join(directory, 'invalid-packs'));
  for (const pack of ['00', '16', '1', '015', '99', '']) {
    assert.equal(await authenticate(`daniel.${pack}`, 'Sitecore'), null);
    const { token, session } = await createSession({ agentId: 'daniel', agencyId: 'cedar-ridge', reviewerPack: pack, username: `daniel.${pack}` });
    assert.equal(await verifySession(token), null, `Pack ${JSON.stringify(pack)} must not verify`);
    await assert.rejects(getPortalBootstrap(session, store), errorCode('UNAUTHENTICATED'));
    await assert.rejects(resetReviewerPack(pack, 'saved-work', store), errorCode('INVALID_INPUT'));
  }
});

test('fixture relationships, dates, and aggregate money are validated', () => {
  validateFixtures(fixtures);
  const broken = structuredClone(fixtures);
  broken.policies[0].agencyId = 'summit-specialty';
  assert.throws(() => validateFixtures(broken), /relationship/);
  const invalidDate = structuredClone(fixtures);
  invalidDate.policies[0].expirationDate = '2020-01-01';
  assert.throws(() => validateFixtures(invalidDate), /dates/);
});

test('agency ownership and agent specialization are enforced at reads and mutations', async () => {
  const store = new LocalJsonStateStore(join(directory, 'isolation'));
  const maya = await login('maya');
  const bootstrap = await getPortalBootstrap(maya, store);
  assert.ok(bootstrap.policies.every((policy) => policy.agencyId === 'cedar-ridge' && policy.line === 'personal'));
  assert.equal(bootstrap.submissions.length, 0);
  assert.equal(bootstrap.bondRequests.length, 0);
  await assert.rejects(getPolicyDocument(maya, 'pol-012', 'pol-012-summary', store), errorCode('NOT_FOUND'));
  await assert.rejects(applyPortalAction(maya, { type: 'save-follow-up', policyId: 'pol-012', title: 'Wrong agency', dueDate: '2026-09-20', ...requestMetadata(bootstrap) }, store), errorCode('NOT_FOUND'));
  await assert.rejects(applyPortalAction(maya, { type: 'submit-submission', submissionId: 'sub-001', ...requestMetadata(bootstrap) }, store), errorCode('FORBIDDEN'));
});

test('saved actions survive a new store instance; retries are idempotent and packs are isolated', async () => {
  const storePath = join(directory, 'persistence');
  const store = new LocalJsonStateStore(storePath);
  const maya = await login('maya');
  const bootstrap = await getPortalBootstrap(maya, store);
  const action: PortalAction = { type: 'save-follow-up', policyId: 'pol-001', title: 'Confirm household updates', dueDate: '2026-09-22', notes: 'Review the vehicle changes', ...requestMetadata(bootstrap) };
  const saved = await applyPortalAction(maya, action, store);
  const again = await applyPortalAction(maya, action, new LocalJsonStateStore(storePath));
  assert.equal(again.session.stateVersion, saved.session.stateVersion);
  assert.equal(again.tasks.filter((task) => task.title === action.title).length, 1);
  const packTwo = await getPortalBootstrap(await login('maya', '02'), store);
  assert.equal(packTwo.tasks.filter((task) => task.title === action.title).length, 0);
  assert.notEqual(packTwo.udlIdentity?.id, saved.udlIdentity?.id);
  await assert.rejects(applyPortalAction(maya, { ...action, title: 'Changed payload' }, store), errorCode('DUPLICATE_REQUEST'));
});

test('an older pack preserves saved work and renews only agency retention when an action is saved', async () => {
  const store = new LocalJsonStateStore(join(directory, 'old-pack-active-work'));
  const maya = await login('maya');
  const initial = await getPortalBootstrap(maya, store);
  const saved = await applyPortalAction(maya, { type: 'toggle-favorite', resourceId: 'home-renewal', ...requestMetadata(initial) }, store);
  const current = await getPack(store, '01');
  await store.compareAndSet(packStateKey('01'), current.version, {
    ...current.value, createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  }, PACK_METADATA_TTL_SECONDS);
  const metadata = await getPack(store, '01');
  const key = `${stateNamespace()}:pack:01:run:${metadata.value.runId}:agency:cedar-ridge`;
  const before = await store.read(key);
  assert.ok(before);
  const reopened = await getPortalBootstrap(maya, store);
  assert.deepEqual(reopened.favorites, saved.favorites);
  assert.equal(reopened.session.runId, saved.session.runId);
  assert.equal(reopened.session.profileGeneration, saved.session.profileGeneration);
  assert.deepEqual(reopened.udlIdentity, saved.udlIdentity);
  assert.deepEqual(await store.read(key), before, 'Opening existing work does not change its version or TTL');
  assert.deepEqual(await getPack(store, '01'), metadata, 'Opening an old pack does not restart it');
  const beforeSave = Date.now();
  const updated = await applyPortalAction(maya, { type: 'register-learning', courseId: 'household-review', ...requestMetadata(reopened) }, store);
  const after = await store.read(key);
  assert.ok(after);
  assert.ok(updated.registrations.includes('household-review'));
  assert.deepEqual(updated.favorites, saved.favorites);
  assert.equal(after.version, before.version + 1);
  assert.ok(after.expiresAt >= beforeSave + 7 * 24 * 60 * 60 * 1000);
  assert.ok(after.expiresAt <= Date.now() + 7 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await getPack(store, '01'), metadata, 'Saving work preserves native profile metadata');
});

test('expired agency work returns to its baseline without changing the run or verified native profile set', async () => {
  const store = new LocalJsonStateStore(join(directory, 'old-pack-expired-work'));
  const maya = await login('maya');
  const initial = await getPortalBootstrap(maya, store);
  const saved = await applyPortalAction(maya, { type: 'toggle-favorite', resourceId: 'home-renewal', ...requestMetadata(initial) }, store);
  assert.equal(saved.favorites.length, 1);
  const current = await getPack(store, '01');
  const profiles = fixtures.agents.map((agent) => ({ agentId: agent.id, identifier: `verified-native-${agent.id}`,
    correlationId: randomUUID(), profileId: randomUUID() }));
  const value: PackMetadata = { ...current.value, createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    profileGeneration: 9, profileSet: { version: 2, id: randomUUID(), identityScope: stateNamespace(),
      identifiers: Object.fromEntries(profiles.map((profile) => [profile.agentId, profile.identifier])),
      verification: { batchId: randomUUID(), checksumMd5: 'a'.repeat(32), fileSizeBytes: 1000,
        counts: { CREATED: 7, UPDATED: 0, FAILED: 0 }, profiles, verifiedAt: new Date().toISOString() } } };
  await store.compareAndSet(packStateKey('01'), current.version, value, PACK_METADATA_TTL_SECONDS);
  const metadata = await getPack(store, '01');
  const key = `${stateNamespace()}:pack:01:run:${metadata.value.runId}:agency:cedar-ridge`;
  const agency = await store.read(key);
  assert.ok(agency);
  await store.compareAndSet(key, agency.version, agency.value, -1);
  assert.equal(await store.read(key), null, 'Simulate an agency key already expired by the state store');
  const beforeRestore = Date.now();
  const reopened = await Promise.all([getPortalBootstrap(maya, store), getPortalBootstrap(maya, store)]);
  for (const workspace of reopened) {
    assert.deepEqual(workspace.favorites, []);
    assert.equal(workspace.session.stateVersion, 0);
    assert.equal(workspace.session.runId, metadata.value.runId);
    assert.equal(workspace.session.profileGeneration, 9);
    assert.equal(workspace.udlIdentity?.id, 'verified-native-maya');
  }
  const restored = await store.read(key);
  assert.ok(restored && restored.expiresAt >= beforeRestore + 7 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await getPack(store, '01'), metadata, 'Restoring expired agency fixtures never resets native profiles or pack metadata');
});

test('new two-digit packs isolate saved work and resets from existing and neighboring packs', async () => {
  const storePath = join(directory, 'fifteen-pack-isolation');
  const store = new LocalJsonStateStore(storePath);
  const sessions = await Promise.all(['01', '10', '14', '15'].map((pack) => login('maya', pack)));
  const original = await Promise.all(sessions.map((session) => getPortalBootstrap(session, store)));
  assert.equal(new Set(original.map((bootstrap) => bootstrap.udlIdentity?.id)).size, sessions.length);
  const saved = await applyPortalAction(sessions[3], {
    type: 'save-follow-up', policyId: 'pol-001', title: 'Pack 15 attendee follow-up', dueDate: '2026-09-22',
    ...requestMetadata(original[3]),
  }, store);
  const persisted = await getPortalBootstrap(sessions[3], new LocalJsonStateStore(storePath));
  assert.ok(persisted.tasks.some((task) => task.title === 'Pack 15 attendee follow-up'));
  for (const [index, session] of sessions.slice(0, 3).entries()) {
    const untouched = await getPortalBootstrap(session, store);
    assert.equal(untouched.tasks.some((task) => task.title === 'Pack 15 attendee follow-up'), false);
    assert.equal(untouched.session.runId, original[index].session.runId);
  }
  await resetReviewerPack('15', 'saved-work', store);
  const cleared = await getPortalBootstrap(sessions[3], store);
  assert.equal(cleared.tasks.some((task) => task.title === 'Pack 15 attendee follow-up'), false);
  assert.equal(cleared.udlIdentity?.id, saved.udlIdentity?.id, 'Saved-work reset preserves the native identity');
  for (const [index, session] of sessions.slice(0, 3).entries()) {
    const untouched = await getPortalBootstrap(session, store);
    assert.equal(untouched.session.runId, original[index].session.runId);
    assert.equal(untouched.udlIdentity?.id, original[index].udlIdentity?.id);
  }
});

test('concurrent updates cannot lose work and stale tabs cannot restore a reset run', async () => {
  const store = new LocalJsonStateStore(join(directory, 'concurrency'));
  const maya = await login('maya');
  const bootstrap = await getPortalBootstrap(maya, store);
  const action = { type: 'toggle-favorite' as const, resourceId: 'home-renewal', ...requestMetadata(bootstrap) };
  const results = await Promise.allSettled([applyPortalAction(maya, action, store), applyPortalAction(maya, { ...action, resourceId: 'auto-review', idempotencyKey: randomUUID() }, store)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const beforeReset = await getPortalBootstrap(maya, store);
  await resetReviewerPack('01', 'saved-work', store);
  const afterReset = await getPortalBootstrap(maya, store);
  assert.equal(afterReset.favorites.length, 0);
  assert.equal(afterReset.udlIdentity?.id, beforeReset.udlIdentity?.id);
  assert.notEqual(afterReset.session.runId, beforeReset.session.runId);
  await assert.rejects(applyPortalAction(maya, action, store), errorCode('WORKSPACE_RESET'));
});

test('submission preparation enforces required information and transitions once', async () => {
  const store = new LocalJsonStateStore(join(directory, 'submission'));
  const daniel = await login('daniel');
  let bootstrap = await getPortalBootstrap(daniel, store);
  await assert.rejects(applyPortalAction(daniel, { type: 'submit-submission', submissionId: 'sub-003', ...requestMetadata(bootstrap) }, store), errorCode('MISSING_REQUIREMENTS'));
  bootstrap = await applyPortalAction(daniel, { type: 'complete-requirement', submissionId: 'sub-003', requirement: 'Three-year loss history', ...requestMetadata(bootstrap) }, store);
  bootstrap = await applyPortalAction(daniel, { type: 'submit-submission', submissionId: 'sub-003', ...requestMetadata(bootstrap) }, store);
  assert.equal(bootstrap.submissions.find((submission) => submission.id === 'sub-003')?.status, 'Submitted');
  await assert.rejects(applyPortalAction(daniel, { type: 'submit-submission', submissionId: 'sub-003', ...requestMetadata(bootstrap) }, store), errorCode('INVALID_TRANSITION'));
});

test('editor fixtures carry no native identity and CSRF/body size boundaries reject hostile requests', async () => {
  const editor = getEditorBootstrap();
  assert.equal(editor.udlIdentity, null);
  assert.equal(editor.session.profileId, '');
  assert.throws(() => requireSameOrigin(new Request('https://portal.example/api/portal/actions', { method: 'POST', headers: { Origin: 'https://attacker.example' } })), errorCode('INVALID_ORIGIN'));
  await assert.rejects(readJson(new Request('https://portal.example/api/portal/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'x'.repeat(20000) }) })), errorCode('REQUEST_TOO_LARGE'));
});

test('legacy resets cannot advance to an unverified profile set implicitly', async () => {
  const store = new LocalJsonStateStore(join(directory, 'restart-explicit'));
  const session = await login('maya');
  const before = await getPortalBootstrap(session, store);
  await assert.rejects(resetReviewerPack('01', 'restart', store), errorCode('INVALID_INPUT'));
  const after = await getPortalBootstrap(session, store);
  assert.equal(after.session.runId, before.session.runId);
  assert.equal(after.udlIdentity?.id, before.udlIdentity?.id);
});

test('surety, service requests, and learning actions create scoped durable work', async () => {
  const store = new LocalJsonStateStore(join(directory, 'representative-flows'));
  const marcus = await login('marcus');
  let surety = await getPortalBootstrap(marcus, store);
  surety = await applyPortalAction(marcus, { type: 'submit-bond-request', bondRequestId: 'bond-001', ...requestMetadata(surety) }, store);
  assert.equal(surety.bondRequests.find((bond) => bond.id === 'bond-001')?.status, 'In review');
  const maya = await login('maya');
  let workspace = await getPortalBootstrap(maya, store);
  workspace = await applyPortalAction(maya, { type: 'create-service-request', policyId: 'pol-001', requestType: 'Policy change', notes: 'Review the vehicle schedule', ...requestMetadata(workspace) }, store);
  assert.ok(workspace.tasks.some((task) => task.kind === 'service' && task.title.includes('Policy change')));
  workspace = await applyPortalAction(maya, { type: 'register-learning', courseId: 'household-review', ...requestMetadata(workspace) }, store);
  assert.ok(workspace.registrations.includes('household-review'));
  const jordan = await getPortalBootstrap(await login('jordan'), store);
  assert.equal(jordan.registrations.includes('household-review'), false);
});

test('a new commercial draft retains its owner through principal edits and reaches submission after preparation', async () => {
  const store = new LocalJsonStateStore(join(directory, 'new-draft'));
  const jordan = await login('jordan');
  let workspace = await getPortalBootstrap(jordan, store);
  const draft = { type: 'save-submission' as const, accountName: 'Canyon Design Studio', productId: 'bop', state: 'TX' as const, industry: 'Professional services', effectiveDate: '2026-10-01', employeeCount: 7, annualRevenueCents: 85000000, notes: 'Single office location' };
  workspace = await applyPortalAction(jordan, { ...draft, ...requestMetadata(workspace) }, store);
  const created = workspace.submissions.find((submission) => submission.accountName === draft.accountName)!;
  assert.ok(created);
  assert.ok(workspace.tasks.some((task) => task.href === `/submissions/${created.id}`));
  const principal = await login('avery');
  let principalWorkspace = await getPortalBootstrap(principal, store);
  principalWorkspace = await applyPortalAction(principal, { ...draft, submissionId: created.id, notes: 'Agency principal reviewed the operations', ...requestMetadata(principalWorkspace) }, store);
  assert.equal(principalWorkspace.submissions.find((submission) => submission.id === created.id)?.assignedAgentId, 'jordan');
  workspace = await getPortalBootstrap(jordan, store);
  for (const requirement of created.requirements) workspace = await applyPortalAction(jordan, { type: 'complete-requirement', submissionId: created.id, requirement, ...requestMetadata(workspace) }, store);
  workspace = await applyPortalAction(jordan, { type: 'submit-submission', submissionId: created.id, ...requestMetadata(workspace) }, store);
  assert.equal(workspace.submissions.find((submission) => submission.id === created.id)?.status, 'Submitted');
  assert.equal(workspace.tasks.find((task) => task.href === `/submissions/${created.id}`)?.status, 'Completed');
});


test('growth conversation requests persist once, remain agency scoped and reset with saved work', async () => {
  const storePath = join(directory, 'growth-conversation');
  const store = new LocalJsonStateStore(storePath);
  const jordan = await login('jordan');
  const baseline = await getPortalBootstrap(jordan, store);
  const topic = 'Discuss a focused small-business growth plan and account preparation.';
  const action: PortalAction = { type: 'request-contact', contactId: 'contact-lee', topic, ...requestMetadata(baseline) };
  const saved = await applyPortalAction(jordan, action, store);
  const restored = await applyPortalAction(jordan, action, new LocalJsonStateStore(storePath));
  assert.equal(restored.tasks.filter(task => task.description === topic).length, 1);
  assert.equal(restored.session.stateVersion, saved.session.stateVersion);
  const task = restored.tasks.find(task => task.description === topic)!;
  assert.equal(task.title, 'Conversation with Alex Lee');
  assert.equal(task.assignedAgentId, 'jordan');
  assert.equal(task.agencyId, 'cedar-ridge');
  assert.equal(task.href, '/support');
  assert.equal(task.status, 'Open');
  const elena = await login('elena');
  const unrelated = await getPortalBootstrap(elena, store);
  assert.ok(!unrelated.tasks.some(entry => entry.description === topic));
  await assert.rejects(applyPortalAction(elena, { ...action, ...requestMetadata(unrelated) }, store), errorCode('NOT_FOUND'));
  await assert.rejects(applyPortalAction(jordan, { ...action, topic: 'x'.repeat(1001), ...requestMetadata(saved) }, store), errorCode('INVALID_INPUT'));
  await resetReviewerPack('01', 'saved-work', store);
  const reset = await getPortalBootstrap(jordan, store);
  assert.ok(!reset.tasks.some(entry => entry.description === topic));
  assert.equal(reset.udlIdentity?.id, baseline.udlIdentity?.id);
});
