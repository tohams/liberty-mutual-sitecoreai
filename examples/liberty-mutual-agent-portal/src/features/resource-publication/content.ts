import { createHash } from "node:crypto";
import {
  resolveResourceMetadataField,
  type ResourceMetadataField,
} from "@/domain/resource-metadata";

export const PORTAL_SITE = "liberty-mutual-agent-portal";
export const RESOURCE_ROOT = `/sitecore/content/LibertyMutual/${PORTAL_SITE}/Home/resources`;
export const RESOURCE_TEMPLATE = "e9573e8d-00d6-5fd9-9015-2f0aec4a0b60";

export class PublicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 503,
  ) {
    super(code);
  }
}

export function identifier(value: unknown): string {
  if (typeof value !== "string") throw new PublicationError("INVALID_ID", 400);
  const raw = value.replace(/[{}-]/g, "").toLowerCase();
  if (!/^[a-f\d]{32}$/.test(raw)) throw new PublicationError("INVALID_ID", 400);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

interface NativeTextField {
  jsonValue?: { value?: unknown } | null;
}
export interface NativeResource {
  id: string;
  name: string;
  path: string;
  version: number;
  template: { id: string };
  title?: NativeTextField;
  summary?: NativeTextField;
  body?: NativeTextField;
  state?: unknown;
  businessFamily?: unknown;
  product?: unknown;
  channel?: unknown;
  resourceType?: unknown;
}

export interface PublishedResource {
  id: string;
  version: number;
  language: "en";
  revision: string;
  canonicalUrl: string;
  title: string;
  summary: string;
  body: string;
  state: string[];
  businessFamily: string[];
  product: string[];
  channel: string[];
  resourceType: string[];
}

function text(field: NativeTextField | undefined, maximum = 50000): string {
  const value = field?.jsonValue?.value;
  if (value == null) return "";
  if (typeof value !== "string" || value.length > maximum)
    throw new PublicationError("INVALID_PUBLISHED_RESOURCE");
  return value.trim();
}

function plain(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metadata(
  item: NativeResource,
  field: ResourceMetadataField,
): string[] {
  try {
    const values = [
      ...new Set(resolveResourceMetadataField(field, item[field])),
    ].sort();
    if (!values.length) throw new Error();
    return values;
  } catch {
    throw new PublicationError("INVALID_PUBLISHED_RESOURCE_METADATA");
  }
}

export function mapPublishedResource(
  item: NativeResource,
  origin: string,
): PublishedResource {
  if (
    identifier(item.template.id) !== RESOURCE_TEMPLATE ||
    !/^[a-z\d-]+$/i.test(item.name) ||
    item.path.toLowerCase() !== `${RESOURCE_ROOT}/${item.name}`.toLowerCase()
  )
    throw new PublicationError("OUT_OF_SCOPE_RESOURCE");
  if (!Number.isSafeInteger(item.version) || item.version < 1)
    throw new PublicationError("INVALID_PUBLISHED_RESOURCE");
  const result = {
    id: identifier(item.id),
    version: item.version,
    language: "en" as const,
    canonicalUrl: new URL(`/resources/${item.name}`, origin).href,
    title: plain(text(item.title, 500)),
    summary: plain(text(item.summary, 4000)),
    body: plain(text(item.body)),
    state: metadata(item, "state"),
    businessFamily: metadata(item, "businessFamily"),
    product: metadata(item, "product"),
    channel: metadata(item, "channel"),
    resourceType: metadata(item, "resourceType"),
  };
  if (!result.title || !result.summary || !result.body)
    throw new PublicationError("INCOMPLETE_PUBLISHED_RESOURCE");
  return { ...result, revision: digest(result) };
}

export interface SearchOperation {
  action: "upsert" | "delete";
  id: string;
  locale: "en";
  sc_url?: string;
  fields?: Record<string, string>;
}

/** Native Tags fields parse a comma-delimited wire string into independent terms. */
export function encodeResourceTags(values: readonly string[]): string {
  if (
    !values.length ||
    values.some(
      (value) =>
        !value || value !== value.trim() || /[,\u0000-\u001f]/.test(value),
    )
  )
    throw new PublicationError("INVALID_PUBLISHED_RESOURCE_METADATA");
  return [...new Set(values)].sort().join(",");
}

export function searchDocument(resource: PublishedResource): SearchOperation {
  return {
    action: "upsert",
    id: resource.id,
    locale: "en",
    sc_url: resource.canonicalUrl,
    fields: {
      title: resource.title,
      summary: resource.summary,
      body: resource.body,
      url: resource.canonicalUrl,
      revision: resource.revision,
      state: encodeResourceTags(resource.state),
      businessfamily: encodeResourceTags(resource.businessFamily),
      product: encodeResourceTags(resource.product),
      channel: encodeResourceTags(resource.channel),
      resourcetype: encodeResourceTags(resource.resourceType),
    },
  };
}
