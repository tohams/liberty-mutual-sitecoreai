import { type NextRequest } from "next/server";
import { PortalError } from "@/server/errors";
import { errorResponse, privateHeaders } from "@/server/http";
import {
  verifyWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
} from "@/server/workshops/auth";
import { readWorkshopAsset } from "@/server/workshops/auth-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  try {
    const session = await verifyWorkshopSession(
      request.cookies.get(WORKSHOP_SESSION_COOKIE)?.value,
    );
    if (!session)
      throw new PortalError(
        "UNAUTHENTICATED",
        "Please sign in to view this screenshot.",
        401,
      );
    const { filename } = await context.params;
    const asset = await readWorkshopAsset(filename);
    return new Response(asset.bytes as BodyInit, {
      headers: {
        ...privateHeaders,
        "Content-Type": asset.contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
