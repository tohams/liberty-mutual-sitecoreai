import { requireSession } from '@/server/auth/session';
import { applyPortalAction } from '@/server/data/portal';
import { errorResponse, jsonResponse, readJson, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession();
    return jsonResponse(await applyPortalAction(session, await readJson(request)));
  } catch (error) { return errorResponse(error); }
}
