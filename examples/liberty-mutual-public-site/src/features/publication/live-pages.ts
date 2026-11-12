import {
  digest,
  identifier,
  PublicationError,
  PUBLIC_SITE,
  RESOURCE_PAGE_TEMPLATE,
  pageIncludedInSearch,
  publishedTaxonomy,
  TAXONOMY_FIELD_QUERY,
  type NativeField,
  type NativeTaxonomyField,
  type PublishedAnswer,
  type PublishedLink,
  type SearchOperation,
} from "./content";
import type { LiveContentReader } from "./live-content";

export const PUBLIC_HOME =
  "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Home";
export const PUBLIC_HOME_ID = "6d6003323e214c5f83ecaae04f83450f";
export const PUBLIC_PAGE_TEMPLATE = "a4de2222-c8a5-54d4-adee-bbad976a457c";

export interface NativeSearchPage {
  id: string;
  path: string;
  version: number;
  template: { id: string };
  includeInSearch?: NativeField;
  metadataTitle?: NativeField;
  metadataDescription?: NativeField;
  canonicalUrl?: NativeField;
  sourceLink?: NativeField;
  state?: NativeTaxonomyField;
  product?: NativeTaxonomyField;
  audience?: NativeTaxonomyField;
}

export interface PublishedSearchPage {
  kind: "page";
  id: string;
  language: "en";
  version: number;
  revision: string;
  title: string;
  summary: string;
  body: string;
  canonicalUrl: string;
  sourceLink: PublishedLink;
  state: string;
  product: string;
  audience: string;
}

/** An answer displayed by a native FAQ component on an indexed public page. */
export interface PublishedSearchFaq extends Omit<PublishedSearchPage, "kind"> {
  kind: "faq";
  question: string;
  parentId: string;
}

export type PublishedPageSearchContent =
  PublishedSearchPage | PublishedSearchFaq;
export type PublishedSearchContent =
  PublishedAnswer | PublishedPageSearchContent;
export interface SearchContentReader {
  readAll(signal?: AbortSignal): Promise<PublishedSearchContent[]>;
}
export interface SearchPageReader {
  readAll(signal?: AbortSignal): Promise<PublishedPageSearchContent[]>;
}

// Search selects published native pages, not a code-maintained list of result URLs.
const PAGES_QUERY = `query PublishedSearchPages($after: String) {
  search(where: { AND: [
    {name: "_path", value: "${PUBLIC_HOME_ID}", operator: CONTAINS}
    {name: "_templates", value: "${PUBLIC_PAGE_TEMPLATE.replaceAll("-", "")}", operator: CONTAINS}
    {name: "_language", value: "en", operator: EQ}
    {name: "_latestversion", value: "true", operator: EQ}
  ]}, first: 50, after: $after) {
    pageInfo { hasNext endCursor }
    results {
      id path version template { id }
      includeInSearch: field(name: "includeInSearch") { jsonValue }
      metadataTitle: field(name: "metadataTitle") { jsonValue }
      metadataDescription: field(name: "metadataDescription") { jsonValue }
      canonicalUrl: field(name: "canonicalUrl") { jsonValue }
      sourceLink: field(name: "sourceLink") { jsonValue }
      state: field(name: "state") { ${TAXONOMY_FIELD_QUERY} }
      product: field(name: "product") { ${TAXONOMY_FIELD_QUERY} }
      audience: field(name: "audience") { ${TAXONOMY_FIELD_QUERY} }
    }
  }
}`;

const PAGE_BODY_QUERY = `query PublishedSearchPageBody($dataPath: String!, $route: String!) {
  localData: item(path: $dataPath, language: "en") {
    path children(first: 50) {
      pageInfo { hasNext }
      results { id path }
    }
  }
  layout(site: "${PUBLIC_SITE}", routePath: $route, language: "en") {
    item { rendered }
  }
}`;

function invalid(): never {
  throw new PublicationError("INVALID_PUBLISHED_PAGE");
}

function fieldText(field?: NativeField, limit = 50000): string {
  const value = field?.jsonValue?.value;
  if (value == null) return "";
  if (typeof value !== "string" || value.length > limit) invalid();
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
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function canonical(page: NativeSearchPage, origin: string): URL {
  const value = fieldText(page.canonicalUrl, 2000);
  if (!value || /[\u0000-\u0020\\]/.test(value)) invalid();
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return invalid();
  }
  if (
    url.origin !== origin ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /%2f|%5c/i.test(url.pathname)
  )
    invalid();
  return url;
}

function source(page: NativeSearchPage): PublishedLink {
  const value = page.sourceLink?.jsonValue?.value;
  if (!value || typeof value !== "object" || !("href" in value)) invalid();
  const href = value.href;
  if (typeof href !== "string" || /[\u0000-\u0020\\]/.test(href)) invalid();
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return invalid();
  }
  if (url.protocol !== "https:" || url.username || url.password) invalid();
  return {
    href: url.href,
    text: "text" in value && typeof value.text === "string" ? value.text : "",
  };
}

interface PublishedPageBody {
  localData?: {
    path: string;
    children: {
      results: Array<{ id: string; path: string }>;
      pageInfo: { hasNext: boolean };
    };
  } | null;
  layout?: { item?: { rendered?: unknown } | null } | null;
}

const COMPONENT_TEXT_FIELDS: Record<string, readonly string[]> = {
  PublicHero: ["heading", "summary"],
  PublicArticle: ["heading", "body"],
  PublicSplitContent: ["heading", "body"],
  PublicCta: ["heading", "body"],
  PublicSection: ["heading", "introduction"],
  PublicFaq: ["heading"],
};

interface RenderedFaq {
  id: string;
  question: string;
  answer: string;
}

function renderedContent(
  page: NativeSearchPage,
  data: PublishedPageBody,
): { body: string; faqs: RenderedFaq[] } {
  const localPath = `${page.path}/Data`;
  const local = data.localData;
  if (
    local?.path?.toLowerCase() !== localPath.toLowerCase() ||
    !Array.isArray(local?.children?.results) ||
    local.children.pageInfo?.hasNext !== false
  )
    throw new PublicationError("INCOMPLETE_PUBLISHED_PAGE");
  const localIds = new Set(
    local.children.results.map((item) => {
      if (!item.path.toLowerCase().startsWith(`${localPath.toLowerCase()}/`))
        invalid();
      return identifier(item.id);
    }),
  );
  const localPaths = new Set(
    local.children.results.map((item) => item.path.toLowerCase()),
  );
  let rendered = data.layout?.item?.rendered;
  if (typeof rendered === "string") {
    try {
      rendered = JSON.parse(rendered);
    } catch {
      return invalid();
    }
  }
  const route = (
    rendered as {
      sitecore?: {
        route?: { itemId?: string; placeholders?: unknown };
      };
    }
  )?.sitecore?.route;
  if (!route?.itemId || identifier(route.itemId) !== identifier(page.id))
    throw new PublicationError("PUBLISHED_PAGE_LAYOUT_MISMATCH");
  const text: string[] = [];
  const faqs = new Map<string, RenderedFaq>();
  let count = 0;
  function visit(value: unknown, depth = 0) {
    if (depth > 20 || ++count > 1500) invalid();
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, depth + 1));
      return;
    }
    if (!value || typeof value !== "object") return;
    const row = value as Record<string, unknown>;
    const ds = typeof row.dataSource === "string" ? row.dataSource : "";
    const localSource =
      /^\{?[a-f\d-]{32,38}\}?$/i.test(ds) && localIds.has(identifier(ds));
    const relativeSource =
      /^(?:page:|local:)\/Data\/[^/]+$/i.test(ds) &&
      localPaths.has(
        `${page.path}${ds.replace(/^(?:page:|local:)/i, "")}`.toLowerCase(),
      );
    const absoluteSource = localPaths.has(ds.toLowerCase());
    const componentName = String(row.componentName);
    const names = COMPONENT_TEXT_FIELDS[componentName];
    if ((localSource || relativeSource || absoluteSource) && names) {
      const fields = row.fields as Record<string, unknown> | undefined;
      const collect = (values: unknown, names: readonly string[]) => {
        if (!values || typeof values !== "object") return;
        const fields = values as Record<string, { value?: unknown }>;
        for (const name of names) {
          const value = fields?.[name]?.value;
          if (value != null && typeof value !== "string") invalid();
          if (typeof value === "string") text.push(plain(value));
        }
      };
      collect(fields, names);
      if (componentName === "PublicFaq" || componentName === "PublicSection") {
        const items = fields?.items;
        if (items != null && !Array.isArray(items)) invalid();
        if (Array.isArray(items)) {
          if (items.length > 50) invalid();
          for (const item of items) {
            collect(
              item && typeof item === "object" ? item.fields : undefined,
              componentName === "PublicFaq"
                ? ["question", "answer"]
                : ["heading", "body"],
            );
            if (componentName === "PublicFaq") {
              const fields = item?.fields;
              const question = plain(
                fieldText({ jsonValue: fields?.question }),
              );
              const answer = plain(fieldText({ jsonValue: fields?.answer }));
              // A blank authoring item is not an answer. Only the published,
              // complete Q&A displayed by this component is a Search document.
              if (!question || !answer) continue;
              const id = identifier(item.id);
              faqs.set(id, { id, question, answer });
            }
          }
        }
      }
    }
    // Only components in the native rendered layout contribute. Unused local
    // drafts, shared navigation, promotions, and arbitrary fields do not.
    if (row.placeholders) visit(row.placeholders, depth + 1);
    else if (!row.componentName)
      Object.values(row).forEach((child) => visit(child, depth + 1));
  }
  visit(route.placeholders);
  const body = text.filter(Boolean).join("\n");
  if (!body || body.length > 100000) invalid();
  return { body, faqs: [...faqs.values()] };
}

export class LivePages {
  constructor(
    private readonly liveContextId: string,
    private readonly publicOrigin: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!liveContextId.trim())
      throw new PublicationError("LIVE_CONTEXT_NOT_CONFIGURED");
  }

  private async query<T>(
    query: string,
    variables: unknown,
    signal: AbortSignal,
  ): Promise<T> {
    try {
      const response = await this.transport(
        "https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1",
        {
          method: "POST",
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.any([signal, AbortSignal.timeout(3500)]),
          headers: {
            "Content-Type": "application/json",
            "x-sitecore-contextid": this.liveContextId,
          },
          body: JSON.stringify({ query, variables }),
        },
      );
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.errors?.length || !result.data) throw new Error();
      return result.data;
    } catch {
      throw new PublicationError("LIVE_PAGES_UNAVAILABLE");
    }
  }

  async readAll(signal?: AbortSignal): Promise<PublishedPageSearchContent[]> {
    const deadline = AbortSignal.any([
      AbortSignal.timeout(10000),
      ...(signal ? [signal] : []),
    ]);
    const pages: NativeSearchPage[] = [];
    const seen = new Set<string>();
    const cursors = new Set<string>();
    let after: string | undefined;
    for (let index = 0; index < 2; index++) {
      const result = await this.query<{
        search?: {
          results: NativeSearchPage[];
          pageInfo: { hasNext: boolean; endCursor?: string };
        };
      }>(PAGES_QUERY, { after }, deadline);
      const batch = result.search;
      if (
        !Array.isArray(batch?.results) ||
        typeof batch.pageInfo?.hasNext !== "boolean"
      )
        throw new PublicationError("INCOMPLETE_PUBLISHED_PAGES");
      for (const page of batch.results) {
        const id = identifier(page.id);
        if (seen.has(id)) throw new PublicationError("DUPLICATE_PUBLISHED_ID");
        seen.add(id);
        if (!(
          page.path.toLowerCase() === PUBLIC_HOME.toLowerCase() ||
          page.path.toLowerCase().startsWith(`${PUBLIC_HOME.toLowerCase()}/`)
        ))
          throw new PublicationError("OUT_OF_SCOPE_PUBLISHED_PAGE");
        const template = identifier(page.template.id);
        // ResourcePage derives from PublicPage, so Edge's base-template query also
        // returns it. Its structured page projection owns this document exactly once.
        if (template === RESOURCE_PAGE_TEMPLATE) continue;
        if (template !== PUBLIC_PAGE_TEMPLATE)
          throw new PublicationError("OUT_OF_SCOPE_PUBLISHED_PAGE");
        if (pageIncludedInSearch(page.includeInSearch)) pages.push(page);
      }
      if (!batch.pageInfo.hasNext) break;
      const cursor = batch.pageInfo.endCursor;
      if (index === 1 || !cursor || cursors.has(cursor))
        throw new PublicationError("INCOMPLETE_PUBLISHED_PAGES");
      cursors.add(cursor);
      after = cursor;
    }
    const published: PublishedPageSearchContent[] = [];
    for (let offset = 0; offset < pages.length; offset += 4) {
      published.push(
        ...(
          await Promise.all(
            pages.slice(offset, offset + 4).map(async (page) => {
              if (!Number.isInteger(page.version) || page.version < 1)
                invalid();
              const url = canonical(page, this.publicOrigin);
              const data = await this.query<PublishedPageBody>(
                PAGE_BODY_QUERY,
                { dataPath: `${page.path}/Data`, route: url.pathname },
                deadline,
              );
              const content = renderedContent(page, data);
              const value = {
                kind: "page" as const,
                id: identifier(page.id),
                language: "en" as const,
                version: page.version,
                title: plain(fieldText(page.metadataTitle, 500)),
                summary: plain(fieldText(page.metadataDescription, 2000)),
                body: content.body,
                canonicalUrl: url.href,
                sourceLink: source(page),
                state: publishedTaxonomy(page.state, "state"),
                product: publishedTaxonomy(page.product, "product"),
                audience: publishedTaxonomy(page.audience, "audience"),
              };
              if (!value.title || !value.summary) invalid();
              const publishedPage = { ...value, revision: digest(value) };
              const publishedFaqs = content.faqs.map((faq) => {
                const faqValue = {
                  ...value,
                  kind: "faq" as const,
                  id: faq.id,
                  parentId: value.id,
                  question: faq.question,
                  title: faq.question,
                  summary: faq.answer,
                  // Parent metadata supplies real page context, while the
                  // answer shown to the visitor remains this exact native FAQ.
                  body: [value.title, value.summary, faq.question, faq.answer]
                    .filter(Boolean)
                    .join("\n"),
                  canonicalUrl: `${value.canonicalUrl}#faq-${faq.id}`,
                };
                return { ...faqValue, revision: digest(faqValue) };
              });
              return [publishedPage, ...publishedFaqs];
            }),
          )
        ).flat(),
      );
    }
    return published.sort((a, b) => a.id.localeCompare(b.id));
  }
}

/** Merge structured resource pages and ordinary opted-in pages without duplicate records. */
export class LiveSearchContent implements SearchContentReader {
  constructor(
    private readonly answers: LiveContentReader,
    private readonly pages: SearchPageReader,
  ) {}
  async readAll(signal?: AbortSignal): Promise<PublishedSearchContent[]> {
    const [answers, pages] = await Promise.all([
      this.answers.readAll(signal),
      this.pages.readAll(signal),
    ]);
    const contents = [...answers, ...pages].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    if (new Set(contents.map((item) => item.id)).size !== contents.length)
      throw new PublicationError("DUPLICATE_PUBLISHED_ID");
    const urls = contents.map((item) =>
      item.canonicalUrl.replace(/\/$/, "").toLowerCase(),
    );
    if (new Set(urls).size !== urls.length)
      throw new PublicationError("DUPLICATE_PUBLISHED_URL");
    return contents;
  }
}

export function pageSearchDocument(
  page: PublishedPageSearchContent,
): SearchOperation {
  return {
    action: "upsert",
    id: page.id,
    locale: "en",
    sc_url: page.canonicalUrl,
    fields: {
      title: page.title,
      question: page.kind === "faq" ? page.question : "",
      summary: page.summary,
      body: page.body,
      canonicalurl: page.canonicalUrl,
      sourceurl: page.sourceLink.href,
      nextstepurl: "",
      revision: page.revision,
      owner: "",
      effectivedate: "",
      reviewdate: "",
      state: page.state,
      product: page.product,
      audience: page.audience,
    },
  };
}
