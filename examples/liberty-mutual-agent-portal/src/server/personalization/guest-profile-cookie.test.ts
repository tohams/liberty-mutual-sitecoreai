import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import type { PortalSession } from '../auth/session';
import { createGuestProfileCookieStore, PERSONALIZE_BINDING_COOKIE, PERSONALIZE_GUEST_COOKIE } from './guest-profile-cookie';
import { createBrowserProfileDecisionExecutor } from './browser-profile-decision';
import { clearSitecoreIdentityCookies } from '../auth/sitecore-cookies';

const browserId = 'a1111111-1111-4111-8111-111111111111';
const identity = { provider: 'liberty-mutual-agent' as const, id: 'agent-04-generation-1' };
const instant = new Date('2030-01-01T12:00:00Z');
const session: PortalSession = {
  agentId: 'agent', agencyId: 'agency', reviewerPack: '04', username: 'agent.04',
  sessionId: 'login-one', issuedAt: instant.toISOString(), expiresAt: '2030-01-01T20:00:00Z',
};
const context = { browserId, siteName: 'portal', hostname: 'portal.example', contextId: 'public-context', session };
const signal = () => new AbortController().signal;
const campaign = { channel: 'WEB', currency: 'USD', friendlyId: 'native-experiment', language: 'en', pageVariantIds: ['component_default', 'component_B'] };

function store(cookies = '', overrides: Partial<typeof context> = {}, now = () => instant) {
  const response = NextResponse.next();
  const request = new NextRequest('https://portal.example/resources', { headers: { cookie: cookies } });
  const resolve = createGuestProfileCookieStore({ ...context, ...overrides, request, response, now });
  return { resolve, response };
}
function cookiePair(response: NextResponse) {
  return [PERSONALIZE_GUEST_COOKIE, PERSONALIZE_BINDING_COOKIE]
    .map((name) => `${name}=${encodeURIComponent(response.cookies.get(name)!.value)}`).join('; ');
}
async function withKey(run: () => Promise<void>) {
  const previous = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = 'unit-test-key-for-guest-reference-binding-only';
  try { await run(); }
  finally {
    if (previous === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = previous;
  }
}

test('native guest identity persists over alias changes while every experiment decision remains native', () => withKey(async () => {
  let reads = 0;
  const guestRefs: unknown[] = [];
  const transport: typeof fetch = async (_, init) => {
    if (init?.method === 'GET') {
      reads++;
      return Response.json({ ref: browserId, customer: { ref: reads === 1 ? 'native-linked-guest' : 'later-native-alias' } });
    }
    guestRefs.push(JSON.parse(String(init?.body)).guestRef);
    return Response.json({ variantId: guestRefs.length === 1 ? 'component_B' : 'component_default' });
  };
  const decisionContext = { browserId, siteName: 'portal', contextId: 'public-context', edgeUrl: 'https://edge.example' };
  const first = store();
  assert.deepEqual(await createBrowserProfileDecisionExecutor(decisionContext, async () => identity, transport, first.resolve)(campaign), { variantId: 'component_B' });
  const next = store(cookiePair(first.response));
  assert.deepEqual(await createBrowserProfileDecisionExecutor(decisionContext, async () => identity, transport, next.resolve)(campaign), { variantId: 'component_default' });
  assert.equal(reads, 1, 'A valid guest-ID binding follows the SDK cookie contract instead of rereading a moved alias');
  assert.deepEqual(guestRefs, ['native-linked-guest', 'native-linked-guest']);
  assert.equal(next.response.headers.get('set-cookie'), null, 'Reuse does not rotate or refresh cookies');
}));

test('new login, agent, generation, browser, host and tenant cannot reuse another binding', () => withKey(async () => {
  const first = store();
  await first.resolve(identity, async () => 'original-guest', signal());
  const cookies = cookiePair(first.response);
  for (const [override, actor] of [
    [{ session: { ...session, sessionId: 'login-two' } }, identity],
    [{}, { ...identity, id: 'other-agent' }],
    [{}, { ...identity, id: 'agent-04-generation-2' }],
    [{ browserId: 'b2222222-2222-4222-8222-222222222222' }, identity],
    [{ hostname: 'another.example' }, identity],
    [{ siteName: 'another-site' }, identity],
    [{ contextId: 'another-tenant-context' }, identity],
  ] as const) {
    const next = store(cookies, override);
    let reads = 0;
    assert.equal(await next.resolve(actor, async () => { reads++; return 'fresh-native-guest'; }, signal()), 'fresh-native-guest');
    assert.equal(reads, 1);
    assert.equal(next.response.cookies.get(PERSONALIZE_GUEST_COOKIE)?.value, 'fresh-native-guest');
  }
}));

test('saved-work reset retains the login and UDL generation rather than changing experiment identity', () => withKey(async () => {
  const first = store();
  await first.resolve(identity, async () => 'original-guest', signal());
  const afterSavedWorkReset = store(cookiePair(first.response), { session: { ...session } });
  assert.equal(await afterSavedWorkReset.resolve({ ...identity }, async () => { throw new Error('Should not reread'); }, signal()), 'original-guest');
}));

test('raw, mismatched, expired and invalidly signed cookies never become a decision identity', () => withKey(async () => {
  const first = store();
  await first.resolve(identity, async () => 'original-guest', signal());
  const pair = cookiePair(first.response);
  for (const cookies of [
    `${PERSONALIZE_GUEST_COOKIE}=unbound-attacker-value`,
    pair.replace('original-guest', 'different-guest'),
    pair.replace(`${PERSONALIZE_BINDING_COOKIE}=`, `${PERSONALIZE_BINDING_COOKIE}=invalid`),
  ]) {
    const next = store(cookies);
    let reads = 0;
    assert.equal(await next.resolve(identity, async () => { reads++; return null; }, signal()), null);
    assert.equal(reads, 1);
    assert.equal(next.response.headers.get('set-cookie'), null);
  }
  const expired = store(pair, {}, () => new Date('2030-01-01T20:00:01Z'));
  assert.equal(await expired.resolve(identity, async () => 'new-guest', signal()), null, 'Expired session cannot mint a new binding');
  assert.equal(expired.response.headers.get('set-cookie'), null);
}));

test('cookie expiry is capped to login lifetime and identity details are not copied into the token', (t) => withKey(async () => {
  t.mock.timers.enable({ apis: ['Date'], now: instant });
  const first = store();
  await first.resolve(identity, async () => 'native-guest', signal());
  const guest = first.response.cookies.get(PERSONALIZE_GUEST_COOKIE)!;
  const signed = first.response.cookies.get(PERSONALIZE_BINDING_COOKIE)!;
  assert.equal(guest.maxAge, 8 * 60 * 60);
  assert.equal(guest.httpOnly, true);
  assert.equal(guest.sameSite, 'lax');
  assert.equal(guest.domain, 'portal.example');
  assert.equal(signed.httpOnly, true);
  assert.equal(signed.domain, undefined, 'Binding never crosses the current host');
  assert.ok(guest.expires instanceof Date);
  assert.equal(guest.expires.toISOString(), session.expiresAt.replace('Z', '.000Z'));
  const payload = decodeJwt(signed.value);
  assert.equal(payload.exp, Math.floor(Date.parse(session.expiresAt) / 1000));
  assert.ok(!JSON.stringify(payload).includes(identity.id));
  assert.ok(!JSON.stringify(payload).includes('native-guest'));
  assert.ok(!JSON.stringify(payload).includes(context.contextId));
}));

test('login/logout clearing expires the standard guest ID and binding without clearing unrelated cookies', () => withKey(async () => {
  const first = store();
  await first.resolve(identity, async () => 'native-guest', signal());
  first.response.cookies.set('unrelated', 'keep');
  clearSitecoreIdentityCookies(first.response, new Request('https://portal.example/api/auth/logout'));
  for (const name of [PERSONALIZE_GUEST_COOKIE, PERSONALIZE_BINDING_COOKIE]) {
    const values = first.response.headers.getSetCookie().filter((value) => value.startsWith(`${name}=`));
    assert.equal(values.length, 2);
    assert.ok(values.every((value) => value.includes('Max-Age=0')));
  }
  assert.equal(first.response.cookies.get('unrelated')?.value, 'keep');
}));

test('invalidated login or restarted identity never reads a cookie or native profile', () => withKey(async () => {
  for (const resolveIdentity of [async () => null, async () => { throw new Error('Workspace restarted'); }]) {
    let calls = 0;
    const execute = createBrowserProfileDecisionExecutor({ browserId, siteName: 'portal', contextId: 'public-context', edgeUrl: 'https://edge.example' }, resolveIdentity,
      async () => { calls++; throw new Error('Native request not allowed'); },
      async () => { calls++; return 'stale-guest'; });
    assert.deepEqual(await execute(campaign), { variantId: '' });
    assert.equal(calls, 0);
  }
}));

test('aborted or unavailable native lookup cannot write identity cookies', () => withKey(async () => {
  for (const value of [null, '', ' padded ', 'x'.repeat(201)]) {
    const current = store();
    assert.equal(await current.resolve(identity, async () => value, signal()), null);
    assert.equal(current.response.headers.get('set-cookie'), null);
  }
  const current = store();
  const controller = new AbortController();
  assert.equal(await current.resolve(identity, async () => { controller.abort(); return 'late-profile'; }, controller.signal), null);
  assert.equal(current.response.headers.get('set-cookie'), null);
}));
