import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseEnv } from 'node:util';
import { setupLocal } from './setup-local.mjs';

async function appDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'portal-local-setup-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'liberty-mutual-agent-portal' }));
  return directory;
}

test('fresh setup supplies distinct approved contexts, isolated state and independent secrets', async t => {
  const directory = await appDirectory(t);
  assert.equal(await setupLocal(directory, {}), 'created');
  const text = await readFile(join(directory, '.env.local'), 'utf8');
  const values = parseEnv(text);
  assert.equal(values.SITECORE_EDGE_CONTEXT_ID, '1bgqAWOiQogyKMCKoecyEY');
  assert.equal(values.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID, '6SCkrPfaQoiQEiAK6wMIEe');
  assert.notEqual(values.SITECORE_EDGE_CONTEXT_ID, values.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID);
  assert.equal(values.PORTAL_STATE_ADAPTER, 'local-json');
  assert.equal(values.PORTAL_CONTENT_ADAPTER, 'sitecore');
  assert.equal(values.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED, 'false');
  assert.equal(Object.keys(values).some(key => key.startsWith('KV_') || key.startsWith('PORTAL_REDIS_')), false);
  const secrets = ['SITECORE_EDITING_SECRET', 'PORTAL_SESSION_SECRET', 'PORTAL_OPERATOR_SECRET'].map(key => values[key]);
  secrets.forEach(value => assert.match(value, /^[0-9a-f]{64}$/));
  assert.equal(new Set(secrets).size, 3);
  if (process.platform !== 'win32') assert.equal((await stat(join(directory, '.env.local'))).mode & 0o777, 0o600);
  assert.equal(await setupLocal(directory, {}), 'unchanged');
  assert.equal(await readFile(join(directory, '.env.local'), 'utf8'), text);
  const other = await appDirectory(t);
  await setupLocal(other, {});
  assert.notEqual(await readFile(join(other, '.env.local'), 'utf8'), text);
});

test('configured custom contexts and all other text are preserved byte for byte', async t => {
  const directory = await appDirectory(t);
  const existing = '# Keep my environment\r\nexport SITECORE_EDGE_CONTEXT_ID="custom-server" # server\r\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=custom-browser\r\nPORTAL_SESSION_SECRET=keep-me';
  await writeFile(join(directory, '.env.local'), existing);
  assert.equal(await setupLocal(directory, {}), 'unchanged');
  assert.equal(await readFile(join(directory, '.env.local'), 'utf8'), existing);
});

test('upgrading helper blanks preserves generated secrets, namespace and every other line', async t => {
  const directory = await appDirectory(t);
  await setupLocal(directory, {});
  const file = join(directory, '.env.local');
  const baseline = await readFile(file, 'utf8');
  const blank = baseline.replace(/^((?:NEXT_PUBLIC_)?SITECORE_EDGE_CONTEXT_ID)=.*$/gm, '$1=');
  await writeFile(file, blank);
  assert.equal(await setupLocal(directory, {}), 'updated');
  assert.equal(await readFile(file, 'utf8'), baseline);
  assert.equal(await setupLocal(directory, {}), 'unchanged');
});

test('blank quoted/commented contexts retain CRLF, comments, unrelated values and existing mode', async t => {
  const directory = await appDirectory(t);
  const file = join(directory, '.env.local');
  const existing = '# Preserve this comment\r\nexport SITECORE_EDGE_CONTEXT_ID=\'\' # server\r\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID= # browser\r\nPORTAL_OPERATOR_SECRET=unchanged';
  await writeFile(file, existing);
  if (process.platform !== 'win32') await chmod(file, 0o640);
  assert.equal(await setupLocal(directory, {}), 'updated');
  const updated = await readFile(file, 'utf8');
  assert.equal(updated, existing.replace("SITECORE_EDGE_CONTEXT_ID=''", "SITECORE_EDGE_CONTEXT_ID='1bgqAWOiQogyKMCKoecyEY'").replace('NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID= #', 'NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID= 6SCkrPfaQoiQEiAK6wMIEe #'));
  if (process.platform !== 'win32') assert.equal((await stat(file)).mode & 0o777, 0o640);
});

test('missing contexts are appended without rewriting existing custom values or lookalike multiline text', async t => {
  const directory = await appDirectory(t);
  const file = join(directory, '.env.local');
  const existing = 'SITECORE_EDGE_CONTEXT_ID=custom-server\r\nNOTES="keep\r\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=\r\nthis text"';
  await writeFile(file, existing);
  assert.equal(await setupLocal(directory, {}), 'updated');
  assert.equal(await readFile(file, 'utf8'), existing + '\r\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=6SCkrPfaQoiQEiAK6wMIEe\r\n');
  const other = await appDirectory(t);
  await writeFile(join(other, '.env.local'), '# SITECORE_EDGE_CONTEXT_ID= is only a comment\nPORTAL_SESSION_SECRET=keep');
  assert.equal(await setupLocal(other, {}), 'updated');
  const values = parseEnv(await readFile(join(other, '.env.local'), 'utf8'));
  assert.equal(values.PORTAL_SESSION_SECRET, 'keep');
  assert.ok(values.SITECORE_EDGE_CONTEXT_ID);
  assert.ok(values.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID);
});

test('blank double/backtick quotes and multiline lookalikes are handled without touching unrelated text', async t => {
  const directory = await appDirectory(t);
  const file = join(directory, '.env.local');
  const existing = 'NOTES="keep\nSITECORE_EDGE_CONTEXT_ID=inside\nthis"\nSITECORE_EDGE_CONTEXT_ID="  " # retain\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=``\n';
  await writeFile(file, existing);
  assert.equal(await setupLocal(directory, {}), 'updated');
  const updated = await readFile(file, 'utf8');
  assert.equal(parseEnv(updated).NOTES, parseEnv(existing).NOTES);
  assert.equal(updated, existing.replace('SITECORE_EDGE_CONTEXT_ID="  "', 'SITECORE_EDGE_CONTEXT_ID="1bgqAWOiQogyKMCKoecyEY"').replace('NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=``', 'NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=`6SCkrPfaQoiQEiAK6wMIEe`'));
});

test('duplicates, multiline blanks and colliding contexts fail without changing an existing file', async t => {
  for (const existing of [
    'SITECORE_EDGE_CONTEXT_ID=custom\nSITECORE_EDGE_CONTEXT_ID=\n',
    'SITECORE_EDGE_CONTEXT_ID="\n"\n',
    'SITECORE_EDGE_CONTEXT_ID=same\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=same\n',
    'SITECORE_EDGE_CONTEXT_ID=6SCkrPfaQoiQEiAK6wMIEe\n',
  ]) {
    const directory = await appDirectory(t);
    const file = join(directory, '.env.local');
    await writeFile(file, existing);
    await assert.rejects(setupLocal(directory, {}));
    assert.equal(await readFile(file, 'utf8'), existing);
  }
});

test('inherited Redis settings block setup without revealing their values or creating a file', async t => {
  for (const key of ['PORTAL_REDIS_REST_URL', 'PORTAL_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) {
    const directory = await appDirectory(t);
    await assert.rejects(setupLocal(directory, { [key]: 'sensitive-test-value' }), error =>
      error.message.includes(key) && !error.message.includes('sensitive-test-value'));
    await assert.rejects(readFile(join(directory, '.env.local')), { code: 'ENOENT' });
  }
});

test('setup rejects deployed/production execution and the wrong application directory', async t => {
  const directory = await appDirectory(t);
  await assert.rejects(setupLocal(directory, { VERCEL: '1' }), /developer workstation/);
  await assert.rejects(setupLocal(directory, { NODE_ENV: 'production' }), /developer workstation/);
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'another-app' }));
  await assert.rejects(setupLocal(directory, {}), /examples\/liberty-mutual-agent-portal/);
  await assert.rejects(readFile(join(directory, '.env.local')), { code: 'ENOENT' });
});

test('inherited Redis protections also preserve an existing file awaiting an upgrade', async t => {
  const directory = await appDirectory(t);
  const file = join(directory, '.env.local');
  const existing = 'SITECORE_EDGE_CONTEXT_ID=\nNEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=\n';
  await writeFile(file, existing);
  await assert.rejects(setupLocal(directory, { KV_REST_API_TOKEN: 'sensitive-test-value' }), /inherited Redis/);
  assert.equal(await readFile(file, 'utf8'), existing);
});
