/** The guide supports only explicit **strong emphasis**; URLs and commands remain separate. */
export function guideTextParts(text: string): string[] {
  return text.split(/\*\*([^*\r\n]+)\*\*/g);
}

/** Search and content checks use the reader-visible wording, without emphasis markers. */
export function plainGuideText(text: string): string {
  return guideTextParts(text).join("");
}
