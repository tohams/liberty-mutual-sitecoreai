import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextResponse } from 'next/server';
import { clearPortalDraftCookies, clearSitecoreIdentityCookies } from './sitecore-cookies';

test('identity reset expires only intended SDK cookies and preserves the signed portal session', () => {
  const previous = process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;
  process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID = 'public-context-123';
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set('lm_portal_session', 'signed-token', { httpOnly: true, path: '/' });
    response.cookies.set('unrelated_app', 'preserved', { path: '/' });
    clearSitecoreIdentityCookies(response, new Request('https://portal.example/api/auth/login'));
    const cookies = response.headers.getSetCookie();
    for (const name of ['sc_cid', 'sc_cid_personalize', 'sc_public-context-123', 'sc_public-context-123_personalize']) {
      const deletion = cookies.filter((cookie) => cookie.startsWith(`${name}=`));
      assert.equal(deletion.length, 2);
      assert.ok(deletion.every((cookie) => cookie.includes('Path=/') && cookie.includes('Max-Age=0')));
      assert.ok(deletion.some((cookie) => cookie.includes('Domain=portal.example')));
      assert.ok(deletion.some((cookie) => !cookie.toLowerCase().includes('domain=')));
    }
    assert.ok(cookies.some((cookie) => cookie.startsWith('lm_portal_session=signed-token') && cookie.includes('HttpOnly')));
    assert.ok(cookies.some((cookie) => cookie.startsWith('unrelated_app=preserved')));
    assert.ok(!cookies.some((cookie) => cookie.includes('Domain=example;')));
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;
    else process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID = previous;
  }
});

test('successful portal sign-in ends only the two host-scoped Next draft cookies', () => {
  const response = NextResponse.json({ success: true });
  response.cookies.set('lm_portal_session', 'new-signed-session', { httpOnly: true, path: '/' });
  response.cookies.set('sc_cid', 'browser-identity', { path: '/' });
  response.cookies.set('unrelated_app', 'preserved', { path: '/' });
  clearPortalDraftCookies(response);
  const cookies = response.headers.getSetCookie();
  const expired = cookies.filter((cookie) => cookie.includes('Max-Age=0'));
  assert.equal(expired.length, 2);
  for (const name of ['__prerender_bypass', '__next_preview_data']) {
    const deletion = expired.find((cookie) => cookie.startsWith(`${name}=`));
    assert.ok(deletion?.includes('Path=/'));
    assert.ok(deletion?.includes('HttpOnly'));
    assert.ok(!deletion?.includes('Domain='), 'Editing cookies belong to this host only');
  }
  for (const value of ['lm_portal_session=new-signed-session', 'sc_cid=browser-identity', 'unrelated_app=preserved']) {
    assert.ok(cookies.some((cookie) => cookie.startsWith(value) && !cookie.includes('Max-Age=0')));
  }
});
