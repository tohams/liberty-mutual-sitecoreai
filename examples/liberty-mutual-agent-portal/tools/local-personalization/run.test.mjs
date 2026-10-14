import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import net from 'node:net';
import { parseArguments, checkLocalEnvironment, buildChildEnvironment, requireFreeApplicationPort } from './run.mjs';

const driver = fileURLToPath(new URL('./run.mjs', import.meta.url));
const baseEnvironment = {
  SITECORE_EDGE_CONTEXT_ID: 'test-server-context',
  NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: 'test-browser-context',
  NEXT_PUBLIC_DEFAULT_SITE_NAME: 'liberty-mutual-agent-portal',
};
const settings = {
  namespace: 'local-personalization-123456abcdef',
  token: 'a'.repeat(64), sessionSecret: 'b'.repeat(64), operatorSecret: 'c'.repeat(64),
  caFile: '/test/public-rootCA.pem', httpsPort: 3300, appPort: 3301, storePort: 6381,
};
async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'lm-local-runner-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
function cleanEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    !/^(?:PORTAL_|KV_|VERCEL|SITECORE_|NEXT_PUBLIC_|NODE_ENV|NODE_EXTRA_CA_CERTS)/.test(name)));
}
async function fixtureApp(directory, name = 'app') {
  const app = join(directory, name);
  await mkdir(join(app, 'src/app/api/portal/identity'), { recursive: true });
  await writeFile(join(app, 'src/app/api/portal/identity/route.ts'), '// test fixture');
  await writeFile(join(app, 'package.json'), JSON.stringify({ name: 'liberty-mutual-agent-portal' }));
  await mkdir(join(app, 'node_modules/@next/env'), { recursive: true });
  await writeFile(join(app, 'node_modules/@next/env/index.js'),
    `module.exports = { loadEnvConfig() { return { combinedEnv: { ...process.env, ...${JSON.stringify(baseEnvironment)} } }; } };`);
  await writeFile(join(app, '.env.local'), '# Original local settings remain untouched\nTEST_SENTINEL=retain\n');
  execFileSync('git', ['init', '--quiet', app], { stdio: 'ignore' });
  return app;
}
function execute(app, args, environment = cleanEnvironment()) {
  return spawnSync(process.execPath, [driver, ...args], { cwd: app, env: environment, encoding: 'utf8' });
}

test('CLI accepts deliberate local ports and rejects ambiguous or unsafe arguments', () => {
  assert.deepEqual(parseArguments(['start']), { action: 'start', ports: { httpsPort: 3000, appPort: 3001, storePort: 6380 }, caFile: undefined });
  assert.deepEqual(parseArguments(['prepare', '--https-port', '3300', '--app-port', '3301', '--store-port', '6381', '--ca-file', 'public-rootCA.pem']),
    { action: 'prepare', ports: { httpsPort: 3300, appPort: 3301, storePort: 6381 }, caFile: 'public-rootCA.pem' });
  for (const args of [
    [], ['deploy'], ['start', '--https-port', '3300'], ['build', '--ca-file', 'root.pem'],
    ['prepare', '--unknown', '1'], ['prepare', '--app-port'], ['prepare', '--app-port', '3301', '--app-port', '3302'],
    ['prepare', '--app-port', '3000'], ['prepare', '--app-port', '1023'], ['prepare', '--app-port', '65536'],
    ['prepare', '--app-port', '1e4'], ['prepare', '--app-port', '3001; exit'],
  ]) assert.throws(() => parseArguments(args));
});

test('environment checks refuse Vercel, cloud Redis, malformed contexts, and shared scope', () => {
  assert.doesNotThrow(() => checkLocalEnvironment(baseEnvironment));
  assert.doesNotThrow(() => checkLocalEnvironment({ ...baseEnvironment, PORTAL_REDIS_REST_URL: 'https://localhost:6380' }));
  for (const addition of [
    { VERCEL: '1' }, { VERCEL: '0' }, { PORTAL_REDIS_REST_URL: 'https://remote.example/secret-path' },
    { KV_REST_API_URL: 'https://private-user:private-password@localhost:6380' },
    { PORTAL_REDIS_REST_URL: 'http://localhost:6380' }, { PORTAL_REDIS_REST_URL: 'not a URL' },
    { NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: 'test-server-context' }, { SITECORE_EDGE_CONTEXT_ID: ' test-server-context' },
    { NEXT_PUBLIC_DEFAULT_SITE_NAME: '' },
  ]) assert.throws(() => checkLocalEnvironment({ ...baseEnvironment, ...addition }));
  try { checkLocalEnvironment({ ...baseEnvironment, KV_REST_API_URL: 'https://private-user:private-password@remote.example/secret-path' }); }
  catch (error) {
    for (const privateText of ['private-user', 'private-password', 'secret-path']) assert.equal(error.message.includes(privateText), false);
  }
});

test('build and runtime use identical explicit tracking and isolated workspace configuration', () => {
  const inherited = { ...baseEnvironment, NEXT_PUBLIC_PORTAL_TRACKING_ENABLED: 'false', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    PORTAL_SESSION_SECRET: 'old-session', PORTAL_OPERATOR_SECRET: 'old-operator', PORTAL_ENVIRONMENT: 'remote-production',
    PORTAL_REDIS_REST_URL: 'https://localhost:9999', PORTAL_REDIS_REST_TOKEN: 'old-token',
    KV_REST_API_URL: 'https://remote.example', KV_REST_API_TOKEN: 'old-cloud-token', KV_REST_API_READ_ONLY_TOKEN: 'old-readonly-token',
    VERCEL: '1', VERCEL_ENV: 'production', PATH: '/original/path', NODE_ENV: 'development',
    PORTAL_PERSONALIZATION_DIAGNOSTICS: 'true', PORTAL_VERIFIED_PROFILE_GENERATIONS: '0,1,2,3' };
  const original = structuredClone(inherited);
  const child = buildChildEnvironment(inherited, settings, '/workshop/application');
  assert.deepEqual(inherited, original, 'Parent environment remains unchanged.');
  assert.equal(child.NODE_ENV, 'production');
  assert.equal(child.NEXT_PUBLIC_PORTAL_TRACKING_ENABLED, 'true');
  assert.equal(child.NEXT_PUBLIC_SITE_URL, 'https://localhost:3300');
  assert.equal(child.PORTAL_REDIS_REST_URL, 'https://localhost:6381');
  assert.equal(child.PORTAL_REDIS_REST_TOKEN, settings.token);
  assert.equal(child.PORTAL_SESSION_SECRET, settings.sessionSecret);
  assert.equal(child.PORTAL_OPERATOR_SECRET, settings.operatorSecret);
  assert.equal(child.PORTAL_ENVIRONMENT, settings.namespace);
  assert.equal(child.PORTAL_STATE_ADAPTER, 'redis');
  assert.equal(child.PORTAL_CONTENT_ADAPTER, 'sitecore');
  assert.equal(child.PORTAL_VERIFIED_PROFILE_GENERATIONS, '0');
  assert.equal(child.PORTAL_PERSONALIZATION_DIAGNOSTICS, 'false');
  assert.equal(child.NODE_EXTRA_CA_CERTS, settings.caFile);
  assert.equal(child.PWD, '/workshop/application');
  assert.ok(child.PATH.startsWith(dirname(process.execPath)));
  for (const name of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_REST_API_READ_ONLY_TOKEN', 'VERCEL', 'VERCEL_ENV']) assert.equal(child[name], undefined);
  assert.equal(child.SITECORE_EDGE_CONTEXT_ID, baseEnvironment.SITECORE_EDGE_CONTEXT_ID);
  assert.equal(child.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID, baseEnvironment.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID);
});

test('prepare generates private settings once per workspace, preserves env, and excludes private files locally', async t => {
  const directory = await temporary(t);
  const app = await fixtureApp(directory);
  const secondApp = await fixtureApp(directory, 'second-app');
  const caFile = join(directory, 'public-rootCA.pem');
  const arguments_ = ['prepare', '--ca-file', caFile, '--https-port', '3300', '--app-port', '3301', '--store-port', '6381'];
  const first = execute(app, arguments_);
  assert.equal(first.status, 0, first.stderr);
  const path = join(app, '.portal-local-production/settings.json');
  const initialBytes = await readFile(path, 'utf8');
  const initial = JSON.parse(initialBytes);
  assert.match(initial.namespace, /^local-personalization-[a-f0-9]{12}$/);
  for (const name of ['token', 'sessionSecret', 'operatorSecret']) {
    assert.match(initial[name], /^[a-f0-9]{64}$/);
    assert.equal((first.stdout + first.stderr).includes(initial[name]), false);
  }
  assert.equal(new Set([initial.token, initial.sessionSecret, initial.operatorSecret]).size, 3);
  assert.equal(execute(app, arguments_).status, 0);
  assert.equal(await readFile(path, 'utf8'), initialBytes);
  assert.equal(await readFile(join(app, '.env.local'), 'utf8'), '# Original local settings remain untouched\nTEST_SENTINEL=retain\n');
  const excludes = await readFile(join(app, '.git/info/exclude'), 'utf8');
  assert.ok(excludes.includes('/.portal-local-production/\n'));
  assert.ok(excludes.includes('/certificates/\n'));
  assert.equal(excludes.match(/^\/\.portal-local-production\/$/gm)?.length, 1);
  assert.equal(execute(secondApp, arguments_).status, 0);
  const second = JSON.parse(await readFile(join(secondApp, '.portal-local-production/settings.json'), 'utf8'));
  for (const name of ['namespace', 'token', 'sessionSecret', 'operatorSecret']) assert.notEqual(initial[name], second[name]);
  if (process.platform !== 'win32') {
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal((await stat(join(app, '.portal-local-production'))).mode & 0o777, 0o700);
  }
});

test('prepare refuses silent port/CA changes and malformed secret-bearing settings', async t => {
  const directory = await temporary(t);
  const app = await fixtureApp(directory);
  const caFile = join(directory, 'public-rootCA.pem');
  assert.equal(execute(app, ['prepare', '--ca-file', caFile]).status, 0);
  const path = join(app, '.portal-local-production/settings.json');
  const before = await readFile(path, 'utf8');
  assert.equal(execute(app, ['prepare', '--ca-file', caFile, '--https-port', '3300']).status, 1);
  assert.equal(execute(app, ['prepare', '--ca-file', caFile + '.different']).status, 1);
  assert.equal(await readFile(path, 'utf8'), before);
  const marker = 'PRIVATE_TEST_MARKER_DO_NOT_PRINT';
  await writeFile(path, `{"token":"${marker}",broken`);
  const result = execute(app, ['prepare', '--ca-file', caFile]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Local settings are invalid/);
  assert.equal((result.stdout + result.stderr).includes(marker), false);
});

test('main refuses missing identity code before creating local settings', async t => {
  const directory = await temporary(t);
  const app = await fixtureApp(directory);
  await rm(join(app, 'src/app/api/portal/identity/route.ts'));
  const result = execute(app, ['prepare', '--ca-file', join(directory, 'public-rootCA.pem')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Update your repository to include the login-readiness fix/);
  await assert.rejects(stat(join(app, '.portal-local-production')));
});

test('application port preflight refuses an occupied localhost port and releases a free one', async t => {
  const occupied = net.createServer();
  const listen = (server, port) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, 'localhost', () => { server.off('error', reject); resolve(); });
  });
  const close = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await listen(occupied, 0);
  const port = occupied.address().port;
  t.after(() => { if (occupied.listening) return close(occupied); });
  await assert.rejects(requireFreeApplicationPort(port), new RegExp(`Localhost port ${port} is unavailable`));
  assert.equal(occupied.listening, true, 'The helper must not stop an existing server.');
  await close(occupied);
  await requireFreeApplicationPort(port);
  const nextServer = net.createServer();
  t.after(() => { if (nextServer.listening) return close(nextServer); });
  await listen(nextServer, port);
  assert.equal(nextServer.address().port, port, 'Preflight does not keep the free application port reserved.');
});
