export const PRODUCT_KEYS = [
  "auto",
  "home",
  "condo",
  "renters",
  "pet",
  "motorcycle",
  "life",
  "small-business",
] as const;
export type ProductKey = (typeof PRODUCT_KEYS)[number];
export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};
export type PublicJourneyContext = {
  products: ProductKey[];
  state: string;
  source: string;
  question: string;
  zip: string;
};

export function productKeys(value: string | null | undefined): ProductKey[] {
  const normalized = (value || "").toLowerCase();
  if (normalized === "small-business") return ["small-business"];
  const parts = normalized.split(/[,\s-]+/);
  const standalone = parts.find(
    (part): part is "pet" | "motorcycle" | "life" =>
      part === "pet" || part === "motorcycle" || part === "life",
  );
  if (standalone) return [standalone];
  const auto = parts.includes("auto") ? ["auto" as const] : [];
  const property = parts.find(
    (part): part is "home" | "renters" | "condo" =>
      part === "home" || part === "renters" || part === "condo",
  );
  return [...auto, ...(property ? [property] : [])];
}
export function productContextKey(products: readonly ProductKey[]): string {
  return products.join("-");
}
export function publicContext(
  parameters: Pick<URLSearchParams, "get">,
): PublicJourneyContext {
  const state = (parameters.get("state") || "").toUpperCase();
  const source = parameters.get("source") || "";
  return {
    products: productKeys(parameters.get("product")),
    state: Object.hasOwn(STATE_NAMES, state) ? state : "",
    source: /^[a-z0-9-]{1,80}$/.test(source) ? source : "",
    zip: /^[0-9]{5}$/.test(parameters.get("zip") || "")
      ? parameters.get("zip")!
      : "",
    question: (parameters.get("question") || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 250),
  };
}

/** Context stays on this website. External quoting and agent systems receive no invented contract. */
export function contextualInternalHref(
  href: string,
  origin: string,
  context: PublicJourneyContext,
): string | null {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || !["https:", "http:"].includes(url.protocol))
      return null;
    const product = productContextKey(context.products);
    for (const [key, value] of Object.entries({
      product,
      state: context.state,
      source: context.source,
      question: context.question,
      zip: context.zip,
    })) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
