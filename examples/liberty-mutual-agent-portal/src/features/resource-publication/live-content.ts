import { RESOURCE_METADATA_FIELD_QUERY } from "@/domain/resource-metadata";
import {
  RESOURCE_ROOT,
  RESOURCE_TEMPLATE,
  PublicationError,
  identifier,
  mapPublishedResource,
  type NativeResource,
  type PublishedResource,
} from "./content";

const QUERY = `query PublishedPortalResources($root: String!, $after: String) {
  item(path: $root, language: "en") {
    id path
    children(first: 8, after: $after) {
      pageInfo { hasNext endCursor }
      results {
        id name path version template { id }
        title: field(name: "Title") { jsonValue }
        summary: field(name: "summary") { jsonValue }
        body: field(name: "body") { jsonValue }
        state: field(name: "state") { ${RESOURCE_METADATA_FIELD_QUERY} }
        businessFamily: field(name: "businessFamily") { ${RESOURCE_METADATA_FIELD_QUERY} }
        product: field(name: "product") { ${RESOURCE_METADATA_FIELD_QUERY} }
        channel: field(name: "channel") { ${RESOURCE_METADATA_FIELD_QUERY} }
        resourceType: field(name: "resourceType") { ${RESOURCE_METADATA_FIELD_QUERY} }
      }
    }
  }
}`;

interface QueryResult {
  data?: {
    item?: {
      path: string;
      children: {
        results: NativeResource[];
        pageInfo: { hasNext: boolean; endCursor?: string };
      };
    } | null;
  };
  errors?: unknown[];
}

export interface ResourceContentReader {
  readAll(signal?: AbortSignal): Promise<PublishedResource[]>;
}

/** Dedicated Live connection. Preview content cannot enter the published source. */
export class LiveResources implements ResourceContentReader {
  constructor(
    private readonly liveContextId: string,
    private readonly origin: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!liveContextId.trim())
      throw new PublicationError("RESOURCE_LIVE_CONTEXT_NOT_CONFIGURED");
  }

  async readAll(signal?: AbortSignal): Promise<PublishedResource[]> {
    const resources: PublishedResource[] = [];
    const cursors = new Set<string>();
    const ids = new Set<string>();
    let after: string | undefined;
    const deadline = AbortSignal.timeout(15000);
    for (let page = 0; page < 25; page++) {
      let result: QueryResult;
      try {
        const response = await this.transport(
          "https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1",
          {
            method: "POST",
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.any([
              deadline,
              AbortSignal.timeout(3500),
              ...(signal ? [signal] : []),
            ]),
            headers: {
              "Content-Type": "application/json",
              "x-sitecore-contextid": this.liveContextId,
            },
            body: JSON.stringify({
              query: QUERY,
              variables: { root: RESOURCE_ROOT, after },
            }),
          },
        );
        if (!response.ok) throw new Error();
        result = await response.json();
      } catch {
        throw new PublicationError("RESOURCE_LIVE_UNAVAILABLE");
      }
      const root = result.data?.item;
      if (
        result.errors?.length ||
        root?.path?.toLowerCase() !== RESOURCE_ROOT.toLowerCase() ||
        !Array.isArray(root?.children?.results) ||
        typeof root.children.pageInfo?.hasNext !== "boolean"
      )
        throw new PublicationError("RESOURCE_LIBRARY_UNAVAILABLE");
      for (const item of root.children.results) {
        if (identifier(item.template.id) !== RESOURCE_TEMPLATE) continue;
        const resource = mapPublishedResource(item, this.origin);
        if (ids.has(resource.id))
          throw new PublicationError("DUPLICATE_PUBLISHED_ID");
        resources.push(resource);
        ids.add(resource.id);
      }
      if (!root.children.pageInfo.hasNext)
        return resources.sort((a, b) => a.id.localeCompare(b.id));
      const cursor = root.children.pageInfo.endCursor;
      if (!cursor || cursors.has(cursor))
        throw new PublicationError("INCOMPLETE_LIVE_CONTENT");
      cursors.add(cursor);
      after = cursor;
    }
    throw new PublicationError("RESOURCE_CONTENT_LIMIT_EXCEEDED");
  }
}
