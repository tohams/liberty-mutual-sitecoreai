import "server-only";
import {
  PersonalizationPreviewError,
  personalizationPreviewApiConfiguration,
} from "@/server/marketplace/personalization-preview-config";
import { readPersonalizationResponse } from "./upstream";

export interface NativeMetadataItem {
  id: string;
  name: string;
  displayName?: string;
}
export type NativeMetadataReader = (
  ids: string[],
  language: string,
) => Promise<Map<string, NativeMetadataItem>>;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const normalizedId = (value: unknown) =>
  typeof value === "string" ? value.replace(/[{}-]/g, "").toLowerCase() : "";
const text = (value: unknown): string | undefined =>
  typeof value === "string" &&
  value.trim() &&
  value.length <= 300 &&
  !/[\u0000-\u001f]/.test(value)
    ? value.trim()
    : undefined;
function unavailable(status = 502): never {
  throw new PersonalizationPreviewError(
    "NATIVE_METADATA_UNAVAILABLE",
    "SitecoreAI could not read the names of this page’s native content variants.",
    status,
  );
}

/** One delegated, read-only GraphQL operation for names of exact layout-referenced items. */
export function nativeMetadataReader(
  accessToken: string,
  transport: typeof fetch = fetch,
): NativeMetadataReader {
  return async (ids, language) => {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    if (
      unique.length > 50 ||
      unique.some((id) => !/^[a-f0-9]{32}$/.test(id)) ||
      !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)
    )
      unavailable();
    if (!accessToken || /[\s\u0000-\u001f]/.test(accessToken)) unavailable(401);
    const { contextId } = personalizationPreviewApiConfiguration();
    const url = new URL(
      "https://edge-platform.sitecorecloud.io/v1/authoring/graphql",
    );
    url.search = new URLSearchParams({
      sitecoreContextId: contextId,
    }).toString();
    const query = `query NativeContentNames(${unique.map((_, index) => `$where${index}:ItemQueryInput!`).join(",")}){${unique.map((_, index) => `m${index}:item(where:$where${index}){itemId name displayName:field(name:"__Display name"){value}}`).join(" ")}}`;
    const variables = Object.fromEntries(
      unique.map((id, index) => [
        `where${index}`,
        { database: "master", itemId: id, language },
      ]),
    );
    let response: Response;
    try {
      response = await transport(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "sc-resource": "marketplace",
          "sc-marketplace-auth": "interactive/v1",
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      unavailable();
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      unavailable([401, 403].includes(response.status) ? response.status : 502);
    }
    const result = await readPersonalizationResponse(response);
    if (!object(result) || result.errors || !object(result.data)) unavailable();
    const output = new Map<string, NativeMetadataItem>();
    unique.forEach((expected, index) => {
      const item = (result.data as Record<string, unknown>)[`m${index}`];
      if (!object(item) || normalizedId(item.itemId) !== expected)
        unavailable();
      const name = text(item.name);
      if (!name) unavailable();
      const displayName = object(item.displayName)
        ? text(item.displayName.value)
        : undefined;
      output.set(expected, {
        id: expected,
        name,
        ...(displayName ? { displayName } : {}),
      });
    });
    return output;
  };
}
