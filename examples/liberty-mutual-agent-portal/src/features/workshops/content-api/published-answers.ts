import "server-only";

export const PUBLIC_CONTENT_ORIGIN =
  "https://liberty-mutual-public-site.vercel.app";
export const ANSWER_COLLECTION_URL = `${PUBLIC_CONTENT_ORIGIN}/api/content/v1/answers`;

const MAX_RESPONSE_BYTES = 1_048_576;
const ID_PATTERN = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const REVISION_PATTERN = /^[a-f0-9]{64}$/;

export interface PublishedLink {
  href: string;
  text: string;
}

export interface PublishedAnswer {
  id: string;
  language: "en";
  version: number;
  revision: string;
  revisionKind: "published-content-sha256";
  question: string;
  answer: string;
  formalWording: string;
  explanation: string;
  owner: string;
  effectiveDate: string;
  reviewDate: string;
  state: string;
  product: string;
  audience: string;
  sourceLink: PublishedLink | null;
  canonicalUrl: string;
}

export interface PublishedAnswerResponse<T> {
  schemaVersion: "1.0";
  data: T;
  meta: {
    site: "liberty-mutual-public-site";
    language: "en";
    source: "SitecoreAI Experience Edge Live";
    contentRevision: string;
  };
}

export interface AnswerConsumerResult {
  answers: PublishedAnswer[];
  selected: PublishedAnswerResponse<PublishedAnswer>;
  endpoint: string;
  etag: string | null;
  receivedAt: string;
  conditionalStatus?: 200 | 304;
}

export class PublishedContentUnavailable extends Error {
  constructor() {
    super("The published answer service is unavailable.");
  }
}

export class PublishedAnswerNotAvailable extends Error {
  constructor() {
    super("The selected answer is not currently published.");
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PublishedContentUnavailable();
  return value as Record<string, unknown>;
}

function text(value: unknown, maxLength = 50_000): string {
  if (typeof value !== "string" || value.length > maxLength)
    throw new PublishedContentUnavailable();
  return value;
}

function safeLink(value: unknown): PublishedLink | null {
  if (value === null) return null;
  const link = record(value);
  const href = text(link.href, 2_048);
  let url: URL;
  try {
    url = new URL(href, PUBLIC_CONTENT_ORIGIN);
  } catch {
    throw new PublishedContentUnavailable();
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hostname === "localhost"
  )
    throw new PublishedContentUnavailable();
  return { href: url.href, text: text(link.text, 500) };
}

function publishedAnswer(value: unknown): PublishedAnswer {
  const answer = record(value);
  if (
    typeof answer.id !== "string" ||
    !ID_PATTERN.test(answer.id) ||
    answer.language !== "en" ||
    !Number.isSafeInteger(answer.version) ||
    Number(answer.version) < 1 ||
    answer.revisionKind !== "published-content-sha256" ||
    typeof answer.revision !== "string" ||
    !REVISION_PATTERN.test(answer.revision)
  )
    throw new PublishedContentUnavailable();
  const canonicalUrl = text(answer.canonicalUrl, 2_048);
  const canonical = new URL(canonicalUrl);
  if (
    canonical.origin !== PUBLIC_CONTENT_ORIGIN ||
    !canonical.pathname.startsWith("/insurance-resources/") ||
    canonical.search ||
    canonical.hash
  )
    throw new PublishedContentUnavailable();
  const fields = [
    "question",
    "answer",
    "formalWording",
    "explanation",
    "owner",
    "effectiveDate",
    "reviewDate",
    "state",
    "product",
    "audience",
  ] as const;
  const content = Object.fromEntries(
    fields.map((field) => [field, text(answer[field])]),
  ) as Pick<PublishedAnswer, (typeof fields)[number]>;
  if (!content.question.trim() || !content.answer.trim())
    throw new PublishedContentUnavailable();
  return {
    ...content,
    id: answer.id,
    language: "en",
    version: Number(answer.version),
    revision: answer.revision,
    revisionKind: "published-content-sha256",
    canonicalUrl,
    sourceLink: safeLink(answer.sourceLink),
  };
}

function envelope<T>(
  value: unknown,
  data: (value: unknown) => T,
): PublishedAnswerResponse<T> {
  const response = record(value);
  const meta = record(response.meta);
  if (
    response.schemaVersion !== "1.0" ||
    meta.site !== "liberty-mutual-public-site" ||
    meta.language !== "en" ||
    meta.source !== "SitecoreAI Experience Edge Live" ||
    typeof meta.contentRevision !== "string" ||
    !REVISION_PATTERN.test(meta.contentRevision)
  )
    throw new PublishedContentUnavailable();
  return {
    schemaVersion: "1.0",
    data: data(response.data),
    meta: {
      site: "liberty-mutual-public-site",
      language: "en",
      source: "SitecoreAI Experience Edge Live",
      contentRevision: meta.contentRevision,
    },
  };
}

async function boundedJson(response: Response): Promise<unknown> {
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json") ||
    Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES ||
    !response.body
  )
    throw new PublishedContentUnavailable();
  const reader = response.body.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new PublishedContentUnavailable();
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    return JSON.parse(body.toString("utf8"));
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** This separate rendering host consumes the public REST contract, never the CMS. */
export async function loadPublishedAnswer(
  requestedId?: string,
  checkUnchanged = false,
  fetcher: typeof fetch = fetch,
): Promise<AnswerConsumerResult> {
  try {
    const options = {
      cache: "no-store" as const,
      redirect: "error" as const,
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    };
    const collection = envelope(
      await boundedJson(await fetcher(ANSWER_COLLECTION_URL, options)),
      (value) => {
        if (!Array.isArray(value) || !value.length || value.length > 100)
          throw new PublishedContentUnavailable();
        const answers = value.map(publishedAnswer);
        if (new Set(answers.map((answer) => answer.id)).size !== answers.length)
          throw new PublishedContentUnavailable();
        return answers;
      },
    );
    const answers = collection.data;
    const requested = answers.find((answer) => answer.id === requestedId);
    if (requestedId !== undefined && !requested)
      throw new PublishedAnswerNotAvailable();
    const chosen =
      requested ??
      answers.find((answer) => answer.product === "auto-home") ??
      answers[0];
    const endpoint = `${ANSWER_COLLECTION_URL}/${chosen.id}`;
    const response = await fetcher(endpoint, options);
    if (response.status === 404) throw new PublishedAnswerNotAvailable();
    let selected = envelope(await boundedJson(response), publishedAnswer);
    if (selected.data.id !== chosen.id) throw new PublishedContentUnavailable();
    let etag = response.headers.get("etag");
    let conditionalStatus: 200 | 304 | undefined;
    if (checkUnchanged && etag) {
      const checked = await fetcher(endpoint, {
        ...options,
        headers: { ...options.headers, "If-None-Match": etag },
      });
      if (checked.status === 304) conditionalStatus = 304;
      else if (checked.status === 404) throw new PublishedAnswerNotAvailable();
      else if (checked.status === 200) {
        selected = envelope(await boundedJson(checked), publishedAnswer);
        if (selected.data.id !== chosen.id)
          throw new PublishedContentUnavailable();
        etag = checked.headers.get("etag");
        conditionalStatus = 200;
      } else throw new PublishedContentUnavailable();
    }
    return {
      answers,
      selected,
      endpoint,
      etag,
      conditionalStatus,
      receivedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof PublishedAnswerNotAvailable) throw error;
    throw new PublishedContentUnavailable();
  }
}

/** Render the API's rich text as readable text; React escapes all resulting content. */
export function contentParagraphs(value: string): string[] {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    ndash: "–",
    mdash: "—",
  };
  return value
    .replace(/<\/(?:p|div|li|h[1-6])\s*>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&([a-z]+);/gi, (match, name: string) => entities[name] ?? match)
    .replace(/&#(x[a-f0-9]+|\d+);/gi, (match, number: string) => {
      const point = number.startsWith("x")
        ? Number.parseInt(number.slice(1), 16)
        : Number.parseInt(number, 10);
      return Number.isSafeInteger(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function displayContentDate(value: string): string {
  if (!/^\d{8}T\d{6}Z$/.test(value)) return "Not specified";
  const date = new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`,
  );
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "Not specified";
}
