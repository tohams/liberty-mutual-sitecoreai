import { NextResponse } from "next/server";
import { getBaseUrl } from "lib/utils";

export const dynamic = "force-dynamic";

/** Technical discovery metadata; authored insurance content stays in the published API. */
export function GET() {
  const base = getBaseUrl();
  return NextResponse.json(
    {
      name: "Liberty Mutual insurance information",
      services: [
        {
          name: "Published insurance guidance",
          category: "Insurance information",
          endpoint: `${base}/api/content/v1/answers`,
          documentation: `${base}/llms.txt`,
        },
      ],
      sitemap: `${base}/sitemap.xml`,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
