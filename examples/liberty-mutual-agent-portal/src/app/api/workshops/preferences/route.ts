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
  getMarketingPreferenceStatus,
  parseMarketingPreferenceAction,
  parseMarketingPreferenceBatch,
  recoverMarketingPreferenceImport,
  requestMarketingPreferenceImport,
} from "@/server/udl/marketing-preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function requireAccess(request: NextRequest) {
  if (
    !(await verifyWorkshopSession(
      request.cookies.get(WORKSHOP_SESSION_COOKIE)?.value,
    ))
  )
    throw new PortalError(
      "UNAUTHENTICATED",
      "Sign in to the workshop guide to inspect the preference examples.",
      401,
    );
}
export async function GET(request: NextRequest) {
  try {
    await requireAccess(request);
    if (request.headers.has("origin")) requireSameOrigin(request);
    const params = request.nextUrl.searchParams;
    if (
      [...params.keys()].some((key) => key !== "inspect") ||
      params.getAll("inspect").length > 1 ||
      (params.has("inspect") && params.get("inspect") !== "true")
    )
      throw new PortalError(
        "INVALID_INPUT",
        "Use inspect=true to check this preference import.",
      );
    return jsonResponse(
      await getMarketingPreferenceStatus(params.get("inspect") === "true"),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    await requireAccess(request);
    requireSameOrigin(request);
    if (request.nextUrl.search)
      throw new PortalError(
        "INVALID_INPUT",
        "Submit one preference action without query parameters.",
      );
    const action = parseMarketingPreferenceAction(
      await readJson(request, 1024),
    );
    const result = await requestMarketingPreferenceImport(action);
    const response = jsonResponse(
      result,
      ["uploading", "queued", "pending"].includes(result.status)
        ? 202
        : ["upload-uncertain", "failed", "rejected"].includes(result.status)
          ? 409
          : 200,
    );
    if (result.retryAfterSeconds)
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    await requireAccess(request);
    requireSameOrigin(request);
    if (request.nextUrl.search)
      throw new PortalError(
        "INVALID_INPUT",
        "Recover one preference import without query parameters.",
      );
    const batchId = parseMarketingPreferenceBatch(
      await readJson(request, 1024),
    );
    const result = await recoverMarketingPreferenceImport(batchId);
    const response = jsonResponse(
      result,
      result.status === "upload-uncertain" ? 202 : 200,
    );
    if (result.retryAfterSeconds)
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
