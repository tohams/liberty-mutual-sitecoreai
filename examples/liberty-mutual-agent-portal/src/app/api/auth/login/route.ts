import { authenticate } from '@/server/auth/credentials';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/server/auth/session';
import { limitLoginAttempts } from '@/server/auth/rate-limit';
import { clearPortalDraftCookies, clearSitecoreIdentityCookies } from '@/server/auth/sitecore-cookies';
import { PortalError } from '@/server/errors';
import { errorResponse, jsonResponse, readJson, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, 2048) as Record<string, unknown>;
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' || body.username.length > 80 || body.password.length > 200 || !body.username.trim() || !body.password) throw new PortalError('INVALID_INPUT', 'Enter your username and password.');
    await limitLoginAttempts(body.username);
    const identity = await authenticate(body.username, body.password);
    if (!identity) throw new PortalError('INVALID_CREDENTIALS', 'The username or password is incorrect.', 401);
    const { token } = await createSession(identity);
    const response = jsonResponse({ success: true, redirectTo: '/workspace' });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    clearSitecoreIdentityCookies(response, request);
    clearPortalDraftCookies(response);
    return response;
  } catch (error) { return errorResponse(error); }
}
