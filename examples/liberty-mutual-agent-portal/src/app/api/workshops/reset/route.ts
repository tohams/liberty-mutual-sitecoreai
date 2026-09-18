import { type NextRequest } from "next/server";
import { PortalError } from "@/server/errors";
import {
  errorResponse,
  jsonResponse,
  readJson,
  requireSameOrigin,
} from "@/server/http";
import {
  verifyWorkshopSession,
  WORKSHOP_SESSION_COOKIE,
} from "@/server/workshops/auth";
import {
  getWorkshopResetStatus,
  parseWorkshopResetRequest,
  requestWorkshopReset,
} from "@/server/workshops/reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireWorkshopAccess(request: NextRequest): Promise<void> {
  if (
    !(await verifyWorkshopSession(
      request.cookies.get(WORKSHOP_SESSION_COOKIE)?.value,
    ))
  ) {
    throw new PortalError(
      "UNAUTHENTICATED",
      "Sign in to the workshop guide to manage reviewer packs.",
      401,
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireWorkshopAccess(request);
    if (request.headers.has("origin")) requireSameOrigin(request);
    const params = request.nextUrl.searchParams;
    if (
      [...params.keys()].some(
        (key) => key !== "reviewerPack" && key !== "requestId",
      ) ||
      params.getAll("reviewerPack").length !== 1 ||
      params.getAll("requestId").length > 1
    ) {
      throw new PortalError(
        "INVALID_INPUT",
        "Choose one reviewer pack to inspect.",
      );
    }
    return jsonResponse(
      await getWorkshopResetStatus(
        params.get("reviewerPack") ?? "",
        params.get("requestId") ?? undefined,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWorkshopAccess(request);
    requireSameOrigin(request);
    const body = parseWorkshopResetRequest(await readJson(request, 1024));
    const result = await requestWorkshopReset(body);
    const response = jsonResponse(
      result,
      result.operation.status === "pending"
        ? 202
        : result.operation.status === "failed"
          ? 409
          : 200,
    );
    if (result.operation.retryAfterSeconds)
      response.headers.set(
        "Retry-After",
        String(result.operation.retryAfterSeconds),
      );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
