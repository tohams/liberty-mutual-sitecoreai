import 'server-only';
import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';
import type { PortalBootstrap } from '../../contracts/portal';
import type { PortalSession } from '../auth/session';

export const PERSONALIZE_GUEST_COOKIE = 'sc_cid_personalize';
export const PERSONALIZE_BINDING_COOKIE = 'lm_portal_personalize_binding';

type Identity = NonNullable<PortalBootstrap['udlIdentity']>;
export type GuestProfileResolver = (
  identity: Identity,
  readNativeProfile: () => Promise<string | null>,
  signal: AbortSignal,
) => Promise<string | null>;

interface BindingContext {
  browserId: string;
  siteName: string;
  contextId: string;
  hostname: string;
  session: PortalSession;
}

interface CookieStoreOptions extends BindingContext {
  request: Pick<NextRequest, 'cookies'>;
  response: Pick<NextResponse, 'cookies'>;
  now?: () => Date;
}

const issuer = 'liberty-mutual-agent-portal';
const audience = 'liberty-mutual-personalize-identity';
const fingerprint = (value: string) => createHash('sha256').update(value).digest('hex');
const validRef = (value: unknown): value is string => typeof value === 'string' &&
  value.length > 0 && value.length <= 200 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);

function signingKey(): Uint8Array | null {
  const secret = process.env.PORTAL_SESSION_SECRET;
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

function binding(context: BindingContext, identity: Identity, profileRef: string) {
  return {
    version: 1,
    browserId: context.browserId,
    guestFingerprint: fingerprint(profileRef),
    identityFingerprint: fingerprint(`${identity.provider}:${identity.id}`),
    sessionId: context.session.sessionId,
    siteName: context.siteName,
    contextFingerprint: fingerprint(context.contextId),
    hostname: context.hostname,
  };
}

async function boundProfile(
  profileRef: string | undefined,
  token: string | undefined,
  context: BindingContext,
  identity: Identity,
  now: Date,
): Promise<string | null> {
  const key = signingKey();
  if (!key || !validRef(profileRef) || !token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'], issuer, audience, currentDate: now,
    });
    const expected = binding(context, identity, profileRef);
    if (Object.entries(expected).some(([name, value]) => payload[name] !== value)) return null;
    const sessionEnd = Math.floor(Date.parse(context.session.expiresAt) / 1000);
    if (!Number.isFinite(sessionEnd) || sessionEnd <= Math.floor(now.getTime() / 1000) ||
        typeof payload.exp !== 'number' || payload.exp > sessionEnd) return null;
    return profileRef;
  } catch {
    return null;
  }
}

/**
 * Preserve the SDK's guest-ID cookie, never a selected experiment variant.
 * A signed companion scopes it to this login, browser, UDL identity and tenant.
 * Saved-work resets retain that identity; a restart/new login cannot reuse it.
 */
export function createGuestProfileCookieStore(options: CookieStoreOptions): GuestProfileResolver {
  const context: BindingContext = {
    browserId: options.browserId, siteName: options.siteName, contextId: options.contextId,
    hostname: options.hostname, session: { ...options.session },
  };
  const incomingProfile = options.request.cookies.get(PERSONALIZE_GUEST_COOKIE)?.value;
  const incomingBinding = options.request.cookies.get(PERSONALIZE_BINDING_COOKIE)?.value;
  const now = options.now ?? (() => new Date());

  return async (identity, readNativeProfile, signal) => {
    if (signal.aborted || identity.provider !== 'liberty-mutual-agent' || !identity.id) return null;
    const existing = await boundProfile(incomingProfile, incomingBinding, context, identity, now());
    if (signal.aborted) return null;
    if (existing) return existing;

    // An absent, unbound or stale cookie never supplies a native request identity.
    const profileRef = await readNativeProfile();
    if (signal.aborted || !validRef(profileRef)) return null;
    const key = signingKey();
    const timestamp = now();
    const issuedAt = Math.floor(timestamp.getTime() / 1000);
    const expiresAt = Math.floor(Date.parse(context.session.expiresAt) / 1000);
    if (!key || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) return null;
    try {
      const token = await new SignJWT(binding(context, identity, profileRef))
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(issuer).setAudience(audience).setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt).sign(key);
      if (signal.aborted) return null;
      const attributes = {
        path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const, maxAge: expiresAt - issuedAt, expires: new Date(expiresAt * 1000),
      };
      // Match the pinned server adapter's exact hostname scope, never a parent domain.
      const domain = context.hostname !== 'localhost' && /^[a-z0-9.-]+$/i.test(context.hostname) &&
        !/^\d+\.\d+\.\d+\.\d+$/.test(context.hostname) ? context.hostname : undefined;
      options.response.cookies.set(PERSONALIZE_GUEST_COOKIE, profileRef, { ...attributes, domain });
      options.response.cookies.set(PERSONALIZE_BINDING_COOKIE, token, attributes);
      return profileRef;
    } catch {
      // Native identity is optional. Never substitute a client-supplied profile.
      return null;
    }
  };
}
