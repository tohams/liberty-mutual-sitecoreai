import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { PortalError } from '../errors';

export interface StoredValue<T> { version: number; expiresAt: number; value: T; }
export interface StateStore {
  read<T>(key: string): Promise<StoredValue<T> | null>;
  compareAndSet<T>(key: string, expectedVersion: number | null, value: T, ttlSeconds: number): Promise<StoredValue<T> | null>;
}

/** Developer-only, cross-process file store. Atomic rename under an exclusive key lock. */
export class LocalJsonStateStore implements StateStore {
  constructor(private readonly directory: string) {}
  private path(key: string) { return join(this.directory, createHash('sha256').update(key).digest('hex') + '.json'); }
  async read<T>(key: string): Promise<StoredValue<T> | null> {
    try {
      const item = JSON.parse(await readFile(this.path(key), 'utf8')) as StoredValue<T>;
      return item.expiresAt > Date.now() ? item : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
  async compareAndSet<T>(key: string, expectedVersion: number | null, value: T, ttlSeconds: number): Promise<StoredValue<T> | null> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const path = this.path(key);
    const lockPath = path + '.lock';
    let locked = false;
    for (let attempt = 0; attempt < 100 && !locked; attempt++) {
      try { await mkdir(lockPath); locked = true; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        await setTimeout(20);
      }
    }
    if (!locked) throw new PortalError('STATE_BUSY', 'Your workspace is busy. Please try again.', 503);
    const temporaryPath = path + '.' + randomUUID();
    try {
      const current = await this.read<T>(key);
      if ((current?.version ?? null) !== expectedVersion) return null;
      const next = { version: (current?.version ?? -1) + 1, expiresAt: Date.now() + ttlSeconds * 1000, value };
      await writeFile(temporaryPath, JSON.stringify(next), { mode: 0o600 });
      await rename(temporaryPath, path);
      return next;
    } finally {
      await rm(temporaryPath, { force: true });
      await rm(lockPath, { recursive: true, force: true });
    }
  }
}

const CAS_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local currentVersion = -1
if raw then currentVersion = cjson.decode(raw).version end
if currentVersion ~= tonumber(ARGV[1]) then return nil end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return ARGV[2]
`;

/** Upstash-compatible HTTP Redis. The compare/check/write happens in one Redis script. */
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
  async read<T>(key: string): Promise<StoredValue<T> | null> {
    const raw = await this.command<string | null>(['GET', key]);
    if (!raw) return null;
    const item = JSON.parse(raw) as StoredValue<T>;
    return item.expiresAt > Date.now() ? item : null;
  }
  async compareAndSet<T>(key: string, expectedVersion: number | null, value: T, ttlSeconds: number): Promise<StoredValue<T> | null> {
    const next = { version: (expectedVersion ?? -1) + 1, expiresAt: Date.now() + ttlSeconds * 1000, value };
    const result = await this.command<string | null>(['EVAL', CAS_SCRIPT, 1, key, expectedVersion ?? -1, JSON.stringify(next), ttlSeconds]);
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
