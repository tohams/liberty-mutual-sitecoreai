import 'server-only';
import type { NextResponse } from 'next/server';

/** A successful explicit portal login exits this host's prior Next.js editing session. */
export function clearPortalDraftCookies(response: NextResponse): void {
  for (const name of ['__prerender_bypass', '__next_preview_data']) {
    response.cookies.set(name, '', {
      path: '/', expires: new Date(0), maxAge: 0, httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
}

/** Pinned analytics-core 2.1.2 and personalize 2.1.0 cookie contracts. */
export function sitecoreIdentityCookieNames(): string[] {
  const names = new Set(['sc_cid', 'sc_cid_personalize']);
  // The SDK migrates these exact legacy names to sc_cid. Clear only this public context.
  const clientContext = process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;
  if (clientContext && /^[a-zA-Z0-9-]{1,200}$/.test(clientContext)) {
    names.add(`sc_${clientContext}`);
    names.add(`sc_${clientContext}_personalize`);
  }
  return [...names];
}

export function clearSitecoreIdentityCookies(response: NextResponse, request: Request): void {
  const hostname = new URL(request.url).hostname;
  const domainCookies: string[] = [];
  for (const name of sitecoreIdentityCookieNames()) {
    const attributes = { path: '/', expires: new Date(0), maxAge: 0, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
    response.cookies.set(name, '', attributes);
    // PersonalizeProxy in the pinned SDK creates Domain=hostname cookies. Expire that exact scope too.
    // Append separately: NextResponse's cookie map collapses entries with the same name.
    if (hostname !== 'localhost' && /^[a-z0-9.-]+$/i.test(hostname) && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      domainCookies.push(`${name}=; Path=/; Domain=${hostname}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${attributes.secure ? '; Secure' : ''}`);
    }
  }
  domainCookies.forEach((cookie) => response.headers.append('Set-Cookie', cookie));
}
