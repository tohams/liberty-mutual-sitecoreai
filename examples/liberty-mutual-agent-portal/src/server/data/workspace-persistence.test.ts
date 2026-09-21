import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalJsonStateStore, stateNamespace, type StateStore } from '../state/store';
import { PortalError } from '../errors';
import { fixtures } from './fixtures';
import { type PackMetadata, packStateKey } from './pack-state';
import { persistReviewerWorkspace } from './workspace-persistence';

let directory: string;
before(async () => { directory = await mkdtemp(join(tmpdir(), 'workspace-persistence-')); process.env.PORTAL_ENVIRONMENT = 'migration-tests'; });
after(async () => { await rm(directory, { recursive: true, force: true }); });
const failCode = (code: string) => (error: unknown) => error instanceof PortalError && error.code === code;
async function seed(path: string, key: string, value: unknown, version = 7) {
  await writeFile(join(path, createHash('sha256').update(key).digest('hex') + '.json'), JSON.stringify({ version, expiresAt: Date.now() - 1000, value }));
}
function pack(): PackMetadata { return { runId: randomUUID(), profileGeneration: 5, createdAt: 1, restartedAt: 2, restartReceipts: {} }; }

test('operator migration preserves every existing active value/version and is idempotent without creating missing agency records', async () => {
  const path = await mkdtemp(join(directory, 'existing-'));
  const store = new LocalJsonStateStore(path);
  const metadata = pack();
  const agencyId = fixtures.agents[0].agencyId;
  const key = `${stateNamespace()}:pack:15:run:${metadata.runId}:agency:${agencyId}`;
  const value = { favorites: { avery: ['resource-a'] }, empty: [], preciseNumber: 9007199254740991 };
  await seed(path, packStateKey('15'), metadata, 8);
  await seed(path, key, value, 19);
  const first = await persistReviewerWorkspace('15', store);
  assert.equal(first.mode, 'persist-workspace');
  assert.equal(first.runId, metadata.runId);
  assert.equal(first.profileGeneration, 5);
  assert.equal(first.existingRecords, 2);
  assert.equal(first.persistentRecords, 2);
  assert.equal(first.checkedRecords, new Set(fixtures.agents.map((agent) => agent.agencyId)).size + 1);
  assert.equal(first.missingRecords, first.checkedRecords - 2);
  for (const record of first.records) {
    assert.equal(record.before.version, record.after.version);
    assert.equal(record.before.valueHash, record.after.valueHash);
    assert.equal(record.after.expiresAt, null);
    assert.equal(record.after.persistent, true);
  }
  assert.deepEqual((await store.read(key))?.value, value);
  assert.deepEqual((await store.read(packStateKey('15')))?.value, metadata);
  assert.deepEqual(await persistReviewerWorkspace('15', store), first, 'Repeat receipts are stable while saved state is unchanged');
  assert.equal((await readdir(path)).filter((file) => file.endsWith('.json')).length, 2, 'Migration cannot seed missing records');
  assert.equal(JSON.stringify(first).includes('resource-a'), false, 'Receipts contain value hashes, never saved payloads');
});

test('missing metadata is reported without creating a new run or records', async () => {
  const path = await mkdtemp(join(directory, 'missing-'));
  const store = new LocalJsonStateStore(path);
  const result = await persistReviewerWorkspace('01', store);
  assert.equal(result.runId, null);
  assert.equal(result.profileGeneration, null);
  assert.equal(result.existingRecords, 0);
  assert.equal(result.missingRecords, 1);
  assert.deepEqual(result.records, []);
  assert.deepEqual(await readdir(path), []);
  await assert.rejects(persistReviewerWorkspace('21', store), failCode('INVALID_INPUT'));
});

test('a concurrent run or profile-metadata update causes conflict without overwriting it', async () => {
  for (const change of ['run', 'profile']) {
    const path = await mkdtemp(join(directory, `${change}-`));
    const local = new LocalJsonStateStore(path);
    const metadata = pack();
    await seed(path, packStateKey('15'), metadata);
    let changed = false;
    let next: PackMetadata | undefined;
    const store: StateStore = {
      read: local.read.bind(local), compareAndSet: local.compareAndSet.bind(local),
      async persist<T>(key: string) {
        const result = await local.persist<T>(key);
        if (key.includes(':agency:') && !changed) {
          changed = true;
          const current = (await local.read<PackMetadata>(packStateKey('15')))!;
          next = change === 'run' ? { ...metadata, runId: randomUUID() } : { ...metadata, profileGeneration: 6 };
          await local.compareAndSet(packStateKey('15'), current.version, next, null);
        }
        return result;
      },
    };
    await assert.rejects(persistReviewerWorkspace('15', store), failCode('VERSION_CONFLICT'));
    assert.deepEqual((await local.read(packStateKey('15')))?.value, next);
  }
});
