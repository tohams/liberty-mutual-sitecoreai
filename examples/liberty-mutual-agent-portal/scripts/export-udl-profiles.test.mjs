import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = new URL('./export-udl-profiles.mjs', import.meta.url);
const fixture = new URL('../fixtures/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', fixture), 'utf8'));
const agents = JSON.parse(await readFile(new URL('agents.json', fixture), 'utf8'));

test('UDL exports all attendees or an additive pack batch without changing identity semantics', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portal-udl-export-'));
  try {
    for (const packs of [manifest.reviewerPacks, ['16', '17', '18', '19', '20']]) {
      const result = spawnSync(process.execPath, [script.pathname, directory, '--packs', packs.join(',')], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const records = (await readFile(join(directory, 'liberty-mutual-profiles.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
      const { mapping } = JSON.parse(await readFile(join(directory, 'profile-identity-map.json'), 'utf8'));
      assert.equal(records.length, packs.length * agents.length * 4);
      assert.equal(mapping.length, records.length);
      assert.equal(new Set(records.map((record) => record.identifiers[0].id)).size, records.length);
      for (const record of records) {
        const { reviewerPack, agentId, profileGeneration, role } = record.extensions;
        assert.ok(packs.includes(reviewerPack));
        const agent = agents.find((entry) => entry.id === agentId);
        assert.equal(role, agent.role);
        assert.deepEqual(record.contact, { firstName: agent.firstName, lastName: `${agent.lastName} - ${reviewerPack}` });
        assert.ok([0, 1, 2, 3].includes(profileGeneration));
        const expectedId = createHash('sha256').update(`liberty-mutual-agent:v1:${reviewerPack}:${agentId}:${profileGeneration}`).digest('hex').slice(0, 32);
        assert.equal(record.identifiers[0].id, expectedId);
        assert.equal(record.identifiers[0].provider, 'liberty-mutual-agent');
        assert.ok(Object.values(record.extensions).every((value) => ['string', 'number', 'boolean'].includes(typeof value)));
        assert.equal(record.contact.email, undefined);
      }
    }
    for (const packs of ['00', '21', '1', '05,05', '']) {
      const result = spawnSync(process.execPath, [script.pathname, directory, '--packs', packs], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
    }
    const canonicalDirectory = new URL('udl/', fixture).pathname;
    const before = await readFile(join(canonicalDirectory, 'profile-identity-map.json'), 'utf8');
    for (const args of [['--packs', '05'], [canonicalDirectory, '--packs', '05']]) {
      const result = spawnSync(process.execPath, [script.pathname, ...args], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /separate staging directory/);
    }
    assert.equal(await readFile(join(canonicalDirectory, 'profile-identity-map.json'), 'utf8'), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('committed seed profiles display their workshop number while preserving the identity map', async () => {
  const records = (await readFile(new URL('udl/liberty-mutual-profiles.jsonl', fixture), 'utf8')).trim().split('\n').map(JSON.parse);
  const { mapping } = JSON.parse(await readFile(new URL('udl/profile-identity-map.json', fixture), 'utf8'));
  assert.equal(records.length, mapping.length);
  assert.equal(new Set(records.map((record) => record.id)).size, records.length);
  const byIdentifier = new Map(records.map((record) => [record.identifiers[0].id, record]));
  assert.equal(byIdentifier.size, records.length);
  for (const identity of mapping) {
    const record = byIdentifier.get(identity.identifier);
    assert.ok(record);
    const agent = agents.find((entry) => entry.id === identity.agentId);
    assert.deepEqual(record.contact, { firstName: agent.firstName, lastName: `${agent.lastName} - ${identity.reviewerPack}` });
    assert.deepEqual(record.identifiers, [{ provider: identity.provider, id: identity.identifier }]);
    assert.equal(record.extensions.reviewerPack, identity.reviewerPack);
    assert.equal(record.extensions.agentId, identity.agentId);
    assert.equal(record.extensions.profileGeneration, identity.generation);
  }
});
