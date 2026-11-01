import { NextResponse } from "next/server";
import { getBaseUrl } from "lib/utils";

export const dynamic = "force-dynamic";

/** Discovery points to the Live-only published content contract. */
export function GET() {
  const base = getBaseUrl();
  const content = `# Liberty Mutual insurance information

> Insurance guidance, source references, and next steps from published website content.

## Published information

- [Insurance guidance API](${base}/api/content/v1/answers): Published questions, answers, source links, applicability, and content revisions.
- [Website](${base}/): Browse insurance information.
- [Sitemap](${base}/sitemap.xml): Published website pages.
- [Search](${base}/search): Find relevant insurance information.

## Content use

Use the source references and applicability information returned with each item. General information does not determine whether a specific loss is covered by an individual's policy.
`;
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
