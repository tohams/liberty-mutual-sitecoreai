import { requireSession } from '@/server/auth/session';
import { getPolicyDocument } from '@/server/data/portal';
import { errorResponse, privateHeaders } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ policyId: string; documentId: string }> }) {
  try {
    const { policyId, documentId } = await context.params;
    const document = await getPolicyDocument(await requireSession(), policyId, documentId);
    return new Response(document.body, { headers: { ...privateHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${document.filename}"` } });
  } catch (error) { return errorResponse(error); }
}
