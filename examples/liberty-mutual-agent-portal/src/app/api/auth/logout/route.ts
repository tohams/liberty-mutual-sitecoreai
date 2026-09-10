import { SESSION_COOKIE, sessionCookieOptions } from '@/server/auth/session';
import { clearSitecoreIdentityCookies } from '@/server/auth/sitecore-cookies';
import { errorResponse, jsonResponse, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const response = jsonResponse({ success: true, clearBrowserIdentity: true, redirectTo: '/login' });
    response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
    clearSitecoreIdentityCookies(response, request);
    return response;
  } catch (error) { return errorResponse(error); }
}
