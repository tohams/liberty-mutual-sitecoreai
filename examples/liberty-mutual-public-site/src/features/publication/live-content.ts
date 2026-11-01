import {
  ANSWER_ROOT,
  ANSWER_TEMPLATE,
  PublicationError,
  identifier,
  mapPublishedAnswer,
  type NativeAnswer,
  type PublishedAnswer,
} from "./content";

const QUERY = `query PublishedAnswers($root: String!, $after: String) {
  item(path: $root, language: "en") {
    id path
    children(first: 10, after: $after) {
      pageInfo { hasNext endCursor }
      results {
        id path version template { id }
        question: field(name: "question") { jsonValue }
        answer: field(name: "answer") { jsonValue }
        formalWording: field(name: "formalWording") { jsonValue }
        explanation: field(name: "explanation") { jsonValue }
        owner: field(name: "owner") { jsonValue }
        effectiveDate: field(name: "effectiveDate") { jsonValue }
        reviewDate: field(name: "reviewDate") { jsonValue }
        state: field(name: "state") { jsonValue }
        product: field(name: "product") { jsonValue }
        audience: field(name: "audience") { jsonValue }
        sourceLink: field(name: "sourceLink") { jsonValue }
        nextStep: field(name: "nextStep") { jsonValue }
        canonicalUrl: field(name: "canonicalUrl") { jsonValue }
        disclosure: field(name: "disclosure") {
          ... on LookupField { targetId targetItem {
            id path template { id }
            title: field(name: "title") { jsonValue }
            body: field(name: "body") { jsonValue }
            owner: field(name: "owner") { jsonValue }
            effectiveDate: field(name: "effectiveDate") { jsonValue }
            reviewDate: field(name: "reviewDate") { jsonValue }
            sourceLink: field(name: "sourceLink") { jsonValue }
          } }
        }
      }
    }
  }
}`;

interface PageResult {
  data?: {
    item?: {
      path: string;
      children: {
        results: NativeAnswer[];
        pageInfo: { hasNext: boolean; endCursor?: string };
      };
    } | null;
  };
  errors?: unknown[];
}
export interface LiveContentReader {
  readAll(signal?: AbortSignal): Promise<PublishedAnswer[]>;
}

/** Dedicated Live-only connection. It deliberately never reads the app's Preview context. */
export class LiveContent implements LiveContentReader {
  constructor(
    private readonly liveContextId: string,
    private readonly publicOrigin: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!liveContextId.trim())
      throw new PublicationError("LIVE_CONTEXT_NOT_CONFIGURED");
  }

  async readAll(signal?: AbortSignal): Promise<PublishedAnswer[]> {
    const answers: PublishedAnswer[] = [];
    const cursors = new Set<string>();
    const ids = new Set<string>();
    let after: string | undefined;
    const deadline = AbortSignal.timeout(10000);
    for (let page = 0; page < 10; page++) {
      let result: PageResult;
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
              variables: { root: ANSWER_ROOT, after },
            }),
          },
        );
        if (!response.ok)
          throw new PublicationError("LIVE_CONTENT_UNAVAILABLE");
        result = await response.json();
      } catch {
        throw new PublicationError("LIVE_CONTENT_UNAVAILABLE");
      }
      const root = result.data?.item;
      if (
        result.errors?.length ||
        root?.path?.toLowerCase() !== ANSWER_ROOT.toLowerCase() ||
        !Array.isArray(root?.children?.results) ||
        typeof root.children.pageInfo?.hasNext !== "boolean"
      )
        throw new PublicationError("LIVE_LIBRARY_UNAVAILABLE");
      for (const item of root.children.results) {
        if (identifier(item.template.id) !== ANSWER_TEMPLATE) continue;
        const answer = mapPublishedAnswer(item, this.publicOrigin);
        if (ids.has(answer.id))
          throw new PublicationError("DUPLICATE_PUBLISHED_ID");
        answers.push(answer);
        ids.add(answer.id);
      }
      if (!root.children.pageInfo.hasNext)
        return answers.sort((a, b) => a.id.localeCompare(b.id));
      const cursor = root.children.pageInfo.endCursor;
      if (!cursor || cursors.has(cursor))
        throw new PublicationError("INCOMPLETE_LIVE_CONTENT");
      cursors.add(cursor);
      after = cursor;
    }
    throw new PublicationError("LIVE_CONTENT_LIMIT_EXCEEDED");
  }
}
