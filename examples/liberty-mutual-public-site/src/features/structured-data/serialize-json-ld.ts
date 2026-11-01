/** Keep authored JSON-LD values inside the inert script element's HTML boundary. */
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
