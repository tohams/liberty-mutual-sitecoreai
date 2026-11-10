import { NextResponse } from "next/server";

/** Both entry URLs use the unlinked presenter guide service. */
export function GET() {
  return NextResponse.redirect(
    "https://liberty-mutual-agent-portal.vercel.app/demo/public",
    {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
