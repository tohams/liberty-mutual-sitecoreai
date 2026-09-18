import 'server-only';
import { randomUUID } from 'node:crypto';
import manifest from '../../../fixtures/manifest.json';
import { PortalError } from '../errors';
import { stateNamespace, type StateStore, type StoredValue } from '../state/store';
import type { ProfileImportPlan, ProfileImportSubmission, VerifiedProfileImport } from '../udl/profile-import';

export const PACK_METADATA_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

export interface RestartReceipt {
  reviewerPack: string;
  mode: 'restart';
  requestId: string;
  expectedRunId: string;
  status: 'pending' | 'completed' | 'failed';
  phase: 'preparing' | 'uploading' | 'verifying' | 'completed' | 'failed';
  runId: string;
  profileGeneration: number;
  targetGeneration: number;
  clearBrowserIdentity: boolean;
  retryAfterSeconds?: number;
  code?: string;
  message?: string;
  profileSetId: string;
  identityScope: string;
  checksumMd5: string;
  fileSizeBytes: number;
  batchId?: string;
  counts?: Readonly<{ CREATED: number; UPDATED: number; FAILED: number }>;
  profiles: ReadonlyArray<Readonly<{ agentId: string; identifier: string; correlationId: string; profileId?: string }>>;
  verifiedAt?: string;
}

export interface RestartJob {
  requestId: string;
  expectedRunId: string;
  baseGeneration: number;
  phase: 'preparing' | 'uploading' | 'verifying';
  plan: ProfileImportPlan;
  submission?: ProfileImportSubmission;
  createdAt: number;
  nextAttemptAt?: number;
  lease?: { id: string; expiresAt: number };
}

export interface ActiveProfileSet {
  version: 2;
  id: string;
  identityScope: string;
  identifiers: Record<string, string>;
  verification: VerifiedProfileImport;
}

export interface PackMetadata {
  runId: string;
  profileGeneration: number;
  createdAt: number;
  restartedAt: number;
  profileSet?: ActiveProfileSet;
  pendingRestart?: RestartJob;
  restartReceipts?: Record<string, RestartReceipt>;
}

export function requireReviewerPack(reviewerPack: string): void {
  if (!manifest.reviewerPacks.includes(reviewerPack)) throw new PortalError('INVALID_INPUT', 'Choose a valid reviewer pack.');
}

export function packStateKey(reviewerPack: string): string {
  return `${stateNamespace()}:pack:${reviewerPack}`;
}

export async function getPack(store: StateStore, reviewerPack: string): Promise<StoredValue<PackMetadata>> {
  requireReviewerPack(reviewerPack);
  const key = packStateKey(reviewerPack);
  const existing = await store.read<PackMetadata>(key);
  if (existing) return existing;
  const created = await store.compareAndSet<PackMetadata>(key, null, {
    runId: randomUUID(), profileGeneration: 0, createdAt: Date.now(), restartedAt: 0,
  }, PACK_METADATA_TTL_SECONDS);
  const result = created ?? await store.read<PackMetadata>(key);
  if (!result) throw new PortalError('STATE_UNAVAILABLE', 'Your workspace could not be opened. Please try again.', 503);
  return result;
}
