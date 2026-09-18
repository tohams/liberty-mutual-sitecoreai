import { createHash, timingSafeEqual } from 'node:crypto';
import { resetReviewerPack } from '@/server/data/portal';
import { getReviewerResetStatus, inspectReviewerRestart, requestReviewerRestart } from '@/server/data/reviewer-restart';
import { PortalError } from '@/server/errors';
import { errorResponse, jsonResponse, readJson, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function requireOperator(request: Request): void {
  const secret = process.env.PORTAL_OPERATOR_SECRET;
  if (!secret || secret.length < 32) throw new PortalError('CONFIGURATION_REQUIRED', 'The operator service is not configured.', 503);
  const candidate = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!timingSafeEqual(createHash('sha256').update(candidate).digest(), createHash('sha256').update(secret).digest())) throw new PortalError('FORBIDDEN', 'Operator authorization is required.', 403);
  if (request.headers.has('origin')) requireSameOrigin(request);
}

export async function GET(request: Request) {
  try {
    requireOperator(request);
    const params = new URL(request.url).searchParams;
    if (params.has('inspectImport')) {
      if (params.get('inspectImport') !== 'true') throw new PortalError('INVALID_INPUT', 'Use inspectImport=true to inspect a retained import.');
      return jsonResponse(await inspectReviewerRestart(params.get('reviewerPack') ?? '', params.get('requestId') ?? ''));
    }
    return jsonResponse(await getReviewerResetStatus(params.get('reviewerPack') ?? '', params.get('requestId') ?? undefined));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    requireOperator(request);
    const body = await readJson(request, 1024) as Record<string, unknown>;
    if (!body || typeof body.reviewerPack !== 'string' || (body.mode !== 'saved-work' && body.mode !== 'restart')) throw new PortalError('INVALID_INPUT', 'Choose a reviewer pack and reset mode.');
    if (body.mode === 'saved-work') return jsonResponse(await resetReviewerPack(body.reviewerPack, 'saved-work'));
    if (typeof body.requestId !== 'string' || typeof body.expectedRunId !== 'string') throw new PortalError('INVALID_INPUT', 'Provide a restart request ID and the current run ID.');
    if (body.resumeVerification !== undefined && typeof body.resumeVerification !== 'boolean') throw new PortalError('INVALID_INPUT', 'Choose whether to resume verification.');
    const receipt = await requestReviewerRestart({ reviewerPack: body.reviewerPack, requestId: body.requestId, expectedRunId: body.expectedRunId, resumeVerification: body.resumeVerification });
    const response = jsonResponse(receipt, receipt.status === 'pending' ? 202 : receipt.status === 'failed' ? 409 : 200);
    if (receipt.retryAfterSeconds) response.headers.set('Retry-After', String(receipt.retryAfterSeconds));
    return response;
  } catch (error) { return errorResponse(error); }
}
