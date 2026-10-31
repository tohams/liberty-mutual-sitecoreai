import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createWorkspaceServer, WorkspaceFixtureStore, MAX_BODY } from './workspace-service.mjs';
import { createHttpsRelay } from './https-relay.mjs';

const CAS = `
local raw = redis.call('GET', KEYS[1])
local currentVersion = -1
if raw then currentVersion = cjson.decode(raw).version end
if currentVersion ~= tonumber(ARGV[1]) then return nil end
if ARGV[3] == 'persistent' then
  redis.call('SET', KEYS[1], ARGV[2])
else
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
end
return ARGV[2]
`;
const PERSIST = `
local raw = redis.call('GET', KEYS[1])
if not raw or raw ~= ARGV[1] then return nil end
if raw == ARGV[2] then
  redis.call('PERSIST', KEYS[1])
else
  redis.call('SET', KEYS[1], ARGV[2])
end
return {ARGV[2], redis.call('TTL', KEYS[1])}
`;
const prefix = 'lm-portal:v1:local-test-workspace:';
const record = (version, value, expiresAt = null) => JSON.stringify({ version, expiresAt, value });
const command = (key, expected, raw, ttl = 'persistent') => ['EVAL', CAS, 1, key, expected, raw, ttl];
async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'lm-local-personalization-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
async function listen(server, port = 0) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, 'localhost', () => { server.off('error', reject); resolve(); });
  });
  return server.address().port;
}
async function close(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
async function freePort() {
  const server = net.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}
async function certificate(directory) {
  const certPath = join(directory, 'localhost.pem');
  const keyPath = join(directory, 'localhost-key.pem');
  const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath,
    '-out', certPath, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { encoding: 'utf8' });
  assert.equal(result.status, 0, 'OpenSSL must generate the temporary test certificate.');
  return { cert: await readFile(certPath), key: await readFile(keyPath) };
}
function request(port, ca, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'localhost', servername: 'localhost', port, ca, method, path,
      headers: { host: `localhost:${port}`, ...headers } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('protocol allowlist matches the actual app Lua commands', () => {
  assert.equal(createHash('sha256').update(CAS).digest('hex'), '75f8f50de8678b6aafbe9e0b032f393447e0866090415b6969327e105ac61815');
  assert.equal(createHash('sha256').update(PERSIST).digest('hex'), '1e2ab8484f257d5904e9962e250112c7229afa6c71b0c36166b922216b4974b6');
});

test('CAS allows one concurrent winner and preserves exact bytes after restart', async t => {
  const directory = await temporary(t);
  const store = new WorkspaceFixtureStore(directory, prefix);
  const key = `${prefix}pack:01`;
  const raw = record(0, { empty: [], precision: 0.12345678901234568, message: 'Unicode café', large: 'a'.repeat(20000) });
  const results = await Promise.all([store.execute(command(key, -1, raw)), store.execute(command(key, -1, record(0, { other: true })))]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results[0], raw);
  assert.equal(await new WorkspaceFixtureStore(directory, prefix).execute(['GET', key]), raw);
  if (process.platform !== 'win32') {
    assert.equal((await stat(join(directory, 'records.json'))).mode & 0o777, 0o600);
    assert.equal((await stat(directory)).mode & 0o777, 0o700);
  }
});

test('TTL expires rate buckets; persistence retains workspace contents and version', async t => {
  const directory = await temporary(t);
  let now = 10000;
  const store = new WorkspaceFixtureStore(directory, prefix, () => now);
  const bucket = `${prefix}rate:01`;
  const pack = `${prefix}pack:01`;
  const before = record(0, { empty: [], count: 123.456 }, 11000);
  await store.execute(command(bucket, -1, before, 1));
  await store.execute(command(pack, -1, before, 1));
  const after = JSON.stringify({ ...JSON.parse(before), expiresAt: null });
  assert.deepEqual(await store.execute(['EVAL', PERSIST, 1, pack, before, after]), [after, -1]);
  now = 12000;
  assert.equal(await store.execute(['GET', bucket]), null);
  assert.equal(await store.execute(['GET', pack]), after);
  assert.equal(await new WorkspaceFixtureStore(directory, prefix, () => now).execute(['GET', pack]), after);
});

test('rejects commands outside exact Lua scripts, namespace, sizes, and safe versions', async t => {
  const store = new WorkspaceFixtureStore(await temporary(t), prefix);
  const key = `${prefix}pack:01`;
  for (const invalid of [
    ['FLUSHALL'], ['GET', 'lm-portal:v1:someone-else:pack:01'], ['GET', prefix], ['GET', prefix + 'a'.repeat(512)],
    ['EVAL', 'return 1', 1, key, -1, record(0, {}), 'persistent'],
    command(key, -1, record(2, {})), command(key, -1, record(0, {}, 1)),
    command(key, -1, record(0, 'a'.repeat(MAX_BODY))), command(key, -1, record(0, {}), 86401),
    ['EVAL', PERSIST, 1, key, record(0, { a: 1 }), record(0, { a: 2 })],
  ]) await assert.rejects(store.execute(invalid));
  assert.equal(await store.execute(['GET', key]), null);
});

test('workspace HTTPS requires bearer, localhost Host, exact path, and bounded body', async t => {
  const directory = await temporary(t);
  const tls = await certificate(directory);
  const port = await freePort();
  const token = randomBytes(32).toString('hex');
  const server = createWorkspaceServer({ ...tls, stateDirectory: join(directory, 'state'), keyPrefix: prefix, token, port });
  await listen(server, port);
  t.after(() => close(server));
  const authorized = { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(['GET', `${prefix}pack:01`]) };
  const ok = await request(port, tls.cert, authorized);
  assert.equal(ok.status, 200);
  assert.deepEqual(JSON.parse(ok.body), { result: null });
  assert.equal((await request(port, tls.cert, { ...authorized, headers: { ...authorized.headers, authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await request(port, tls.cert, { ...authorized, headers: { ...authorized.headers, host: `127.0.0.1:${port}` } })).status, 400);
  assert.equal((await request(port, tls.cert, { ...authorized, path: '/pipeline' })).status, 400);
  assert.equal((await request(port, tls.cert, { ...authorized, body: 'not json' })).status, 400);
  assert.equal((await request(port, tls.cert, { ...authorized, body: JSON.stringify(['GET', 'foreign']) })).status, 400);
  assert.equal((await request(port, tls.cert, { ...authorized, headers: { ...authorized.headers, 'content-length': String(MAX_BODY + 1) }, body: 'a'.repeat(MAX_BODY + 1) })).status, 413);
});

test('relay verifies original origin, translates loopback origin, and preserves cookies and redirects', async t => {
  const directory = await temporary(t);
  const tls = await certificate(directory);
  const received = [];
  const app = http.createServer((req, res) => {
    received.push({ headers: req.headers, path: req.url });
    res.writeHead(302, { 'Set-Cookie': ['one=1; Secure; SameSite=None', 'two=2; HttpOnly'],
      Location: `${req.url === '/plain' ? 'http' : 'https'}://localhost:${app.address().port}/login?next=%2F`,
      Connection: 'keep-alive, x-remove-response', 'X-Remove-Response': 'removed' });
    res.end('response');
  });
  const appPort = await listen(app);
  t.after(() => close(app));
  const httpsPort = await freePort();
  const relay = createHttpsRelay({ ...tls, appPort, httpsPort });
  await listen(relay, httpsPort);
  t.after(() => close(relay));
  const origin = `https://localhost:${httpsPort}`;
  const headers = { Origin: origin, Connection: 'keep-alive, x-remove-request', 'X-Remove-Request': 'remove',
    'X-Forwarded-For': '203.0.113.4', Forwarded: 'spoofed', 'X-VerCel-IP-Country': 'US' };
  const reply = await request(httpsPort, tls.cert, { method: 'POST', path: '/api/auth/login', headers, body: '{}' });
  assert.equal(reply.status, 302);
  assert.equal(reply.headers.location, origin + '/login?next=%2F');
  assert.deepEqual(reply.headers['set-cookie'], ['one=1; Secure; SameSite=None', 'two=2; HttpOnly']);
  assert.equal(reply.headers['x-remove-response'], undefined);
  assert.equal(received[0].headers.origin, `https://localhost:${appPort}`);
  assert.equal(received[0].headers.host, `localhost:${httpsPort}`);
  assert.equal(received[0].headers['x-forwarded-host'], `localhost:${httpsPort}`);
  assert.equal(received[0].headers['x-forwarded-proto'], 'https');
  assert.equal(received[0].headers['x-forwarded-port'], String(httpsPort));
  for (const name of ['x-remove-request', 'x-forwarded-for', 'forwarded', 'x-vercel-ip-country']) assert.equal(received[0].headers[name], undefined);
  assert.equal((await request(httpsPort, tls.cert, { path: '/plain' })).headers.location, origin + '/login?next=%2F');
  const baseline = received.length;
  assert.equal((await request(httpsPort, tls.cert, { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await request(httpsPort, tls.cert, { headers: { Origin: 'https://foreign.example' } })).status, 403);
  assert.equal((await request(httpsPort, tls.cert, { headers: { Host: `foreign.example:${httpsPort}` } })).status, 400);
  assert.equal((await request(httpsPort, tls.cert, { path: '//foreign.example/' })).status, 400);
  assert.equal(received.length, baseline);
});

test('configurations cannot route outside localhost or reuse frontend/backend ports', () => {
  assert.throws(() => createHttpsRelay({ hostname: 'example.com', httpsPort: 3000, appPort: 3001 }));
  assert.throws(() => createHttpsRelay({ httpsPort: 3000, appPort: 3000 }));
  assert.throws(() => createWorkspaceServer({ hostname: '0.0.0.0', port: 6380, token: 'a'.repeat(64), keyPrefix: prefix }));
  assert.throws(() => createWorkspaceServer({ port: 6380, token: 'weak', keyPrefix: prefix }));
  assert.throws(() => new WorkspaceFixtureStore('.', 'foreign-prefix:'));
});
