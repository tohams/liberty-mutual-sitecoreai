import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { applyPortalAction, getEditorBootstrap, getPolicyDocument, getPortalBootstrap, getPortalPersonalizationIdentity, resetReviewerPack } from './portal';
import { fixtures, validateFixtures } from './fixtures';
import { LocalJsonStateStore, stateNamespace, type StateStore } from '../state/store';
import { createSession, verifySession } from '../auth/session';
import { authenticate } from '../auth/credentials';
import logins from '../../../fixtures/portal-logins.json';
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

test('personalization identity reads only pack metadata and honors verified generation, restart, expiry and agent scope', async () => {
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
  await assert.rejects(getPortalPersonalizationIdentity(session, store), errorCode('WORKSPACE_EXPIRED'));
  await assert.rejects(getPortalPersonalizationIdentity({ ...session, agencyId: 'wrong-agency' }, store), errorCode('UNAUTHENTICATED'));
});

test('all 28 fixture credentials use salted hashes and unknown logins fail', async () => {
  assert.equal(logins.logins.length, 28);
  const source = logins.logins.find((entry) => entry.username === 'maya.01')!;
  assert.equal((await authenticate(source.username, source.password))?.agencyId, 'cedar-ridge');
  assert.equal(await authenticate(source.username, 'incorrect-password'), null);
  assert.equal(await authenticate('unknown.01', 'incorrect-password'), null);
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

test('restart requires a verified fresh identity and invalidates prior sessions while preserving other packs', async () => {
  const store = new LocalJsonStateStore(join(directory, 'restart'));
  const originalSession = await login('maya');
  const initial = await getPortalBootstrap(originalSession, store);
  const otherPack = await getPortalBootstrap(await login('maya', '02'), store);
  const olderSession = { ...originalSession, issuedAt: new Date(Date.now() - 1000).toISOString() };
  process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS = '0';
  await assert.rejects(resetReviewerPack('01', 'restart', store), errorCode('PROFILE_NOT_READY'));
  process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS = '0,1,2,3';
  await resetReviewerPack('01', 'restart', store);
  await assert.rejects(getPortalBootstrap(olderSession, store), errorCode('UNAUTHENTICATED'));
  const restarted = await getPortalBootstrap(await login('maya'), store);
  assert.equal(restarted.session.profileGeneration, 1);
  assert.notEqual(restarted.udlIdentity?.id, initial.udlIdentity?.id);
  const otherAfter = await getPortalBootstrap(await login('maya', '02'), store);
  assert.equal(otherAfter.session.runId, otherPack.session.runId);
  assert.equal(otherAfter.udlIdentity?.id, otherPack.udlIdentity?.id);
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
