import 'server-only';
import { createHash } from 'node:crypto';
import { getStateStore, stateNamespace, type StateStore } from '../state/store';
import { PortalError } from '../errors';

export async function limitLoginAttempts(username: string, store: StateStore = getStateStore()): Promise<void> {
  const windowSeconds = 15 * 60;
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const subject = createHash('sha256').update(username.trim().toLowerCase()).digest('hex');
  const key = `${stateNamespace()}:login-rate:${subject}:${bucket}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.read<{ attempts: number }>(key);
    if ((current?.value.attempts ?? 0) >= 20) throw new PortalError('RATE_LIMITED', 'Too many sign-in attempts. Please wait 15 minutes before trying again.', 429);
    const saved = await store.compareAndSet(key, current?.version ?? null, { attempts: (current?.value.attempts ?? 0) + 1 }, windowSeconds);
    if (saved) return;
  }
  throw new PortalError('RATE_LIMITED', 'Please wait before trying to sign in again.', 429);
}
