import 'server-only';
import { NextResponse } from 'next/server';
import { PortalError } from './errors';

export const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
  'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}

export function errorResponse(error: unknown) {
  if (error instanceof PortalError) return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
  // Never reflect upstream errors, request bodies, provider tokens, or fixture credentials.
  console.error('Portal request failed:', error instanceof Error ? error.name : 'UnknownError');
  return jsonResponse({ error: { code: 'UNAVAILABLE', message: 'We could not complete that request. Please try again.' } }, 503);
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const expected = new URL(request.url).origin;
  if (!origin || origin === 'null' || origin !== expected) throw new PortalError('INVALID_ORIGIN', 'This request could not be verified. Refresh the page and try again.', 403);
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') throw new PortalError('INVALID_ORIGIN', 'This request could not be verified.', 403);
}

export async function readJson(request: Request, maximumBytes = 16384): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new PortalError('INVALID_CONTENT_TYPE', 'This request must use JSON.', 415);
  if (Number(request.headers.get('content-length')) > maximumBytes) throw new PortalError('REQUEST_TOO_LARGE', 'This request is too large.', 413);
  if (!request.body) throw new PortalError('INVALID_INPUT', 'This request is empty.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) { await reader.cancel(); throw new PortalError('REQUEST_TOO_LARGE', 'This request is too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new PortalError('INVALID_INPUT', 'This request contains invalid JSON.'); }
}
