/** Grammatical filler is not a subject signal in the native source's keyword candidate selection. */
const GRAMMATICAL_FILLER = new Set([
  "a",
  "an",
  "the",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "he",
  "his",
  "she",
  "her",
  "they",
  "their",
  "it",
  "its",
  "am",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "when",
  "where",
  "why",
  "how",
  "what's",
  "where's",
  "who's",
  "how's",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "from",
  "with",
  "and",
  "or",
  "please",
]);

/** Keep subject words, numbers, negation, and acronyms; the unmodified question stays in the UI and analytics. */
export function normalizeSearchQuestion(question: string): string {
  const words: string[] =
    question.replaceAll("’", "'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ||
    [];
  return words
    .filter((word) => {
      const normalized = word.toLowerCase();
      return /^[A-Z]{2,}$/.test(word) || !GRAMMATICAL_FILLER.has(normalized);
    })
    .join(" ");
}
