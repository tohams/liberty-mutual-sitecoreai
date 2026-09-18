import 'server-only';
import { randomUUID } from 'node:crypto';
import { PortalError } from '../errors';
import { getStateStore, stateNamespace, type StateStore, type StoredValue } from '../state/store';
import * as profileImport from '../udl/profile-import';
import type { ProfileImportDiagnostic, ProfileImportPlan, ProfileImportSubmission, VerifiedProfileImport } from '../udl/profile-import';
import { fixtures } from './fixtures';
import { getPack, packStateKey, requireReviewerPack, type PackMetadata, type RestartJob, type RestartReceipt } from './pack-state';

const LEASE_MS = 45_000;
const RETRY_SECONDS = 3;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

type Inspection = Awaited<ReturnType<typeof profileImport.inspectProfileImport>>;
export interface ProfileImporter {
  assertConfigured(): void;
  prepareProfileImport(input: { reviewerPack: string; generation: number; profileSetId: string; identityScope: string }): ProfileImportPlan;
  restoreProfileImportPlan: typeof profileImport.restoreProfileImportPlan;
  submitProfileImport(plan: ProfileImportPlan): Promise<ProfileImportSubmission>;
  inspectProfileImport(plan: ProfileImportPlan, submission: ProfileImportSubmission): Promise<Inspection>;
}
interface RestartDependencies { store?: StateStore; importer?: ProfileImporter; now?: () => number; }
export interface RestartRequest { reviewerPack: string; requestId: string; expectedRunId: string; resumeVerification?: boolean; }

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
    ...(job.previousVerificationFailures ? { previousVerificationFailures: job.previousVerificationFailures } : {}),
  };
}

export async function getReviewerResetStatus(reviewerPack: string, requestId?: string, store = getStateStore()) {
  requireReviewerPack(reviewerPack);
  if (requestId !== undefined) requireUuid(requestId, 'request ID');
  const current = await getPack(store, reviewerPack);
  const pending = current.value.pendingRestart ? pendingReceipt(reviewerPack, current.value.pendingRestart, Date.now()) : null;
  const operation = requestId ? (pending?.requestId === requestId ? pending : current.value.restartReceipts?.[requestId] ?? null) : null;
  return { reviewerPack, runId: current.value.runId, profileGeneration: current.value.profileGeneration, pendingRestart: pending, operation };
}

function assertImportConfigured(importer: ProfileImporter): void {
  try { importer.assertConfigured(); }
  catch { throw new PortalError('CONFIGURATION_REQUIRED', 'Native profile import is not configured. Ask the portal operator to configure it before restarting profiles.', 503); }
}

function restoreFailedImport(receipt: RestartReceipt | undefined, importer: ProfileImporter) {
  if (!receipt || receipt.status !== 'failed' || receipt.code !== 'IMPORT_VERIFICATION_FAILED' || !receipt.batchId || !UUID.test(receipt.batchId)) {
    throw new PortalError('VERIFICATION_NOT_RECOVERABLE', 'Only a failed verification with a known native import batch can be inspected or resumed.', 409);
  }
  let plan: ProfileImportPlan;
  try { plan = importer.restoreProfileImportPlan({ ...receipt, generation: receipt.targetGeneration }); }
  catch { throw new PortalError('IMPORT_PLAN_CHANGED', 'The retained import cannot be reconstructed exactly. Keep the current pack active and review the original batch before continuing.', 409); }
  return { plan, submission: { batchId: receipt.batchId, checksumMd5: receipt.checksumMd5, fileSizeBytes: receipt.fileSizeBytes } };
}

function inspectionErrorCode(error: unknown): string {
  const safeCodes = ['INVALID_IMPORT_PLAN', 'INVALID_IMPORT_RESPONSE', 'IMPORT_REQUEST_REJECTED', 'IMPORT_NOT_CONFIGURED'];
  return error instanceof profileImport.ProfileImportError && safeCodes.includes(error.code) ? error.code : 'IMPORT_READ_FAILED';
}

/** Operator-only read: inspects the retained batch without changing pack state or activating identities. */
export async function inspectReviewerRestart(reviewerPack: string, requestId: string, dependencies: RestartDependencies = {}) {
  requireReviewerPack(reviewerPack);
  requireUuid(requestId, 'request ID');
  const store = dependencies.store ?? getStateStore();
  const importer = dependencies.importer ?? profileImport;
  const current = await store.read<PackMetadata>(packStateKey(reviewerPack));
  const receipt = current?.value.restartReceipts?.[requestId];
  const { plan, submission } = restoreFailedImport(receipt, importer);
  assertImportConfigured(importer);
  let inspection: Inspection;
  try { inspection = await importer.inspectProfileImport(plan, submission); }
  catch (error) {
    if ((error as { retryable?: boolean }).retryable !== false) throw new PortalError('IMPORT_READ_UNAVAILABLE', 'The native import could not be inspected. Retry this read later.', 503);
    inspection = { status: 'failed', code: 'IMPORT_VERIFICATION_FAILED', message: 'The native import could not be verified.', diagnosticCode: inspectionErrorCode(error) };
  }
  if (inspection.status === 'verified' && !verifiedSetMatches(plan, submission, inspection.receipt)) {
    inspection = { status: 'failed', code: 'IMPORT_VERIFICATION_FAILED', message: 'The native import could not be verified.', diagnosticCode: 'ACTIVATION_PROOF_MISMATCH' };
  }
  return { reviewerPack, requestId, expectedRunId: receipt!.expectedRunId, batchId: submission.batchId,
    canResume: inspection.status === 'verified' && current!.value.runId === receipt!.expectedRunId &&
      current!.value.profileGeneration === receipt!.profileGeneration && plan.generation === current!.value.profileGeneration + 1 &&
      plan.identityScope === stateNamespace() && !current!.value.pendingRestart,
    inspection };
}

/** One bounded import/poll step per call. No task relies on work continuing after the HTTP response. */
export async function requestReviewerRestart(request: RestartRequest, dependencies: RestartDependencies = {}): Promise<RestartReceipt> {
  const { reviewerPack, requestId, expectedRunId } = request;
  requireReviewerPack(reviewerPack);
  requireUuid(requestId, 'request ID');
  requireUuid(expectedRunId, 'current run ID');
  if (request.resumeVerification !== undefined && typeof request.resumeVerification !== 'boolean') throw new PortalError('INVALID_INPUT', 'Choose whether to resume verification.');
  const store = dependencies.store ?? getStateStore();
  const importer = dependencies.importer ?? profileImport;
  const now = dependencies.now ?? Date.now;
  const key = packStateKey(reviewerPack);
  let current = await getPack(store, reviewerPack);
  const receipt = current.value.restartReceipts?.[requestId];
  const pendingForRequest = current.value.pendingRestart?.requestId === requestId;
  if (receipt) {
    if (receipt.expectedRunId !== expectedRunId) throw new PortalError('IDEMPOTENCY_CONFLICT', 'This request ID belongs to another run.', 409);
    if (!pendingForRequest && (!request.resumeVerification || receipt.status === 'completed')) return receipt;
  }
  if (request.resumeVerification && !receipt && !pendingForRequest) throw new PortalError('VERIFICATION_NOT_RECOVERABLE', 'There is no retained failed verification for this request ID.', 409);
  if (current.value.pendingRestart && current.value.pendingRestart.requestId !== requestId) {
    throw new PortalError('RESTART_PENDING', 'A profile restart is already in progress for this reviewer pack.', 409);
  }
  if (current.value.runId !== expectedRunId || (current.value.pendingRestart && current.value.pendingRestart.expectedRunId !== expectedRunId)) {
    throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed. Read its current run before starting a new restart.', 409);
  }
  assertImportConfigured(importer);
  if (!current.value.pendingRestart) {
    const generation = current.value.profileGeneration + 1;
    if (!Number.isSafeInteger(generation) || generation < 1) throw new PortalError('INVALID_STATE', 'The reviewer pack generation is invalid.', 409);
    let job: RestartJob;
    if (request.resumeVerification) {
      const { plan, submission } = restoreFailedImport(receipt, importer);
      if (receipt!.profileGeneration !== current.value.profileGeneration || plan.generation !== generation || plan.identityScope !== stateNamespace()) {
        throw new PortalError('VERSION_CONFLICT', 'The reviewer pack no longer matches this retained import. The current pack is unchanged.', 409);
      }
      job = { requestId, expectedRunId, baseGeneration: current.value.profileGeneration, phase: 'verifying', plan, submission, createdAt: now(),
        previousVerificationFailures: [...receipt!.previousVerificationFailures ?? [], {
          code: receipt!.code!, ...(receipt!.diagnosticCode ? { diagnosticCode: receipt!.diagnosticCode } : {}),
          ...(receipt!.diagnostic ? { diagnostic: receipt!.diagnostic } : {}), ...(receipt!.failedAt ? { failedAt: receipt!.failedAt } : {}),
        }] };
    } else {
      const plan = importer.prepareProfileImport({ reviewerPack, generation, profileSetId: randomUUID(), identityScope: stateNamespace() });
      job = { requestId, expectedRunId, baseGeneration: current.value.profileGeneration, phase: 'preparing', plan, createdAt: now() };
    }
    const reserved = await store.compareAndSet(key, current.version, { ...current.value, pendingRestart: job }, null);
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
  const claimed = await store.compareAndSet(key, current.version, { ...current.value, pendingRestart: claimedJob }, null);
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
    const saved = await store.compareAndSet(key, claimed.version, { ...claimed.value, pendingRestart: nextJob }, null);
    if (!saved) return readConflict(store, reviewerPack, requestId, expectedRunId, now());
    return pendingReceipt(reviewerPack, nextJob, now());
  }

  if (!claimedJob.submission) return finishFailed(store, reviewerPack, claimed, 'IMPORT_VERIFICATION_FAILED', now());
  let inspection: Inspection;
  try {
    inspection = await importer.inspectProfileImport(claimedJob.plan, claimedJob.submission);
  } catch (error) {
    // Polling is read-only: transient failures can safely retry the same submission.
    if ((error as { retryable?: boolean }).retryable === false) return finishFailed(store, reviewerPack, claimed, 'IMPORT_VERIFICATION_FAILED', now(), { diagnosticCode: inspectionErrorCode(error) });
    return releaseForRetry(store, reviewerPack, claimed, 'verifying', now());
  }
  if (inspection.status === 'pending') return releaseForRetry(store, reviewerPack, claimed, 'verifying', now(), inspection.retryAfterSeconds);
  if (inspection.status === 'failed' || !verifiedSetMatches(claimedJob.plan, claimedJob.submission, inspection.receipt)) {
    return finishFailed(store, reviewerPack, claimed, 'IMPORT_VERIFICATION_FAILED', now(), inspection.status === 'failed'
      ? { diagnosticCode: inspection.diagnosticCode, diagnostic: inspection.diagnostic }
      : { diagnosticCode: 'ACTIVATION_PROOF_MISMATCH' });
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
  const saved = await store.compareAndSet(key, claimed.version, next, null);
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
  const pending = current.value.pendingRestart;
  if (pending?.requestId === requestId && pending.expectedRunId === expectedRunId) return pendingReceipt(reviewerPack, pending, now);
  const receipt = current.value.restartReceipts?.[requestId];
  if (receipt && receipt.expectedRunId === expectedRunId) return receipt;
  throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed. Read its current restart status before continuing.', 409);
}

async function finishFailed(store: StateStore, reviewerPack: string, current: StoredValue<PackMetadata>, code: string, now: number,
  diagnostics: { diagnosticCode?: string; diagnostic?: ProfileImportDiagnostic } = {}): Promise<RestartReceipt> {
  const job = current.value.pendingRestart!;
  const failed: RestartReceipt = { ...pendingReceipt(reviewerPack, job, now), status: 'failed', phase: 'failed', code,
    ...(diagnostics.diagnosticCode ? { diagnosticCode: diagnostics.diagnosticCode } : {}),
    ...(diagnostics.diagnostic ? { diagnostic: diagnostics.diagnostic } : {}), failedAt: new Date(now).toISOString(),
    message: code === 'UPLOAD_UNCERTAIN'
      ? 'The upload could not be confirmed. The current pack is unchanged. Review the native import queue using this profile set and its correlation IDs before starting a new explicit restart request.'
      : code === 'IMPORT_VERIFICATION_FAILED'
        ? 'The new profile set could not be verified. The current pack is unchanged. Inspect the retained native batch, resolve the verification issue, then explicitly resume verification of this same request.'
        : 'The profile upload was rejected. The current pack is unchanged. Resolve the import issue before starting a new explicit restart request.' };
  delete failed.retryAfterSeconds;
  const next = { ...current.value, restartReceipts: { ...current.value.restartReceipts, [job.requestId]: failed } };
  delete next.pendingRestart;
  const saved = await store.compareAndSet(packStateKey(reviewerPack), current.version, next, null);
  if (!saved) return readConflict(store, reviewerPack, job.requestId, job.expectedRunId, now);
  return failed;
}

async function releaseForRetry(store: StateStore, reviewerPack: string, current: StoredValue<PackMetadata>, phase: 'preparing' | 'verifying', now: number, retryAfterSeconds = RETRY_SECONDS): Promise<RestartReceipt> {
  const job = current.value.pendingRestart!;
  const retry = Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : RETRY_SECONDS;
  const nextJob = { ...job, phase, nextAttemptAt: now + retry * 1000 };
  delete nextJob.lease;
  const saved = await store.compareAndSet(packStateKey(reviewerPack), current.version, { ...current.value, pendingRestart: nextJob }, null);
  if (!saved) return readConflict(store, reviewerPack, job.requestId, job.expectedRunId, now);
  return pendingReceipt(reviewerPack, nextJob, now);
}
