import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { PortalError } from '../errors';

export interface StoredValue<T> { version: number; expiresAt: number | null; value: T; }
export interface PersistenceResult<T> {
  before: StoredValue<T>;
  after: StoredValue<T>;
  persistent: true;
  redisTtlSeconds?: -1;
}
export interface StateStore {
  read<T>(key: string): Promise<StoredValue<T> | null>;
  compareAndSet<T>(key: string, expectedVersion: number | null, value: T, ttlSeconds: number | null): Promise<StoredValue<T> | null>;
  persist<T>(key: string): Promise<PersistenceResult<T> | null>;
}

/** Only reviewer metadata and agency records migrate; authentication buckets keep their TTL. */
export function isReviewerWorkspaceKey(key: string): boolean {
  return /^lm-portal:v1:[a-z0-9-]{3,60}:pack:\d{2}(?::run:[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}:agency:[a-z][a-z0-9-]{0,79})?$/.test(key);
}
function requireWorkspaceKey(key: string): void {
  if (!isReviewerWorkspaceKey(key)) throw new PortalError('INVALID_STATE_KEY', 'Only reviewer workspace records can be migrated.');
}
function expiration(key: string, ttlSeconds: number | null): number | null {
  return isReviewerWorkspaceKey(key) || ttlSeconds === null ? null : Date.now() + ttlSeconds * 1000;
}

/** Developer-only, cross-process file store. Atomic rename under an exclusive key lock. */
export class LocalJsonStateStore implements StateStore {
  constructor(private readonly directory: string) {}
  private path(key: string) { return join(this.directory, createHash('sha256').update(key).digest('hex') + '.json'); }
  private async raw<T>(key: string): Promise<StoredValue<T> | null> {
    try { return JSON.parse(await readFile(this.path(key), 'utf8')) as StoredValue<T>; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  private async write<T>(key: string, value: StoredValue<T>) {
    const temporaryPath = this.path(key) + '.' + randomUUID();
    try {
      await writeFile(temporaryPath, JSON.stringify(value), { mode: 0o600 });
      await rename(temporaryPath, this.path(key));
    } finally { await rm(temporaryPath, { force: true }); }
  }
  private async locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = this.path(key) + '.lock';
    let locked = false;
    for (let attempt = 0; attempt < 100 && !locked; attempt++) {
      try { await mkdir(lockPath); locked = true; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        await setTimeout(20);
      }
    }
    if (!locked) throw new PortalError('STATE_BUSY', 'Your workspace is busy. Please try again.', 503);
    try { return await operation(); }
    finally { await rm(lockPath, { recursive: true, force: true }); }
  }
  private async persistUnlocked<T>(key: string): Promise<PersistenceResult<T> | null> {
    const before = await this.raw<T>(key);
    if (!before) return null;
    const after = { ...before, expiresAt: null };
    if (before.expiresAt !== null) await this.write(key, after);
    return { before, after, persistent: true };
  }
  async persist<T>(key: string): Promise<PersistenceResult<T> | null> {
    requireWorkspaceKey(key);
    return this.locked(key, () => this.persistUnlocked<T>(key));
  }
  async read<T>(key: string): Promise<StoredValue<T> | null> {
    if (isReviewerWorkspaceKey(key)) return (await this.persist<T>(key))?.after ?? null;
    const item = await this.raw<T>(key);
    return item && (item.expiresAt === null || item.expiresAt > Date.now()) ? item : null;
  }
  async compareAndSet<T>(key: string, expectedVersion: number | null, value: T, ttlSeconds: number | null): Promise<StoredValue<T> | null> {
    return this.locked(key, async () => {
      // The lock is already held; do not call public read/persist recursively.
      const current = isReviewerWorkspaceKey(key) ? (await this.persistUnlocked<T>(key))?.after ?? null : await this.read<T>(key);
      if ((current?.version ?? null) !== expectedVersion) return null;
      const next = { version: (current?.version ?? -1) + 1, expiresAt: expiration(key, ttlSeconds), value };
      await this.write(key, next);
      return next;
    });
  }
}

const CAS_SCRIPT = `
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

// Compare exact original bytes. Never re-encode the payload with Lua cjson:
// that could change empty arrays or precision in existing saved work.
const PERSIST_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw or raw ~= ARGV[1] then return nil end
if raw == ARGV[2] then
  redis.call('PERSIST', KEYS[1])
else
  redis.call('SET', KEYS[1], ARGV[2])
end
return {ARGV[2], redis.call('TTL', KEYS[1])}
`;

/** Upstash-compatible HTTP Redis. Each migration/check/write is atomic in Redis. */
export class RedisStateStore implements StateStore {
  constructor(private readonly url: string, private readonly token: string) {
    if (new URL(url).protocol !== 'https:') throw new Error('Redis REST requires HTTPS.');
  }
  private async command<T>(command: (string | number)[]): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new PortalError('STATE_UNAVAILABLE', 'Your saved workspace is temporarily unavailable. Please try again.', 503);
    const body = await response.json() as { result?: T; error?: string };
    if (body.error || !('result' in body)) throw new PortalError('STATE_UNAVAILABLE', 'Your saved workspace is temporarily unavailable. Please try again.', 503);
    return body.result as T;
  }
  async persist<T>(key: string): Promise<PersistenceResult<T> | null> {
    requireWorkspaceKey(key);
    for (let attempt = 0; attempt < 5; attempt++) {
      const raw = await this.command<string | null>(['GET', key]);
      if (!raw) return null;
      const before = JSON.parse(raw) as StoredValue<T>;
      const after = { ...before, expiresAt: null };
      const encoded = before.expiresAt === null ? raw : JSON.stringify(after);
      const result = await this.command<[string, number] | null>(['EVAL', PERSIST_SCRIPT, 1, key, raw, encoded]);
      if (!result) continue; // A concurrent write won. Preserve and retry its newer value.
      if (result[1] !== -1) throw new PortalError('STATE_UNAVAILABLE', 'Workspace persistence could not be verified. Please try again.', 503);
      return { before, after: JSON.parse(result[0]) as StoredValue<T>, persistent: true, redisTtlSeconds: -1 };
    }
    throw new PortalError('VERSION_CONFLICT', 'Your workspace changed while its storage was upgraded. Please try again.', 409);
  }
  async read<T>(key: string): Promise<StoredValue<T> | null> {
    if (isReviewerWorkspaceKey(key)) return (await this.persist<T>(key))?.after ?? null;
    const raw = await this.command<string | null>(['GET', key]);
    if (!raw) return null;
    const item = JSON.parse(raw) as StoredValue<T>;
    return item.expiresAt === null || item.expiresAt > Date.now() ? item : null;
  }
  async compareAndSet<T>(key: string, expectedVersion: number | null, value: T, ttlSeconds: number | null): Promise<StoredValue<T> | null> {
    const workspace = isReviewerWorkspaceKey(key);
    if (workspace) await this.persist(key);
    const expiresAt = expiration(key, ttlSeconds);
    const next = { version: (expectedVersion ?? -1) + 1, expiresAt, value };
    const result = await this.command<string | null>(['EVAL', CAS_SCRIPT, 1, key, expectedVersion ?? -1, JSON.stringify(next), expiresAt === null ? 'persistent' : ttlSeconds!]);
    return result ? JSON.parse(result) as StoredValue<T> : null;
  }
}

export function getStateStore(): StateStore {
  const url = process.env.PORTAL_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.PORTAL_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return new RedisStateStore(url, token);
  if (process.env.PORTAL_STATE_ADAPTER === 'local-json' && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    return new LocalJsonStateStore(process.env.PORTAL_LOCAL_STATE_DIRECTORY ?? join(process.cwd(), '.portal-state'));
  }
  throw new PortalError('CONFIGURATION_REQUIRED', 'The portal workspace service is not configured.', 503);
}

export function stateNamespace(): string {
  const environment = process.env.PORTAL_ENVIRONMENT;
  if (!environment || !/^[a-z0-9-]{3,60}$/.test(environment)) throw new PortalError('CONFIGURATION_REQUIRED', 'The portal environment is not configured.', 503);
  return `lm-portal:v1:${environment}`;
}
