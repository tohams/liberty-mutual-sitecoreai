import 'server-only';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import runtimeCredentials from '../../../fixtures/portal-credentials.json';
import { fixtures } from '../data/fixtures';
import type { PortalSession } from './session';

export async function authenticate(username: string, password: string): Promise<Omit<PortalSession, 'sessionId' | 'issuedAt' | 'expiresAt'> | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const credential = runtimeCredentials.logins.find((entry) => entry.username === normalizedUsername && entry.enabled);
  const salt = credential?.salt ?? '00000000000000000000000000000000';
  // The same expensive operation also runs for unknown usernames.
  const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(credential?.passwordHash ?? '00'.repeat(64), 'hex');
  if (!credential || expected.length !== actual.length || !timingSafeEqual(actual, expected)) return null;
  const agent = fixtures.agents.find((entry) => entry.id === credential.agentId);
  if (!agent) return null;
  return { agentId: agent.id, agencyId: agent.agencyId, reviewerPack: credential.reviewerPack, username: credential.username };
}
