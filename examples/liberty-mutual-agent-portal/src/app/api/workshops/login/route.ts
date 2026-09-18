import { authenticate } from "@/server/auth/credentials";
import { limitLoginAttempts } from "@/server/auth/rate-limit";
import { PortalError } from "@/server/errors";
import {
  errorResponse,
  jsonResponse,
  readJson,
  requireSameOrigin,
} from "@/server/http";
import {
  createWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
  workshopReturnTo,
  workshopSessionCookieOptions,
} from "@/server/workshops/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = (await readJson(request, 2048)) as Record<string, unknown>;
    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      body.username.length > 80 ||
      body.password.length > 200 ||
      !body.username.trim() ||
      !body.password
    ) {
      throw new PortalError(
        "INVALID_INPUT",
        "Enter your username and password.",
      );
    }
    // Reuse the existing credential protection without sharing the agent's browser session.
    await limitLoginAttempts(`workshops:${body.username.trim().toLowerCase()}`);
    const identity = await authenticate(body.username, body.password);
    if (!identity)
      throw new PortalError(
        "INVALID_CREDENTIALS",
        "The username or password is incorrect.",
        401,
      );
    const user = {
      username: identity.username,
      reviewerPack: identity.reviewerPack,
    };
    const { token } = await createWorkshopSession(user);
    const response = jsonResponse({
      success: true,
      redirectTo: workshopReturnTo(body.returnTo),
      user,
    });
    response.cookies.set(
      WORKSHOP_SESSION_COOKIE,
      token,
      workshopSessionCookieOptions,
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
