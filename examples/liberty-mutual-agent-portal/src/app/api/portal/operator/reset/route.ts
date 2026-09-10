import { createHash, timingSafeEqual } from 'node:crypto';
import { resetReviewerPack } from '@/server/data/portal';
import { PortalError } from '@/server/errors';
import { errorResponse, jsonResponse, readJson, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const secret = process.env.PORTAL_OPERATOR_SECRET;
    if (!secret || secret.length < 32) throw new PortalError('CONFIGURATION_REQUIRED', 'The operator service is not configured.', 503);
    const candidate = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    if (!timingSafeEqual(createHash('sha256').update(candidate).digest(), createHash('sha256').update(secret).digest())) throw new PortalError('FORBIDDEN', 'Operator authorization is required.', 403);
    if (request.headers.has('origin')) requireSameOrigin(request);
    const body = await readJson(request, 1024) as Record<string, unknown>;
    if (!body || typeof body.reviewerPack !== 'string' || (body.mode !== 'saved-work' && body.mode !== 'restart')) throw new PortalError('INVALID_INPUT', 'Choose a reviewer pack and reset mode.');
    return jsonResponse(await resetReviewerPack(body.reviewerPack, body.mode));
  } catch (error) { return errorResponse(error); }
}
