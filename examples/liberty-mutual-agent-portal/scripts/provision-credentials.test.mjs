import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scryptSync } from 'node:crypto';

const fixtures = new URL('../fixtures/', import.meta.url);
const source = JSON.parse(await readFile(new URL('portal-logins.json', fixtures), 'utf8'));
const credentials = JSON.parse(await readFile(new URL('portal-credentials.json', fixtures), 'utf8'));

test('adding a reviewer preserves existing credentials and repeated provisioning is stable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portal-credential-provision-'));
  try {
    await mkdir(join(directory, 'scripts'));
    await mkdir(join(directory, 'fixtures'));
    const script = join(directory, 'scripts', 'provision-credentials.mjs');
    const target = join(directory, 'fixtures', 'portal-credentials.json');
    await copyFile(new URL('./provision-credentials.mjs', import.meta.url), script);
    const existing = credentials.logins.filter((entry) => ['avery.01', 'maya.15'].includes(entry.username));
    const newLogin = source.logins.find((entry) => entry.username === 'maya.20');
    assert.ok(newLogin);
    const logins = [...existing.map((credential) => source.logins.find((entry) => entry.username === credential.username)), newLogin];
    await writeFile(join(directory, 'fixtures', 'portal-logins.json'), JSON.stringify({ schemaVersion: 1, logins }));
    await writeFile(target, JSON.stringify({ schemaVersion: 1, logins: existing }));

    const provision = () => {
      const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.includes(newLogin.password), false, 'Provisioning never logs passwords');
    };
    provision();
    const first = await readFile(target, 'utf8');
    const provisioned = JSON.parse(first).logins;
    assert.deepEqual(provisioned.slice(0, existing.length), existing, 'Existing identity, salt, and hash records are retained exactly');
    const added = provisioned.at(-1);
    const { password, ...identity } = newLogin;
    assert.deepEqual(added, {
      ...identity,
      algorithm: 'scrypt-16384-8-1',
      salt: added.salt,
      passwordHash: scryptSync(password, added.salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex'),
    });
    assert.match(added.salt, /^[a-f0-9]{32}$/);
    assert.equal(new Set(provisioned.map((entry) => entry.salt)).size, provisioned.length);
    provision();
    assert.equal(await readFile(target, 'utf8'), first, 'Rerunning provisioning does not churn existing credentials');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
