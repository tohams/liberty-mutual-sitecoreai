import { type NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/server/auth/session';
import {
  defineProxy,
  PreviewProxy,
  AppRouterMultisiteProxy,
  RedirectsProxy,
  LocaleProxy,
} from '@sitecore-content-sdk/nextjs/proxy';
import sites from '.sitecore/sites.json';
import scConfig from 'sitecore.config';
import { routing } from './i18n/routing';
import client from './lib/sitecore-client';
import { PortalPersonalizeProxy } from './server/personalization/PortalPersonalizeProxy';
import { getPortalPersonalizationIdentity } from './server/data/portal';
import { reportPersonalizationDiagnostic } from './server/personalization/diagnostics';

const preview = new PreviewProxy({
    client,
    ...scConfig.api.edge,
});

const locale = new LocaleProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  /**
   * List of all supported locales configured in routing.ts
   */
  locales: routing.locales.slice(),
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. files and Next.js API routes), but you may wish to disable more.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  // in multilanguage scenarios, we need locale middleware to always run first to ensure locale is set and used correctly by the rest of the middlewares
  skip: () => false,
});

const multisite = new AppRouterMultisiteProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  ...scConfig.api.edge,
  ...scConfig.multisite,
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. files and Next.js API routes), but you may wish to disable more.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  skip: () => false,
});

const redirects = new RedirectsProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  ...scConfig.api.edge,
  ...scConfig.api.local,
  ...scConfig.redirects,
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
  // By default it is disabled while in development mode.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  skip: () => false,
});

const personalize = new PortalPersonalizeProxy({
  /**
   * List of sites for site resolver to work with
   */
  sites,
  ...scConfig.api.edge,
  ...scConfig.personalize,
  // This function determines if the middleware should be turned off on per-request basis.
  // Certain paths are ignored by default (e.g. Next.js API routes), but you may wish to disable more.
  // By default it is disabled while in development mode.
  // This is an important performance consideration since Next.js Edge middleware runs on every request.
  skip: () => false,
}, async () => null);

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/login' || path.startsWith('/operator')) return NextResponse.next();
  const hasDraftCookie = req.cookies.has('__prerender_bypass');
  const session = hasDraftCookie ? null : await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  reportPersonalizationDiagnostic({ stage: 'proxy', enabled: scConfig.personalize.enabled, draft: hasDraftCookie || req.cookies.has('__next_preview_data'), signedSessionPresent: Boolean(session) });
  if (!hasDraftCookie && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  // Request-scoped identity is resolved only if native campaign discovery needs it.
  // Draft requests and invalid/unverified runs cannot use a stale browser profile.
  const requestPersonalize = personalize.forRequest(async () =>
    session ? getPortalPersonalizationIdentity(session) : null,
  );
  const response = await defineProxy(preview, locale, multisite, redirects, requestPersonalize).exec(req);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export const config = {
  /*
   * Match all paths except for:
   * 1. API route handlers
   * 2. /_next (Next.js internals)
   * 3. /sitecore/api (Sitecore API routes)
   * 4. /- (Sitecore media)
   * 5. /healthz (Health check)
   * 7. all root files inside /public
   */
  matcher: [
    '/',
    '/((?!api/|\\.well-known/|sitemap|robots|llms|_next/|healthz|sitecore/api/|-/|favicon.ico|brand/|sc_logo.svg|ai/).*)',
  ],
};
