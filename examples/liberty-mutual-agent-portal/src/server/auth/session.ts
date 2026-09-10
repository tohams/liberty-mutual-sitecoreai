import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { PortalError } from '../errors';

export const SESSION_COOKIE = 'lm_portal_session';
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;
export interface PortalSession {
  agentId: string; agencyId: string; reviewerPack: string; username: string;
  sessionId: string; issuedAt: string; expiresAt: string;
}

function signingKey(): Uint8Array {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new PortalError('CONFIGURATION_REQUIRED', 'The portal session service is not configured.', 503);
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(
  identity: Omit<PortalSession, 'sessionId' | 'issuedAt' | 'expiresAt'>,
  now = new Date()
): Promise<{ token: string; session: PortalSession }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const session = { ...identity, sessionId: randomUUID(), issuedAt: now.toISOString(), expiresAt: new Date((issuedAt + SESSION_DURATION_SECONDS) * 1000).toISOString() };
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('liberty-mutual-agent-portal')
    .setAudience('liberty-mutual-agent-portal')
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_DURATION_SECONDS)
    .sign(signingKey());
  return { token, session };
}

export async function verifySession(token?: string, now = new Date()): Promise<PortalSession | null> {
  if (!token) return null;
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'], issuer: 'liberty-mutual-agent-portal', audience: 'liberty-mutual-agent-portal', currentDate: now,
    });
    const fields = ['agentId', 'agencyId', 'reviewerPack', 'username', 'sessionId', 'issuedAt', 'expiresAt'] as const;
    if (fields.some((field) => typeof payload[field] !== 'string')) return null;
    if (!/^0[1-4]$/.test(String(payload.reviewerPack))) return null;
    return Object.fromEntries(fields.map((field) => [field, payload[field]])) as unknown as PortalSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<PortalSession | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<PortalSession> {
  const session = await getSession();
  if (!session) throw new PortalError('UNAUTHENTICATED', 'Please sign in to continue.', 401);
  return session;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};
