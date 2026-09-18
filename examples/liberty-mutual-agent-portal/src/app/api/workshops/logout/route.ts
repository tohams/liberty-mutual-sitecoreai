import { errorResponse, jsonResponse, requireSameOrigin } from "@/server/http";
import {
  WORKSHOP_SESSION_COOKIE,
  workshopSessionCookieOptions,
} from "@/server/workshops/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const response = jsonResponse({
      success: true,
      redirectTo: "/workshops/login",
    });
    response.cookies.set(WORKSHOP_SESSION_COOKIE, "", {
      ...workshopSessionCookieOptions,
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
