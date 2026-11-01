import { NextResponse } from "next/server";
import { getBaseUrl } from "lib/utils";

export function GET() {
  const base = getBaseUrl();
  return new NextResponse(
    `# Liberty Mutual published content endpoints

Content-API: ${base}/api/content/v1/answers
Discovery: ${base}/llms.txt
Sitemap: ${base}/sitemap.xml

Only published public content is available through the content API. Source references, product and state applicability, and content revisions accompany the published answers.
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
