import { createHash } from "node:crypto";

export const ANSWER_ROOT =
  "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Approved answers";
export const ANSWER_TEMPLATE = "1a9400ee-e47b-5992-9431-56ae5586f90d";
export const DISCLOSURE_TEMPLATE = "ba156366-00c4-5c7e-a79a-1c9f8cbce184";
export const PUBLIC_SITE = "liberty-mutual-public-site";

export class PublicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 503,
  ) {
    super(code);
  }
}

export interface PublishedLink {
  href: string;
  text: string;
}
export interface PublishedDisclosure {
  id: string;
  title: string;
  body: string;
  owner: string;
  effectiveDate: string;
  reviewDate: string;
  sourceLink: PublishedLink | null;
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
  nextStep: PublishedLink | null;
  canonicalUrl: string;
  disclosure: PublishedDisclosure | null;
}
export interface NativeField {
  jsonValue?: { value?: unknown } | null;
}
export interface NativeTaxonomyOption {
  id: string;
  name: string;
  path: string;
  template: { id: string };
}
export interface NativeTaxonomyField {
  value?: unknown;
  jsonValue?: unknown;
  targetIds?: string[] | null;
  targetItems?: Array<NativeTaxonomyOption | null> | null;
}

// Checklist fields use the same native Edge reference projection as Multilist.
// Keep jsonValue while old published Single-Line Text versions are still Live.
export const TAXONOMY_FIELD_QUERY = `value jsonValue
  ... on MultilistField { targetIds targetItems { id name path template { id } } }`;
const TAXONOMY_ROOT =
  "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Taxonomy";
const TAXONOMY_OPTION_TEMPLATE = "9dc18d3c-9944-507a-aeab-9787c8fc4d9c";
type TaxonomyKind = "state" | "product" | "audience";
const TAXONOMY_FOLDERS: Record<TaxonomyKind, string> = {
  state: "States",
  product: "Products",
  audience: "Audiences",
};
const LEGACY_PRODUCT_COMBINATIONS: Record<string, readonly string[]> = {
  "auto-home": ["auto", "home"],
  "auto-condo": ["auto", "condo"],
  "auto-renters": ["auto", "renters"],
};

/** Resolve published managed references, never raw GUIDs or display-name guesses. */
export function publishedTaxonomy(
  field: NativeTaxonomyField | undefined,
  kind: TaxonomyKind,
): string {
  const invalid = (): never => {
    throw new PublicationError("INVALID_PUBLISHED_TAXONOMY");
  };
  const missing = (): never => {
    throw new PublicationError("MISSING_PUBLISHED_TAXONOMY");
  };
  const isGuid = (value: string) =>
    /^(?:\{?[a-f\d]{32}\}?|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(
      value,
    );
  const isLegacy = (value: string) =>
    value.length <= 500 &&
    /^[A-Za-z][A-Za-z0-9 -]*(?:,[A-Za-z][A-Za-z0-9 -]*)*$/.test(value) &&
    !value.split(",").some((token) => isGuid(token.trim()));
  // A changed field definition can reach Edge before an old published item is
  // republished. Its raw value still carries the valid legacy taxonomy tokens,
  // although the current Checklist projection has no resolvable target items.
  if (typeof field?.value === "string" && isLegacy(field.value.trim()))
    return field.value.trim();
  if (field?.value != null && typeof field.value !== "string") return invalid();
  if (field && ("targetIds" in field || "targetItems" in field)) {
    const ids = field.targetIds;
    const items = field.targetItems;
    if (!Array.isArray(ids) || !Array.isArray(items) || ids.length > 100)
      return invalid();
    if (ids.length !== items.length) return missing();
    const normalizedIds = ids.map((id) => identifier(id));
    if (new Set(normalizedIds).size !== ids.length) return invalid();
    if (typeof field.value === "string") {
      const raw = field.value.trim();
      const rawIds = raw ? raw.split("|").map((id) => identifier(id)) : [];
      if (
        rawIds.length !== normalizedIds.length ||
        new Set(rawIds).size !== rawIds.length ||
        rawIds.some((id) => !normalizedIds.includes(id))
      )
        return invalid();
    }
    const remaining = new Set(normalizedIds);
    const folder = `${TAXONOMY_ROOT}/${TAXONOMY_FOLDERS[kind]}`;
    const tokens: string[] = [];
    for (const item of items) {
      if (!item) return missing();
      const id = identifier(item.id);
      if (!remaining.delete(id)) return invalid();
      if (
        identifier(item.template?.id) !== TAXONOMY_OPTION_TEMPLATE ||
        typeof item.name !== "string" ||
        !/^[A-Za-z][A-Za-z0-9-]{0,99}$/.test(item.name) ||
        item.path?.toLowerCase() !== `${folder}/${item.name}`.toLowerCase()
      )
        return invalid();
      tokens.push(
        ...(kind === "product" && LEGACY_PRODUCT_COMBINATIONS[item.name]
          ? LEGACY_PRODUCT_COMBINATIONS[item.name]
          : [item.name]),
      );
    }
    if (remaining.size) return missing();
    const distinct = [...new Set(tokens)].sort();
    if (
      (kind === "state" || kind === "product") &&
      distinct.length > 1 &&
      distinct.some((token) => token.toLowerCase() === "all")
    )
      return invalid();
    if (
      kind === "audience" &&
      distinct.includes("consumer") &&
      distinct.some((token) =>
        ["customer", "prospective-customer"].includes(token),
      )
    )
      return invalid();
    return distinct.join(",");
  }
  const json = field?.jsonValue;
  if (typeof field?.value === "string" && field.value.trim()) return invalid();
  if (json == null) return "";
  if (typeof json !== "object" || Array.isArray(json) || !("value" in json))
    return invalid();
  const value = json.value;
  if (value == null || value === "") return "";
  // Legacy published text stays byte-for-byte compatible apart from the existing
  // outer trim. Reject unresolved IDs or mixed reference/text values explicitly.
  if (typeof value !== "string" || !isLegacy(value.trim())) return invalid();
  return value.trim();
}
export interface NativeAnswer {
  id: string;
  path: string;
  version: number;
  template: { id: string };
  question?: NativeField;
  answer?: NativeField;
  formalWording?: NativeField;
  explanation?: NativeField;
  owner?: NativeField;
  effectiveDate?: NativeField;
  reviewDate?: NativeField;
  state?: NativeTaxonomyField;
  product?: NativeTaxonomyField;
  audience?: NativeTaxonomyField;
  sourceLink?: NativeField;
  nextStep?: NativeField;
  canonicalUrl?: NativeField;
  disclosure?: {
    targetId?: string | null;
    targetItem?: NativeDisclosure | null;
  } | null;
}
export interface NativeDisclosure {
  id: string;
  path: string;
  template: { id: string };
  title?: NativeField;
  body?: NativeField;
  owner?: NativeField;
  effectiveDate?: NativeField;
  reviewDate?: NativeField;
  sourceLink?: NativeField;
}

export function identifier(value: unknown): string {
  if (typeof value !== "string") throw new PublicationError("INVALID_ID", 400);
  const raw = value
    .replace(/^\{(.*)\}$/, "$1")
    .replaceAll("-", "")
    .toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(raw))
    throw new PublicationError("INVALID_ID", 400);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function text(field?: NativeField, maximum = 50000): string {
  const value = field?.jsonValue?.value;
  if (value == null) return "";
  if (typeof value !== "string" || value.length > maximum)
    throw new PublicationError("INVALID_PUBLISHED_CONTENT");
  return value.trim();
}

function date(field?: NativeField): string {
  const value = text(field, 30);
  // Layout/Edge represents an empty native Date field with .NET's minimum date.
  // Preserve absence rather than presenting that sentinel as an authored date.
  if (
    !value ||
    value === "0001-01-01T00:00:00Z" ||
    value === "00010101T000000Z"
  )
    return "";
  const compact = /^\d{8}T\d{6}Z$/.test(value)
    ? value
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
      ? value.replaceAll("-", "").replaceAll(":", "")
      : "";
  if (!compact) throw new PublicationError("INVALID_PUBLISHED_DATE");
  const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(9, 11)}:${compact.slice(11, 13)}:${compact.slice(13, 15)}Z`;
  const parsed = new Date(iso);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().replace(".000Z", "Z") !== iso
  )
    throw new PublicationError("INVALID_PUBLISHED_DATE");
  return compact;
}

function link(field?: NativeField): PublishedLink | null {
  const value = field?.jsonValue?.value;
  if (value == null || value === "") return null;
  if (typeof value !== "object" || Array.isArray(value))
    throw new PublicationError("INVALID_PUBLISHED_LINK");
  const href =
    "href" in value && typeof value.href === "string" ? value.href.trim() : "";
  if (!href) return null;
  if (!/^\/(?!\/)/.test(href)) {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      throw new PublicationError("INVALID_PUBLISHED_LINK");
    }
    if (url.protocol !== "https:" || url.username || url.password)
      throw new PublicationError("INVALID_PUBLISHED_LINK");
  }
  if (/[\u0000-\u0020\\]/.test(href))
    throw new PublicationError("INVALID_PUBLISHED_LINK");
  return {
    href,
    text: "text" in value && typeof value.text === "string" ? value.text : "",
  };
}

function canonical(
  field: NativeField | undefined,
  publicOrigin: string,
): string {
  const value = text(field, 2000);
  if (!value || /[\u0000-\u0020\\]/.test(value))
    throw new PublicationError("INVALID_CANONICAL_URL");
  let url: URL;
  try {
    url = new URL(value, publicOrigin);
  } catch {
    throw new PublicationError("INVALID_CANONICAL_URL");
  }
  if (
    url.origin !== publicOrigin ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !/^\/insurance-resources\/[^/]+\/?$/.test(url.pathname)
  )
    throw new PublicationError("INVALID_CANONICAL_URL");
  return url.href;
}

function disclosure(
  item?: NativeDisclosure | null,
): PublishedDisclosure | null {
  if (!item) return null;
  if (
    identifier(item.template.id) !== DISCLOSURE_TEMPLATE ||
    !item.path
      .toLowerCase()
      .startsWith(
        "/sitecore/content/libertymutual/liberty-mutual-public-site/data/disclosures/",
      )
  )
    throw new PublicationError("OUT_OF_SCOPE_DISCLOSURE");
  return {
    id: identifier(item.id),
    title: text(item.title),
    body: text(item.body),
    owner: text(item.owner),
    effectiveDate: date(item.effectiveDate),
    reviewDate: date(item.reviewDate),
    sourceLink: link(item.sourceLink),
  };
}

export function mapPublishedAnswer(
  item: NativeAnswer,
  publicOrigin: string,
): PublishedAnswer {
  if (
    identifier(item.template.id) !== ANSWER_TEMPLATE ||
    !item.path.toLowerCase().startsWith(`${ANSWER_ROOT.toLowerCase()}/`) ||
    item.path.slice(ANSWER_ROOT.length + 1).includes("/")
  )
    throw new PublicationError("OUT_OF_SCOPE_CONTENT");
  const question = text(item.question);
  const answer = text(item.answer);
  const disclosureId = item.disclosure?.targetId;
  if (
    disclosureId &&
    identifier(disclosureId) !== "00000000-0000-0000-0000-000000000000" &&
    (!item.disclosure?.targetItem ||
      identifier(disclosureId) !== identifier(item.disclosure.targetItem.id))
  )
    throw new PublicationError("MISSING_PUBLISHED_DISCLOSURE");
  if (
    !question ||
    !answer ||
    !Number.isSafeInteger(item.version) ||
    item.version < 1
  )
    throw new PublicationError("INCOMPLETE_PUBLISHED_CONTENT");
  const published = {
    id: identifier(item.id),
    language: "en" as const,
    version: item.version,
    question,
    answer,
    formalWording: text(item.formalWording),
    explanation: text(item.explanation),
    owner: text(item.owner),
    effectiveDate: date(item.effectiveDate),
    reviewDate: date(item.reviewDate),
    state: publishedTaxonomy(item.state, "state"),
    product: publishedTaxonomy(item.product, "product"),
    audience: publishedTaxonomy(item.audience, "audience"),
    sourceLink: link(item.sourceLink),
    nextStep: link(item.nextStep),
    canonicalUrl: canonical(item.canonicalUrl, publicOrigin),
    disclosure: disclosure(item.disclosure?.targetItem),
  };
  // Edge deliberately excludes CMS Standard Fields such as __Revision. Fingerprint the
  // actual delivered payload instead of claiming a CM revision has been observed.
  return {
    ...published,
    revision: digest(published),
    revisionKind: "published-content-sha256",
  };
}

export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export interface SearchOperation {
  action: "upsert" | "delete";
  id: string;
  locale: "en";
  sc_url?: string;
  fields?: Record<string, string>;
}
export function searchDocument(answer: PublishedAnswer): SearchOperation {
  return {
    action: "upsert",
    id: answer.id,
    locale: "en",
    sc_url: answer.canonicalUrl,
    fields: {
      title: answer.question,
      question: answer.question,
      summary: answer.answer,
      body: [
        answer.answer,
        answer.formalWording,
        answer.explanation,
        answer.disclosure?.body,
      ]
        .filter(Boolean)
        .join("\n"),
      // Native Search's configured technical keys are lowercase. The public
      // content API retains its independently versioned camel-case contract.
      canonicalurl: answer.canonicalUrl,
      sourceurl: answer.sourceLink?.href || "",
      nextstepurl: answer.nextStep?.href || "",
      revision: answer.revision,
      owner: answer.owner,
      effectivedate: answer.effectiveDate,
      reviewdate: answer.reviewDate,
      state: answer.state,
      product: answer.product,
      audience: answer.audience,
    },
  };
}
