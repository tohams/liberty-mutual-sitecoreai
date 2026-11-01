import { normalizeSearchQuestion } from "./normalize-search-question";

// These words express the request rather than its subject. Generic insurance
// vocabulary alone must not make an unsupported subject appear relevant.
const REQUEST_WORDS = new Set([
  "about",
  "also",
  "any",
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
  "need",
  "particular",
  "policy",
  "policies",
  "review",
  "show",
  "some",
  "specific",
  "tell",
  "that",
  "these",
  "this",
  "those",
  "through",
  "under",
  "understand",
  "want",
  "work",
  "works",
]);

const WORD_FORMS: Record<string, string> = {
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
};

function words(value: string): string[] {
  return (
    normalizeSearchQuestion(value.replace(/<[^>]*>/g, " "))
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  ).map((word) => WORD_FORMS[word] || word);
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
 * Native Search still retrieves and ranks every candidate. Question mode adds
 * a deliberately conservative evidence check: every substantive question term
 * must occur in the candidate's authored text or structured applicability.
 * This is a lexical support check, not a machine-learning confidence score or
 * a coverage decision. New authored guidance is supported without a code edit.
 */
export function supportedQuestionResults<T>(
  query: string,
  candidates: readonly T[],
  content: (candidate: T) => string,
): T[] {
  if (!isQuestion(query)) return [...candidates];
  const subjects = [
    ...new Set(words(query).filter((word) => !REQUEST_WORDS.has(word))),
  ];
  if (!subjects.length) return [...candidates];
  return candidates.filter((candidate) => {
    const evidence = words(content(candidate));
    return subjects.every((subject) =>
      evidence.some((word) => sameWord(subject, word)),
    );
  });
}
