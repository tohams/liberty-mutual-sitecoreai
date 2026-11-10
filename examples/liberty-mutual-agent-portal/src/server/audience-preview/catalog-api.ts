import "server-only";
import type { NextRequest } from "next/server";
import { jsonResponse, readJson, requireSameOrigin } from "@/server/http";
import { AudiencePreviewError } from "@/server/marketplace/audience-preview-config";
import { requireAudiencePreviewSession } from "@/server/marketplace/audience-preview-auth";
import {
  resolveAuthorizedPreviewPage,
  type AudiencePreviewPage,
} from "@/server/marketplace/audience-preview-pages";
import { limitAudiencePreviewRequests } from "./preview-sessions";
import {
  advanceCatalogPreparation,
  readCatalogPreparation,
  type CatalogPreparationStatus,
} from "./catalog-preparation";

// The existing Agent Portal Home item is the only authorization target for this fixed preparation operation.
export const CATALOG_HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
interface CatalogApiDependencies {
  session: typeof requireAudiencePreviewSession;
  limit: typeof limitAudiencePreviewRequests;
  authorize: typeof resolveAuthorizedPreviewPage;
  read: (page: AudiencePreviewPage) => Promise<CatalogPreparationStatus>;
  advance: (page: AudiencePreviewPage) => Promise<CatalogPreparationStatus>;
}
const defaults: CatalogApiDependencies = {
  session: requireAudiencePreviewSession,
  limit: limitAudiencePreviewRequests,
  authorize: resolveAuthorizedPreviewPage,
  read: async (page) => {
    const { audiencePreviewDependencies } = await import("./service");
    return readCatalogPreparation(page, audiencePreviewDependencies());
  },
  advance: async (page) => {
    const { audiencePreviewDependencies } = await import("./service");
    return advanceCatalogPreparation(page, audiencePreviewDependencies());
  },
};

/** Both handlers keep delegated tokens, import credentials and profile references on the server. */
export function catalogPreparationHandlers(
  deps: CatalogApiDependencies = defaults,
) {
  const handle = async (request: NextRequest, mutate: boolean) => {
    try {
      if (
        mutate ||
        request.headers.has("origin") ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        requireSameOrigin(request);
      if (request.nextUrl.searchParams.size)
        throw new AudiencePreviewError(
          "INVALID_INPUT",
          "This preparation request is invalid.",
          400,
        );
      const actor = await deps.session();
      await deps.limit(actor.user.sub!);
      if (mutate) {
        const body = await readJson(request, 256);
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).length
        )
          throw new AudiencePreviewError(
            "INVALID_INPUT",
            "This preparation request accepts no audience or page overrides.",
            400,
          );
      }
      const page = await deps.authorize(
        { pageId: CATALOG_HOME_ID, language: "en" },
        actor.accessToken,
      );
      if (
        page.id.toLowerCase() !== CATALOG_HOME_ID ||
        page.path !== "/" ||
        page.siteName !== "liberty-mutual-agent-portal"
      )
        throw new AudiencePreviewError(
          "PAGE_ACCESS_DENIED",
          "This account cannot prepare the Agent Portal audiences.",
          403,
        );
      const progress = await (mutate ? deps.advance(page) : deps.read(page));
      const response = jsonResponse(
        progress,
        mutate && progress.status === "pending" ? 202 : 200,
      );
      if (progress.status === "pending")
        response.headers.set("Retry-After", "3");
      return response;
    } catch (error) {
      const { audiencePreviewErrorResponse } = await import("./service");
      return audiencePreviewErrorResponse(error);
    }
  };
  return {
    GET: (request: NextRequest) => handle(request, false),
    POST: (request: NextRequest) => handle(request, true),
  };
}
