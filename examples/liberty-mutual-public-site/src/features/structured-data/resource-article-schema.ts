interface ArticleMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
}

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Describe the visible article; search-only question and answer fields are not inputs. */
export function resourceArticleSchema(
  metadata: ArticleMetadata,
  baseUrl: string,
) {
  const headline = text(metadata.title);
  if (!headline) return null;
  const description = text(metadata.description);
  const authoredCanonical = text(metadata.canonicalUrl);
  let canonical: string | undefined;
  if (authoredCanonical) {
    try {
      const url = new URL(authoredCanonical, baseUrl);
      if (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      )
        canonical = url.href;
    } catch {
      // An invalid optional canonical must not become a misleading schema URL.
    }
  }
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    ...(description ? { description } : {}),
    ...(canonical
      ? {
          url: canonical,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        }
      : {}),
  };
}
