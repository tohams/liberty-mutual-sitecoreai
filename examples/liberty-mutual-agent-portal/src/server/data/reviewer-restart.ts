import 'server-only';
import { randomUUID } from 'node:crypto';
import { PortalError } from '../errors';
import { getStateStore, stateNamespace, type StateStore, type StoredValue } from '../state/store';
import * as profileImport from '../udl/profile-import';
import type { ProfileImportPlan, ProfileImportSubmission, VerifiedProfileImport } from '../udl/profile-import';
import { fixtures } from './fixtures';
import { getPack, packStateKey, PACK_METADATA_TTL_SECONDS, requireReviewerPack, type PackMetadata, type RestartJob, type RestartReceipt } from './pack-state';

const LEASE_MS = 45_000;
const RETRY_SECONDS = 3;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

type Inspection = Awaited<ReturnType<typeof profileImport.inspectProfileImport>>;
export interface ProfileImporter {
  assertConfigured(): void;
  prepareProfileImport(input: { reviewerPack: string; generation: number; profileSetId: string; identityScope: string }): ProfileImportPlan;
  submitProfileImport(plan: ProfileImportPlan): Promise<ProfileImportSubmission>;
  inspectProfileImport(plan: ProfileImportPlan, submission: ProfileImportSubmission): Promise<Inspection>;
}
interface RestartDependencies { store?: StateStore; importer?: ProfileImporter; now?: () => number; }
export interface RestartRequest { reviewerPack: string; requestId: string; expectedRunId: string; }

function requireUuid(value: string, label: string): void {
  if (typeof value !== 'string' || !UUID.test(value)) throw new PortalError('INVALID_INPUT', `Provide a valid ${label}.`);
}

function pendingReceipt(reviewerPack: string, job: RestartJob, now: number): RestartReceipt {
  const waitUntil = Math.max(job.nextAttemptAt ?? 0, job.lease?.expiresAt ?? 0);
  return {
    reviewerPack, mode: 'restart', requestId: job.requestId, expectedRunId: job.expectedRunId,
    status: 'pending', phase: job.phase, runId: job.expectedRunId, profileGeneration: job.baseGeneration,
    targetGeneration: job.plan.generation, clearBrowserIdentity: false,
    retryAfterSeconds: Math.max(RETRY_SECONDS, Math.ceil((waitUntil - now) / 1000)),
    profileSetId: job.plan.profileSetId, identityScope: job.plan.identityScope, checksumMd5: job.plan.checksumMd5,
    fileSizeBytes: job.plan.fileSizeBytes, profiles: job.plan.profiles,
    ...(job.submission ? { batchId: job.submission.batchId } : {}),
  };
}

export async function getReviewerResetStatus(reviewerPack: string, requestId?: string, store = getStateStore()) {
  requireReviewerPack(reviewerPack);
  if (requestId !== undefined) requireUuid(requestId, 'request ID');
  const current = await getPack(store, reviewerPack);
  const pending = current.value.pendingRestart ? pendingReceipt(reviewerPack, current.value.pendingRestart, Date.now()) : null;
  const operation = requestId ? current.value.restartReceipts?.[requestId] ?? (pending?.requestId === requestId ? pending : null) : null;
  return { reviewerPack, runId: current.value.runId, profileGeneration: current.value.profileGeneration, pendingRestart: pending, operation };
}

/** One bounded import/poll step per call. No task relies on work continuing after the HTTP response. */
export async function requestReviewerRestart(request: RestartRequest, dependencies: RestartDependencies = {}): Promise<RestartReceipt> {
  const { reviewerPack, requestId, expectedRunId } = request;
  requireReviewerPack(reviewerPack);
  requireUuid(requestId, 'request ID');
  requireUuid(expectedRunId, 'current run ID');
  const store = dependencies.store ?? getStateStore();
  const importer = dependencies.importer ?? profileImport;
  const now = dependencies.now ?? Date.now;
  const key = packStateKey(reviewerPack);
  let current = await getPack(store, reviewerPack);
  const receipt = current.value.restartReceipts?.[requestId];
  if (receipt) {
    if (receipt.expectedRunId !== expectedRunId) throw new PortalError('IDEMPOTENCY_CONFLICT', 'This request ID belongs to another run.', 409);
    return receipt;
  }
  if (current.value.pendingRestart && current.value.pendingRestart.requestId !== requestId) {
    throw new PortalError('RESTART_PENDING', 'A profile restart is already in progress for this reviewer pack.', 409);
  }
  if (current.value.runId !== expectedRunId || (current.value.pendingRestart && current.value.pendingRestart.expectedRunId !== expectedRunId)) {
    throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed. Read its current run before starting a new restart.', 409);
  }
  try { importer.assertConfigured(); }
  catch { throw new PortalError('CONFIGURATION_REQUIRED', 'Native profile import is not configured. Ask the portal operator to configure it before restarting profiles.', 503); }
  if (!current.value.pendingRestart) {
    const generation = current.value.profileGeneration + 1;
    if (!Number.isSafeInteger(generation) || generation < 1) throw new PortalError('INVALID_STATE', 'The reviewer pack generation is invalid.', 409);
    const plan = importer.prepareProfileImport({ reviewerPack, generation, profileSetId: randomUUID(), identityScope: stateNamespace() });
    const job: RestartJob = { requestId, expectedRunId, baseGeneration: current.value.profileGeneration, phase: 'preparing', plan, createdAt: now() };
    const reserved = await store.compareAndSet(key, current.version, { ...current.value, pendingRestart: job }, PACK_METADATA_TTL_SECONDS);
    if (!reserved) return readConflict(store, reviewerPack, requestId, expectedRunId, now());
    current = reserved;
  }

  const job = current.value.pendingRestart!;
  if (job.lease && job.lease.expiresAt > now()) return pendingReceipt(reviewerPack, job, now());
  if (job.phase === 'uploading') {
    // The upload may have succeeded before the worker disappeared. Never replay it.
    return finishFailed(store, reviewerPack, current, 'UPLOAD_UNCERTAIN', now());
  }
  if ((job.nextAttemptAt ?? 0) > now()) return pendingReceipt(reviewerPack, job, now());
  const lease = { id: randomUUID(), expiresAt: now() + LEASE_MS };
  const claimedJob: RestartJob = { ...job, phase: job.phase === 'preparing' ? 'uploading' : 'verifying', lease };
  delete claimedJob.nextAttemptAt;
  const claimed = await store.compareAndSet(key, current.version, { ...current.value, pendingRestart: claimedJob }, PACK_METADATA_TTL_SECONDS);
  if (!claimed) return readConflict(store, reviewerPack, requestId, expectedRunId, now());

  if (claimedJob.phase === 'uploading') {
    let submission: ProfileImportSubmission;
    try {
      submission = await importer.submitProfileImport(claimedJob.plan);
    } catch (error) {
      const failure = error as { retryable?: boolean; uploadUncertain?: boolean; retryAfterSeconds?: number };
      if (failure.retryable === true && failure.uploadUncertain === false) {
        return releaseForRetry(store, reviewerPack, claimed, 'preparing', now(), failure.retryAfterSeconds);
      }
      return finishFailed(store, reviewerPack, claimed, failure.uploadUncertain === false ? 'PROFILE_IMPORT_FAILED' : 'UPLOAD_UNCERTAIN', now());
    }
    if (!submission.batchId || submission.checksumMd5 !== claimedJob.plan.checksumMd5 || submission.fileSizeBytes !== claimedJob.plan.fileSizeBytes) {
      return finishFailed(store, reviewerPack, claimed, 'UPLOAD_UNCERTAIN', now());
    }
    const nextJob: RestartJob = { ...claimedJob, submission, phase: 'verifying' };
    delete nextJob.lease;
    const saved = await store.compareAndSet(key, claimed.version, { ...claimed.value, pendingRestart: nextJob }, PACK_METADATA_TTL_SECONDS);
    if (!saved) return readConflict(store, reviewerPack, requestId, expectedRunId, now());
    return pendingReceipt(reviewerPack, nextJob, now());
  }

  if (!claimedJob.submission) return finishFailed(store, reviewerPack, claimed, 'IMPORT_VERIFICATION_FAILED', now());
  let inspection: Inspection;
  try {
    inspection = await importer.inspectProfileImport(claimedJob.plan, claimedJob.submission);
  } catch (error) {
    // Polling is read-only: transient failures can safely retry the same submission.
    if ((error as { retryable?: boolean }).retryable === false) return finishFailed(store, reviewerPack, claimed, 'IMPORT_VERIFICATION_FAILED', now());
    return releaseForRetry(store, reviewerPack, claimed, 'verifying', now());
  }
  if (inspection.status === 'pending') return releaseForRetry(store, reviewerPack, claimed, 'verifying', now(), inspection.retryAfterSeconds);
  if (inspection.status === 'failed' || !verifiedSetMatches(claimedJob.plan, claimedJob.submission, inspection.receipt)) {
    return finishFailed(store, reviewerPack, claimed, 'IMPORT_VERIFICATION_FAILED', now());
  }
  const activatedAt = now();
  const completed: RestartReceipt = {
    ...pendingReceipt(reviewerPack, claimedJob, activatedAt), status: 'completed', phase: 'completed',
    runId: randomUUID(), profileGeneration: claimedJob.plan.generation, targetGeneration: claimedJob.plan.generation,
    clearBrowserIdentity: true, profiles: inspection.receipt.profiles, counts: inspection.receipt.counts, verifiedAt: inspection.receipt.verifiedAt,
  };
  delete completed.retryAfterSeconds;
  const next: PackMetadata = {
    ...claimed.value, runId: completed.runId, profileGeneration: completed.profileGeneration,
    createdAt: activatedAt, restartedAt: activatedAt,
    profileSet: { version: 2, id: claimedJob.plan.profileSetId, identityScope: claimedJob.plan.identityScope,
      identifiers: Object.fromEntries(claimedJob.plan.profiles.map((profile) => [profile.agentId, profile.identifier])),
      verification: inspection.receipt },
    restartReceipts: { ...claimed.value.restartReceipts, [requestId]: completed },
  };
  delete next.pendingRestart;
  const saved = await store.compareAndSet(key, claimed.version, next, PACK_METADATA_TTL_SECONDS);
  if (!saved) return readConflict(store, reviewerPack, requestId, expectedRunId, now());
  return completed;
}

function verifiedSetMatches(plan: ProfileImportPlan, submission: ProfileImportSubmission, receipt: VerifiedProfileImport): boolean {
  const agentIds = fixtures.agents.map((agent) => agent.id).sort();
  return receipt.batchId === submission.batchId && receipt.checksumMd5 === plan.checksumMd5 && receipt.fileSizeBytes === plan.fileSizeBytes &&
    receipt.counts.CREATED === 7 && receipt.counts.UPDATED === 0 && receipt.counts.FAILED === 0 &&
    plan.profiles.length === 7 && receipt.profiles.length === 7 &&
    JSON.stringify(plan.profiles.map((profile) => profile.agentId).sort()) === JSON.stringify(agentIds) &&
    new Set(plan.profiles.map((profile) => profile.identifier)).size === 7 &&
    new Set(plan.profiles.map((profile) => profile.correlationId)).size === 7 &&
    new Set(receipt.profiles.map((profile) => profile.profileId)).size === 7 &&
    new Set(receipt.profiles.map((profile) => profile.agentId)).size === 7 &&
    new Set(receipt.profiles.map((profile) => profile.identifier)).size === 7 &&
    new Set(receipt.profiles.map((profile) => profile.correlationId)).size === 7 &&
    receipt.profiles.every((profile) => UUID.test(profile.profileId) && plan.profiles.some((expected) =>
      expected.agentId === profile.agentId && expected.identifier === profile.identifier && expected.correlationId === profile.correlationId));
}

async function readConflict(store: StateStore, reviewerPack: string, requestId: string, expectedRunId: string, now: number): Promise<RestartReceipt> {
  const current = await getPack(store, reviewerPack);
  const receipt = current.value.restartReceipts?.[requestId];
  if (receipt && receipt.expectedRunId === expectedRunId) return receipt;
  const pending = current.value.pendingRestart;
  if (pending?.requestId === requestId && pending.expectedRunId === expectedRunId) return pendingReceipt(reviewerPack, pending, now);
  throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed. Read its current restart status before continuing.', 409);
}

async function finishFailed(store: StateStore, reviewerPack: string, current: StoredValue<PackMetadata>, code: string, now: number): Promise<RestartReceipt> {
  const job = current.value.pendingRestart!;
  const failed: RestartReceipt = { ...pendingReceipt(reviewerPack, job, now), status: 'failed', phase: 'failed', code,
    message: code === 'UPLOAD_UNCERTAIN'
      ? 'The upload could not be confirmed. The current pack is unchanged. Review the native import queue using this profile set and its correlation IDs before starting a new explicit restart request.'
      : 'The new profile set could not be verified. The current pack is unchanged. Start a new explicit restart request after resolving the import issue.' };
  delete failed.retryAfterSeconds;
  const next = { ...current.value, restartReceipts: { ...current.value.restartReceipts, [job.requestId]: failed } };
  delete next.pendingRestart;
  const saved = await store.compareAndSet(packStateKey(reviewerPack), current.version, next, PACK_METADATA_TTL_SECONDS);
  if (!saved) return readConflict(store, reviewerPack, job.requestId, job.expectedRunId, now);
  return failed;
}

async function releaseForRetry(store: StateStore, reviewerPack: string, current: StoredValue<PackMetadata>, phase: 'preparing' | 'verifying', now: number, retryAfterSeconds = RETRY_SECONDS): Promise<RestartReceipt> {
  const job = current.value.pendingRestart!;
  const retry = Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : RETRY_SECONDS;
  const nextJob = { ...job, phase, nextAttemptAt: now + retry * 1000 };
  delete nextJob.lease;
  const saved = await store.compareAndSet(packStateKey(reviewerPack), current.version, { ...current.value, pendingRestart: nextJob }, PACK_METADATA_TTL_SECONDS);
  if (!saved) return readConflict(store, reviewerPack, job.requestId, job.expectedRunId, now);
  return pendingReceipt(reviewerPack, nextJob, now);
}
