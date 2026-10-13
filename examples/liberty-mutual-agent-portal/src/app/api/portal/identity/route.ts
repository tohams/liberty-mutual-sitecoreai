import { draftMode } from "next/headers";
import { requireSession } from "@/server/auth/session";
import { getPortalPersonalizationIdentity } from "@/server/data/portal";
import { errorResponse, jsonResponse } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Login readiness needs only the verified identity, independent of workspace content. */
export async function GET() {
  try {
    const session = await requireSession();
    const udlIdentity = (await draftMode()).isEnabled
      ? null
      : await getPortalPersonalizationIdentity(session);
    return jsonResponse({ udlIdentity });
  } catch (error) {
    return errorResponse(error);
  }
}
