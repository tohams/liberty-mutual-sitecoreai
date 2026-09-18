import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const sourcePath = new URL('../fixtures/portal-logins.json', import.meta.url);
const targetPath = new URL('../fixtures/portal-credentials.json', import.meta.url);
const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const previous = await readFile(targetPath, 'utf8').then(JSON.parse).catch((error) => {
  if (error.code === 'ENOENT') return { logins: [] };
  throw error;
});
const logins = source.logins.map(({ password, ...identity }) => {
  if (typeof password !== 'string' || password.length < 8) throw new Error(`Invalid fixture password for ${identity.username}`);
  const existing = previous.logins.find((entry) => entry.username === identity.username);
  if (existing?.algorithm === 'scrypt-16384-8-1' && /^[a-f0-9]{32}$/.test(existing.salt) && /^[a-f0-9]{128}$/.test(existing.passwordHash)) {
    const currentHash = scryptSync(password, existing.salt, 64, { N: 16384, r: 8, p: 1 });
    if (timingSafeEqual(currentHash, Buffer.from(existing.passwordHash, 'hex'))) {
      // Adding reviewers must not churn hashes for unchanged credentials.
      return { ...identity, algorithm: existing.algorithm, salt: existing.salt, passwordHash: existing.passwordHash };
    }
  }
  const salt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { ...identity, algorithm: 'scrypt-16384-8-1', salt, passwordHash };
});
await writeFile(targetPath, JSON.stringify({ schemaVersion: 1, logins }, null, 2) + '\n', { mode: 0o600 });
console.log(`Provisioned ${logins.length} server-only credential records. No passwords were logged.`);
