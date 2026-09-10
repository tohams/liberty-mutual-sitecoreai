import { requireSession } from '@/server/auth/session';
import { getPortalBootstrap } from '@/server/data/portal';
import { errorResponse, jsonResponse } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { return jsonResponse(await getPortalBootstrap(await requireSession())); }
  catch (error) { return errorResponse(error); }
}
