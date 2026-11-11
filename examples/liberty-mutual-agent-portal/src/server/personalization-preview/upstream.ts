import "server-only";
import {
  PersonalizationPreviewError,
  personalizationPreviewApiConfiguration,
} from "@/server/marketplace/personalization-preview-config";
import type { PersonalizationPreviewPage } from "./types";

const GATEWAY = "https://edge-platform.sitecorecloud.io";
const MAX_BYTES = 1_048_576;
const flowId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

async function json(response: Response): Promise<unknown> {
  const declared = response.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) {
    void response.body?.cancel().catch(() => undefined);
    throw new PersonalizationPreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an invalid personalization response.",
      502,
    );
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw new PersonalizationPreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an empty personalization response.",
      502,
    );
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new Error("Response too large");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PersonalizationPreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an invalid personalization response.",
      502,
    );
  } finally {
    reader.releaseLock();
  }
}

/** Fixed-origin, read-only Agent API calls under the author's delegated Sitecore session. */
function personalizationDefinitionReader(
  accessToken: string,
  transport: typeof fetch = fetch,
) {
  const { contextId } = personalizationPreviewApiConfiguration();
  if (!accessToken || /[\s\u0000-\u001f]/.test(accessToken))
    throw new PersonalizationPreviewError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to SitecoreAI to preview this page.",
      401,
    );
  const read = async (
    pathname: string,
    parameters: Record<string, string> = {},
  ): Promise<unknown> => {
    const url = new URL(`/stream/ai-agent-api${pathname}`, GATEWAY);
    url.search = new URLSearchParams({
      ...parameters,
      sitecoreContextId: contextId,
    }).toString();
    let response: Response;
    try {
      response = await transport(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "x-sitecore-contextid": contextId,
          "sc-resource": "marketplace",
          "sc-marketplace-auth": "interactive/v1",
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new PersonalizationPreviewError(
        "SITECORE_UNAVAILABLE",
        "SitecoreAI could not load this page’s personalizations. Please try again.",
        502,
      );
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      const status = [401, 403, 404].includes(response.status)
        ? response.status
        : 502;
      const error = new PersonalizationPreviewError(
        "PERSONALIZATION_ACCESS_DENIED",
        "This SitecoreAI account cannot read this page’s personalization configuration.",
        status,
      );
      Object.defineProperty(error, "upstreamStatus", {
        value: response.status,
      });
      throw error;
    }
    return json(response);
  };
  return read;
}

export async function readPersonalizationFlowDefinitions(
  page: PersonalizationPreviewPage,
  accessToken: string,
  transport: typeof fetch = fetch,
): Promise<unknown[]> {
  const read = personalizationDefinitionReader(accessToken, transport);
  const listed = await read(
    `/api/v1/flows/by-page/${encodeURIComponent(page.id)}`,
    { language: page.language },
  );
  if (
    !Array.isArray(listed) ||
    listed.length > 50 ||
    listed.some((flow) => !object(flow))
  )
    throw new PersonalizationPreviewError(
      "INVALID_SITECORE_RESPONSE",
      "SitecoreAI returned an invalid personalization list.",
      502,
    );
  const personalizations = listed.filter(
    (flow) => flow.archived !== true && flow.subtype !== "EXPERIMENT",
  );
  const definitions = await Promise.all(
    personalizations.map(async (flow) => {
      const ref = flow.ref ?? flow.id;
      if (!flowId(ref))
        throw new PersonalizationPreviewError(
          "INVALID_SITECORE_RESPONSE",
          "SitecoreAI returned an invalid personalization identifier.",
          502,
        );
      const detail = await read(`/api/v1/flows/${encodeURIComponent(ref)}`);
      if (!object(detail) || (detail.ref ?? detail.id) !== ref)
        throw new PersonalizationPreviewError(
          "INVALID_SITECORE_RESPONSE",
          "SitecoreAI could not confirm a personalization definition.",
          502,
        );
      return detail;
    }),
  );
  return definitions;
}

/** Temporary bounded integration probes; remove with the diagnostic route. */
export async function readPersonalizationDefinitionDiagnostics(
  page: PersonalizationPreviewPage,
  accessToken: string,
  transport: typeof fetch = fetch,
): Promise<unknown> {
  const read = personalizationDefinitionReader(accessToken, transport);
  const probe = async (pathname: string) => {
    try {
      return {
        status: "success",
        value: await read(pathname, { language: page.language }),
      };
    } catch (error) {
      return {
        status: "error",
        code:
          error instanceof PersonalizationPreviewError
            ? error.code
            : "UNAVAILABLE",
        ...(error instanceof PersonalizationPreviewError
          ? {
              statusCode: error.status,
              upstreamStatus: (
                error as PersonalizationPreviewError & {
                  upstreamStatus?: number;
                }
              ).upstreamStatus,
            }
          : {}),
      };
    }
  };
  const uuid = encodeURIComponent(page.id);
  const normalized = encodeURIComponent(
    page.id.replace(/[{}-]/g, "").toLowerCase(),
  );
  const [byPageUuid, byPageNormalized, personalizationV2] = await Promise.all([
    probe(`/api/v1/flows/by-page/${uuid}`),
    probe(`/api/v1/flows/by-page/${normalized}`),
    probe(`/api/v2/personalization/by-page/${uuid}`),
  ]);
  return { byPageUuid, byPageNormalized, personalizationV2 };
}
