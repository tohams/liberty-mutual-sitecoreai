import options from "@/data/resource-taxonomy-options.json";

export type ResourceMetadataField =
  "state" | "businessFamily" | "product" | "channel" | "resourceType";
export const RESOURCE_TAXONOMY_ROOT =
  "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy";
export const RESOURCE_METADATA_FIELD_QUERY = `value jsonValue ... on MultilistField { targetIds targetItems { id name path template { id } } }`;
const OPTION_TEMPLATE = "9dc18d3c9944507aaeab9787c8fc4d9c";
const FOLDERS: Record<ResourceMetadataField, string> = {
  state: "Risk states",
  businessFamily: "Business families",
  product: "Products",
  channel: "Distribution channels",
  resourceType: "Resource types",
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const id = (value: unknown): string =>
  typeof value === "string" &&
  /^(?:\{?[a-f\d]{32}\}?|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(
    value,
  )
    ? value.replace(/[{}-]/g, "").toLowerCase()
    : "";
function fail(): never {
  throw new Error("INVALID_RESOURCE_METADATA");
}
function values(name: ResourceMetadataField, tokens: string[]): string[] {
  const result = [
    ...new Set(
      tokens.flatMap((token) =>
        name === "product" && token === "auto-home"
          ? ["auto", "home"]
          : [token],
      ),
    ),
  ].sort();
  if (
    name === "state" &&
    (result.some((token) => !["All", "FL", "IL", "TX"].includes(token)) ||
      (result.includes("All") && result.length > 1))
  )
    fail();
  return result;
}
function legacy(name: ResourceMetadataField, raw: string): string[] {
  if (!raw.trim()) return [];
  const tokens = raw
    .trim()
    .split(",")
    .map((value) => value.trim());
  if (
    tokens.length > 100 ||
    tokens.some(
      (token) =>
        !token || id(token) || !/^[A-Za-z][A-Za-z0-9’'& -]{0,99}$/.test(token),
    )
  )
    fail();
  return values(name, tokens);
}
function sdkItems(name: ResourceMetadataField, raw: unknown[]): string[] {
  if (raw.length > 100) fail();
  const selected = new Set<string>();
  return values(
    name,
    raw.map((entry) => {
      const item = object(entry),
        identity = id(item.id);
      const choice = options[name].find((option) => id(option.id) === identity);
      if (
        !identity ||
        selected.has(identity) ||
        !choice ||
        item.name !== choice.value
      )
        fail();
      selected.add(identity);
      return choice.value;
    }),
  );
}

/** Decode native Edge references or SDK layout items; retain old Live text during rollout. */
export function resolveResourceMetadataField(
  name: ResourceMetadataField,
  raw: unknown,
): string[] {
  if (Array.isArray(raw)) return sdkItems(name, raw);
  const field = object(raw),
    json = field.jsonValue;
  const text =
    typeof field.value === "string" ? field.value : object(json).value;
  if (
    typeof text === "string" &&
    text.trim() &&
    !text.includes("|") &&
    !id(text)
  )
    return legacy(name, text);
  if ("targetIds" in field || "targetItems" in field) {
    if (
      !Array.isArray(field.targetIds) ||
      !Array.isArray(field.targetItems) ||
      field.targetIds.length !== field.targetItems.length ||
      field.targetIds.length > 100
    )
      fail();
    const expected = new Set(
      (field.targetIds as unknown[]).map((entry) => id(entry)),
    );
    if (expected.has("") || expected.size !== field.targetIds.length) fail();
    if (typeof field.value === "string") {
      const references = field.value.trim()
        ? field.value.split("|").map((entry) => id(entry))
        : [];
      if (
        references.length !== expected.size ||
        references.some((entry) => !expected.has(entry))
      )
        fail();
    }
    const tokens = field.targetItems.map((entry) => {
      const item = object(entry),
        identity = id(item.id),
        token = item.name;
      if (
        !identity ||
        !expected.delete(identity) ||
        typeof token !== "string" ||
        !/^[A-Za-z][A-Za-z0-9’'& -]{0,99}$/.test(token) ||
        item.path !== `${RESOURCE_TAXONOMY_ROOT}/${FOLDERS[name]}/${token}` ||
        id(object(item.template).id) !== OPTION_TEMPLATE
      )
        fail();
      return token as string;
    });
    if (expected.size) fail();
    return values(name, tokens);
  }
  if (Array.isArray(json)) return sdkItems(name, json);
  if (text == null || text === "") return [];
  return fail();
}

export function resourceMetadataLabels(
  name: ResourceMetadataField,
  raw: unknown,
): string[] {
  const field = object(raw);
  const nativeItems = Array.isArray(raw)
    ? raw
    : !("targetIds" in field || "targetItems" in field) &&
        Array.isArray(field.jsonValue)
      ? field.jsonValue
      : null;
  // Resource types are editorial labels, not an access boundary. Render the
  // actual native selection so a new managed type needs no frontend release.
  // State decoding and all authoritative Edge readers retain their strict scope.
  if (name === "resourceType" && nativeItems) {
    if (nativeItems.length > 100) fail();
    const seen = new Set<string>();
    return nativeItems.map((entry) => {
      const item = object(entry),
        identity = id(item.id),
        token = item.name;
      if (
        !identity ||
        seen.has(identity) ||
        typeof token !== "string" ||
        !/^[A-Za-z][A-Za-z0-9’'& -]{0,99}$/.test(token) ||
        (item.path != null &&
          item.path !==
            `${RESOURCE_TAXONOMY_ROOT}/${FOLDERS.resourceType}/${token}`) ||
        (item.template != null &&
          id(object(item.template).id) !== OPTION_TEMPLATE)
      )
        fail();
      seen.add(identity);
      const label =
        typeof item.displayName === "string" && item.displayName.trim()
          ? item.displayName.trim()
          : token;
      if (label.length > 100 || /[\u0000-\u001f\u007f<>]/.test(label)) fail();
      return label;
    });
  }
  return resolveResourceMetadataField(name, raw).map(
    (token) =>
      options[name].find((option) => option.value === token)?.label ?? token,
  );
}
