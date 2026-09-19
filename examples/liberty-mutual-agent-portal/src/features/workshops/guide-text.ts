export type GuideEmphasisPart = { kind: "text" | "strong"; text: string };
export type GuideTextPart =
  | GuideEmphasisPart
  | { kind: "link"; href: string; children: GuideEmphasisPart[] };

function emphasisParts(text: string): GuideEmphasisPart[] {
  return text.split(/\*\*([^*\r\n]+)\*\*/g).map((part, index) => ({
    kind: index % 2 ? "strong" : "text",
    text: part,
  }));
}

/** Content links may open a workshop route, an HTTPS tool, or the local editing host. */
export function isGuideHref(href: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) return false;
  if (/^\/(?!\/)/.test(href) || /^#[\w-]+$/.test(href)) return true;
  try {
    const url = new URL(href);
    return (
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && url.hostname === "localhost"))
    );
  } catch {
    return false;
  }
}

/** Only explicit emphasis and inline links are supported; HTML is always plain text. */
export function guideTextParts(text: string): GuideTextPart[] {
  const parts: GuideTextPart[] = [];
  const links = /\[([^\[\]\r\n]+)\]\(([^\s()]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(links)) {
    if (!isGuideHref(match[2])) continue;
    parts.push(...emphasisParts(text.slice(cursor, match.index)));
    parts.push({
      kind: "link",
      href: match[2],
      children: emphasisParts(match[1]),
    });
    cursor = match.index + match[0].length;
  }
  parts.push(...emphasisParts(text.slice(cursor)));
  return parts;
}

/** Search and content checks use visible labels, without formatting or URL targets. */
export function plainGuideText(text: string): string {
  return guideTextParts(text)
    .map((part) =>
      part.kind === "link"
        ? part.children.map((child) => child.text).join("")
        : part.text,
    )
    .join("");
}
