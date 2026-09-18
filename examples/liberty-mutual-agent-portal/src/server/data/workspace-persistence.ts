import 'server-only';
import { createHash } from 'node:crypto';
import { PortalError } from '../errors';
import { getStateStore, stateNamespace, type PersistenceResult, type StateStore } from '../state/store';
import { fixtures } from './fixtures';
import { packStateKey, requireReviewerPack, type PackMetadata } from './pack-state';

const valueHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function proof(kind: 'pack' | 'agency', result: PersistenceResult<unknown>, agencyId?: string) {
  const before = { version: result.before.version, valueHash: valueHash(result.before.value) };
  const after = { version: result.after.version, valueHash: valueHash(result.after.value), expiresAt: result.after.expiresAt,
    persistent: result.persistent, ...(result.redisTtlSeconds === undefined ? {} : { redisTtlSeconds: result.redisTtlSeconds }) };
  if (before.version !== after.version || before.valueHash !== after.valueHash || after.expiresAt !== null || !after.persistent) {
    throw new PortalError('STATE_UNAVAILABLE', 'Workspace persistence did not preserve its saved state. Contact the portal operator.', 503);
  }
  return { kind, ...(agencyId ? { agencyId } : {}), before, after };
}

/** Explicit operator backfill: existing active records only, without resets, new records or CDP calls. */
export async function persistReviewerWorkspace(reviewerPack: string, store: StateStore = getStateStore()) {
  requireReviewerPack(reviewerPack);
  const key = packStateKey(reviewerPack);
  const metadata = await store.persist<PackMetadata>(key);
  if (!metadata) return { reviewerPack, mode: 'persist-workspace' as const, runId: null, profileGeneration: null,
    checkedRecords: 1, existingRecords: 0, missingRecords: 1, persistentRecords: 0, records: [] };
  const records = [proof('pack', metadata)];
  // Agency identifiers are fixed fixture keys, never supplied by the request.
  const agencies = [...new Set(fixtures.agents.map((agent) => agent.agencyId))].sort();
  const agencyResults = await Promise.all(agencies.map(async (agencyId) => {
    const result = await store.persist(`${stateNamespace()}:pack:${reviewerPack}:run:${metadata.after.value.runId}:agency:${agencyId}`);
    return result ? proof('agency', result, agencyId) : null;
  }));
  records.push(...agencyResults.filter((record) => record !== null));
  const latest = await store.read<PackMetadata>(key);
  if (!latest || latest.version !== metadata.after.version || valueHash(latest.value) !== valueHash(metadata.after.value)) {
    throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed during its storage upgrade. Retry the same persistence command.', 409);
  }
  return { reviewerPack, mode: 'persist-workspace' as const, runId: metadata.after.value.runId,
    profileGeneration: metadata.after.value.profileGeneration, checkedRecords: agencies.length + 1,
    existingRecords: records.length, missingRecords: agencies.length + 1 - records.length,
    persistentRecords: records.length, records };
}
