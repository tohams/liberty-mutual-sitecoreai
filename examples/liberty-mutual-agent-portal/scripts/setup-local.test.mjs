import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setupLocal } from './setup-local.mjs';

async function appDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'portal-local-setup-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'liberty-mutual-agent-portal' }));
  return directory;
}

test('local setup isolates state, leaves context values blank and generates independent secrets', async t => {
  const directory = await appDirectory(t);
  assert.equal(await setupLocal(directory, {}), true);
  const text = await readFile(join(directory, '.env.local'), 'utf8');
  const values = Object.fromEntries(text.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
  assert.equal(values.SITECORE_EDGE_CONTEXT_ID, '');
  assert.equal(values.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID, '');
  assert.equal(values.PORTAL_STATE_ADAPTER, 'local-json');
  assert.equal(values.PORTAL_CONTENT_ADAPTER, 'sitecore');
  assert.equal(values.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED, 'false');
  assert.equal(Object.keys(values).some(key => key.startsWith('KV_') || key.startsWith('PORTAL_REDIS_')), false);
  const secrets = ['SITECORE_EDITING_SECRET', 'PORTAL_SESSION_SECRET', 'PORTAL_OPERATOR_SECRET'].map(key => values[key]);
  secrets.forEach(value => assert.match(value, /^[0-9a-f]{64}$/));
  assert.equal(new Set(secrets).size, 3);
  const other = await appDirectory(t);
  await setupLocal(other, {});
  assert.notEqual(await readFile(join(other, '.env.local'), 'utf8'), text);
});

test('running setup again preserves an existing environment file byte for byte', async t => {
  const directory = await appDirectory(t);
  const existing = 'SITECORE_EDGE_CONTEXT_ID=existing-private-value\r\n';
  await writeFile(join(directory, '.env.local'), existing);
  assert.equal(await setupLocal(directory, {}), false);
  assert.equal(await readFile(join(directory, '.env.local'), 'utf8'), existing);
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
