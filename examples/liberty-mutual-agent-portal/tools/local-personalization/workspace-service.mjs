import https from 'node:https';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, chmod, open, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const MAX_BODY = 64 * 1024;
const CAS_HASH = '75f8f50de8678b6aafbe9e0b032f393447e0866090415b6969327e105ac61815';
const PERSIST_HASH = '1e2ab8484f257d5904e9962e250112c7229afa6c71b0c36166b922216b4974b6';
class RejectedCommand extends Error {}
const requireValid = value => { if (!value) throw new RejectedCommand('Command rejected'); };
const digest = value => createHash('sha256').update(value).digest('hex');

function validatePrefix(prefix) {
  requireValid(typeof prefix === 'string' && /^lm-portal:v1:[a-z0-9-]{3,60}:$/.test(prefix));
}
function validKey(key, prefix) {
  return typeof key === 'string' && key.startsWith(prefix) && key.length > prefix.length &&
    key.length <= 512 && /^[a-zA-Z0-9:_.-]+$/.test(key);
}
function record(raw) {
  requireValid(typeof raw === 'string' && Buffer.byteLength(raw) <= MAX_BODY);
  const value = JSON.parse(raw);
  requireValid(value && typeof value === 'object' && !Array.isArray(value) &&
    Number.isSafeInteger(value.version) && value.version >= 0 &&
    (value.expiresAt === null || (Number.isSafeInteger(value.expiresAt) && value.expiresAt >= 0)) &&
    Object.hasOwn(value, 'value'));
  return value;
}
function commandType(command, prefix) {
  requireValid(Array.isArray(command) && Buffer.byteLength(JSON.stringify(command)) <= MAX_BODY);
  if (command[0] === 'GET') {
    requireValid(command.length === 2 && validKey(command[1], prefix));
    return 'get';
  }
  requireValid(command[0] === 'EVAL' && command[2] === 1 && validKey(command[3], prefix) && typeof command[1] === 'string');
  const hash = digest(command[1]);
  if (hash === CAS_HASH) {
    requireValid(command.length === 7 && Number.isSafeInteger(command[4]) && command[4] >= -1 &&
      (command[6] === 'persistent' || (Number.isSafeInteger(command[6]) && command[6] > 0 && command[6] <= 86400)));
    const payload = record(command[5]);
    requireValid(payload.version === command[4] + 1 && (command[6] !== 'persistent' || payload.expiresAt === null));
    return 'cas';
  }
  requireValid(hash === PERSIST_HASH && command.length === 6);
  const before = record(command[4]);
  const after = record(command[5]);
  requireValid(before.version === after.version && after.expiresAt === null);
  // Persistence may change expiration, never the workspace's value or version.
  requireValid(JSON.stringify({ ...before, expiresAt: null }) === command[5] || command[4] === command[5]);
  return 'persist';
}

/** Minimal local implementation of the portal's exact Redis REST commands. */
export class WorkspaceFixtureStore {
  constructor(directory, keyPrefix, now = () => Date.now()) {
    validatePrefix(keyPrefix);
    this.directory = resolve(directory);
    this.path = join(this.directory, 'records.json');
    this.keyPrefix = keyPrefix;
    this.now = now;
    this.entries = undefined;
    this.tail = Promise.resolve();
  }
  async load() {
    if (this.entries) return;
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await chmod(this.directory, 0o700);
    let encoded;
    try { encoded = await readFile(this.path, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const entries = new Map();
    if (encoded === undefined) { this.entries = entries; return; }
    const state = JSON.parse(encoded);
    requireValid(state.schemaVersion === 1 && Array.isArray(state.entries));
    for (const pair of state.entries) {
      requireValid(Array.isArray(pair) && pair.length === 2);
      const [key, entry] = pair;
      requireValid(validKey(key, this.keyPrefix) && !entries.has(key) && entry && typeof entry.raw === 'string' &&
        (entry.expiresAt === null || (Number.isSafeInteger(entry.expiresAt) && entry.expiresAt >= 0)));
      record(entry.raw);
      entries.set(key, entry);
    }
    await chmod(this.path, 0o600);
    this.entries = entries;
  }
  async save(entries) {
    const temporary = `${this.path}.${randomBytes(8).toString('hex')}.tmp`;
    let file;
    try {
      file = await open(temporary, 'wx', 0o600);
      await file.writeFile(JSON.stringify({ schemaVersion: 1, entries: [...entries] }));
      await file.sync();
      await file.close();
      file = undefined;
      await rename(temporary, this.path);
      let directory;
      try { directory = await open(this.directory, 'r'); await directory.sync(); }
      catch (error) {
        // Windows does not support directory fsync; the file is still flushed.
        if (process.platform !== 'win32' || !['EINVAL', 'EPERM', 'EISDIR', 'EBADF'].includes(error.code)) throw error;
      } finally { if (directory) await directory.close(); }
    } finally {
      if (file) await file.close();
      try { await unlink(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  execute(command) {
    const operation = this.tail.then(async () => {
      const type = commandType(command, this.keyPrefix);
      await this.load();
      const entries = new Map(this.entries);
      const now = this.now();
      let changed = false;
      for (const [key, entry] of entries) {
        if (entry.expiresAt !== null && entry.expiresAt <= now) { entries.delete(key); changed = true; }
      }
      const key = command[type === 'get' ? 1 : 3];
      const current = entries.get(key);
      let result = null;
      if (type === 'get') result = current?.raw ?? null;
      else if (type === 'cas') {
        const version = current ? record(current.raw).version : -1;
        if (version === command[4]) {
          entries.set(key, { raw: command[5], expiresAt: command[6] === 'persistent' ? null : now + command[6] * 1000 });
          result = command[5]; changed = true;
        }
      } else if (current && current.raw === command[4]) {
        entries.set(key, { raw: command[5], expiresAt: null });
        result = [command[5], -1]; changed = true;
      }
      if (changed) {
        try { await this.save(entries); }
        catch (error) { this.entries = undefined; throw error; }
        this.entries = entries;
      }
      return result;
    });
    this.tail = operation.then(() => {}, () => {});
    return operation;
  }
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    requireValid(size <= MAX_BODY);
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' });
  response.end(JSON.stringify(body));
}

/** Returns an unstarted server; the caller must listen only on localhost. */
export function createWorkspaceServer({ stateDirectory, keyPrefix, token, cert, key, port, hostname = 'localhost' }) {
  requireValid(hostname === 'localhost' && Number.isInteger(port) && port > 0 && port <= 65535);
  requireValid(typeof token === 'string' && /^[a-f0-9]{64}$/.test(token));
  validatePrefix(keyPrefix);
  const store = new WorkspaceFixtureStore(stateDirectory, keyPrefix);
  const expected = Buffer.from(`Bearer ${token}`);
  const server = https.createServer({ cert, key, minVersion: 'TLSv1.2' }, async (request, response) => {
    try {
      const authorization = Buffer.from(typeof request.headers.authorization === 'string' ? request.headers.authorization : '');
      if (authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
        send(response, 401, { error: 'Unauthorized local workspace request' }); return;
      }
      if (request.method !== 'POST' || request.url !== '/' || request.headers.host !== `${hostname}:${port}` ||
          request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
        send(response, 400, { error: 'Unsupported local workspace request' }); return;
      }
      const declared = request.headers['content-length'];
      if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY)) {
        send(response, 413, { error: 'Local workspace request is too large' }); return;
      }
      send(response, 200, { result: await store.execute(await readBody(request)) });
    } catch (error) {
      if (!response.destroyed) send(response, error instanceof RejectedCommand || error instanceof SyntaxError ? 400 : 503,
        { error: 'Local workspace request failed' });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return server;
}
