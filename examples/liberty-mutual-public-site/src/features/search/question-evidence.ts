import { normalizeSearchQuestion } from "./normalize-search-question";

// These words express the request rather than its subject. Generic insurance
// vocabulary alone must not make an unsupported subject appear relevant.
const REQUEST_WORDS = new Set([
  "about",
  "also",
  "any",
  "available",
  "anything",
  "as",
  "be",
  "been",
  "being",
  "confirm",
  "find",
  "get",
  "give",
  "help",
  "information",
  "insurance",
  "know",
  "learn",
  "more",
  "much",
  "many",
  "need",
  "particular",
  "policy",
  "policies",
  "review",
  "show",
  "sell",
  "offer",
  "some",
  "specific",
  "tell",
  "that",
  "these",
  "this",
  "there",
  "those",
  "through",
  "under",
  "understand",
  "want",
  "work",
  "works",
  "would",
]);

const WORD_FORMS: Record<string, string> = {
  // Correct common spellings of the generic word without weakening checks
  // for the actual product, state, or unfamiliar subject being requested.
  insurence: "insurance",
  insurnace: "insurance",
  insurnce: "insurance",
  insuranse: "insurance",
  car: "auto",
  cars: "auto",
  automobile: "auto",
  automobiles: "auto",
  vehicle: "auto",
  vehicles: "auto",
  house: "home",
  houses: "home",
  homeowner: "home",
  homeowners: "home",
  combine: "bundle",
  combines: "bundle",
  combined: "bundle",
  combining: "bundle",
  bundle: "bundle",
  bundles: "bundle",
  bundled: "bundle",
  bundling: "bundle",
  cover: "cover",
  covered: "cover",
  covers: "cover",
  coverage: "cover",
  coverages: "cover",
  protect: "protect",
  protects: "protect",
  protected: "protect",
  protecting: "protect",
  protection: "protect",
  save: "save",
  saves: "save",
  saved: "save",
  saving: "save",
  savings: "save",
  discount: "save",
  discounts: "save",
  discounted: "save",
  cheap: "save",
  cheaper: "save",
  cheapest: "save",
  affordable: "save",
  affordability: "save",
  lower: "save",
  lowers: "save",
  lowered: "save",
  lowering: "save",
  reduce: "save",
  reduces: "save",
  reduced: "save",
  reducing: "save",
  reduction: "save",
  money: "cost",
  cost: "cost",
  costs: "cost",
  price: "cost",
  prices: "cost",
  pricing: "cost",
  premium: "cost",
  premiums: "cost",
  rate: "cost",
  rates: "cost",
  cancel: "cancel",
  cancels: "cancel",
  canceled: "cancel",
  cancelled: "cancel",
  canceling: "cancel",
  cancelling: "cancel",
  cancellation: "cancel",
  file: "file",
  files: "file",
  filed: "file",
  filing: "file",
  damage: "damage",
  damages: "damage",
  damaged: "damage",
  damaging: "damage",
};

function words(value: string): string[] {
  return (
    normalizeSearchQuestion(
      value
        .replace(/<[^>]*>/g, " ")
        .replace(/\bmulti[\s-]*policy\b/gi, "multi policy"),
    )
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  ).map((word) => WORD_FORMS[word] || word);
}

const STATES: Readonly<Record<string, string>> = {
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
// Lowercase prose such as "or", "in", and "me" is not a state selection.
const AMBIGUOUS_CODES = new Set(["HI", "ID", "IN", "ME", "OK", "OR"]);

function requestedStates(query: string): {
  states: Set<string>;
  topic: string;
} {
  const states = new Set<string>();
  let topic = query;
  for (const [code, name] of Object.entries(STATES).sort(
    ([, a], [, b]) => b.length - a.length,
  )) {
    topic = topic.replace(
      new RegExp(`\\b${name.replaceAll(" ", "\\s+")}\\b`, "gi"),
      () => {
        states.add(code);
        return " ";
      },
    );
  }
  topic = topic.replace(/\b[A-Za-z]{2}\b/g, (word) => {
    const code = word.toUpperCase();
    if (!(code in STATES) || (AMBIGUOUS_CODES.has(code) && word !== code))
      return word;
    states.add(code);
    return " ";
  });
  return { states, topic };
}

function applicableStates(value: string | readonly string[]): Set<string> {
  const values = typeof value === "string" ? value.split(/[,|;]/) : value;
  return new Set(
    values.flatMap((entry) => {
      const name = entry.trim();
      if (/^all(?: states)?$/i.test(name)) return ["All"];
      const code = name.toUpperCase();
      if (code in STATES) return [code];
      const match = Object.entries(STATES).find(
        ([, state]) => state.toLowerCase() === name.toLowerCase(),
      );
      return match ? [match[0]] : [];
    }),
  );
}

function sameWord(query: string, evidence: string): boolean {
  if (query === evidence) return true;
  // Tolerate ordinary inflections, without treating short partial words (for
  // example, "pet" and "petroleum") as evidence of the same subject.
  const stem = (word: string) =>
    word.length > 5 ? word.replace(/(?:ing|ed|es|s)$/, "") : word;
  return stem(query) === stem(evidence);
}

export function isQuestion(query: string): boolean {
  return (
    query.includes("?") ||
    /^(?:can|could|do|does|how|is|are|should|what|when|where|which|why|will|would)\b/i.test(
      query.trim(),
    )
  );
}

/**
 * Native Search still retrieves and ranks every candidate. Every typed query
 * receives the same evidence check: every substantive topic term
 * must occur in the candidate's authored text or structured applicability.
 * This is a lexical support check, not a machine-learning confidence score or
 * a coverage decision. New authored guidance is supported without a code edit.
 * When supplied, the state selector uses published applicability metadata;
 * incidental state names in body copy never confer eligibility.
 */
export function supportedQuestionResults<T>(
  query: string,
  candidates: readonly T[],
  content: (candidate: T) => string,
  state?: (candidate: T) => string | readonly string[],
): T[] {
  const requested = state ? requestedStates(query) : null;
  const subjects = [
    ...new Set(
      words(requested?.topic ?? query).filter(
        (word) => !REQUEST_WORDS.has(word),
      ),
    ),
  ];
  return candidates.filter((candidate) => {
    if (state && requested?.states.size) {
      const applies = applicableStates(state(candidate));
      if (
        !applies.has("All") &&
        ![...requested.states].some((code) => applies.has(code))
      )
        return false;
    }
    const evidence = words(content(candidate));
    return subjects.every((subject) =>
      evidence.some((word) => sameWord(subject, word)),
    );
  });
}
