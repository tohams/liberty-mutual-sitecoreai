import type { NextRequest } from "next/server";
import { PortalError } from "@/server/errors";
import {
  errorResponse,
  jsonResponse,
  readJson,
  requireSameOrigin,
} from "@/server/http";
import { evaluateMarketingEligibility } from "@/server/udl/marketing-eligibility";
import {
  verifyWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
} from "@/server/workshops/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    if (
      !(await verifyWorkshopSession(
        request.cookies.get(WORKSHOP_SESSION_COOKIE)?.value,
      ))
    ) {
      throw new PortalError(
        "UNAUTHENTICATED",
        "Sign in to the workshop guide to check marketing eligibility.",
        401,
      );
    }
    requireSameOrigin(request);
    const input = await readJson(request, 1024);
    if (
      request.nextUrl.search ||
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length
    ) {
      throw new PortalError(
        "INVALID_INPUT",
        "Run the check for the two prepared preference profiles.",
      );
    }
    return jsonResponse(await evaluateMarketingEligibility());
  } catch (error) {
    return errorResponse(error);
  }
}
