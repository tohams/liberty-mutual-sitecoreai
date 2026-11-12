interface FaqItem {
  id: string;
  fields: {
    question?: { value?: string };
    answer?: { value?: string };
  };
}

interface PageMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  language?: string;
}

/** The same native identity links a Search result to its visible FAQ. */
export function faqAnchor(id: string): string | undefined {
  const compact = id.replace(/[{}-]/g, "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(compact)) return undefined;
  return `faq-${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function canonicalUrl(value: string | undefined, baseUrl: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value, baseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined;
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

/** Describe only questions and answers supplied to the visible FAQ component. */
export function faqPageSchema(
  metadata: PageMetadata,
  items: readonly FaqItem[],
  baseUrl: string,
) {
  const canonical = canonicalUrl(metadata.canonicalUrl, baseUrl);
  const questions = items.flatMap((item) => {
    const question = item.fields.question?.value?.trim();
    const answer = item.fields.answer?.value?.trim();
    if (!question || !answer || !answer.replace(/<[^>]*>/g, "").trim())
      return [];
    const anchor = faqAnchor(item.id);
    const url = canonical && anchor ? `${canonical}#${anchor}` : undefined;
    return [
      {
        "@type": "Question",
        ...(url ? { "@id": url, url } : {}),
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      },
    ];
  });
  if (!questions.length) return null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        ...(canonical ? { "@id": `${canonical}#webpage`, url: canonical } : {}),
        ...(metadata.title ? { name: metadata.title } : {}),
        ...(metadata.description ? { description: metadata.description } : {}),
        ...(metadata.language ? { inLanguage: metadata.language } : {}),
      },
      {
        "@type": "FAQPage",
        ...(canonical
          ? { url: canonical, isPartOf: { "@id": `${canonical}#webpage` } }
          : {}),
        mainEntity: questions,
      },
    ],
  };
}
