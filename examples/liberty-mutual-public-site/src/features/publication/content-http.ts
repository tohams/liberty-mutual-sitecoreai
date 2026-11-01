import { digest, identifier, PUBLIC_SITE, PublicationError } from "./content";
import type { LiveContentReader } from "./live-content";
import { liveContent } from "./runtime";

/** Stable, public read model backed exclusively by the approved answers published to Live Edge. */
export async function contentGet(
  request: Request,
  id?: string,
  reader?: LiveContentReader,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.search) throw new PublicationError("UNSUPPORTED_QUERY", 400);
    const selectedId = id ? identifier(id) : undefined;
    const answers = await (reader || liveContent()).readAll();
    const selected = selectedId
      ? answers.find((answer) => answer.id === selectedId)
      : answers;
    if (!selected)
      return Response.json(
        { error: { code: "NOT_FOUND" } },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    const result = {
      schemaVersion: "1.0",
      data: selected,
      meta: {
        site: PUBLIC_SITE,
        language: "en",
        source: "SitecoreAI Experience Edge Live",
        contentRevision: digest(selected),
      },
    };
    const etag = `"${digest(result)}"`;
    const headers = {
      ETag: etag,
      "Cache-Control": "public, max-age=0, s-maxage=15, must-revalidate",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    };
    const matches = request.headers
      .get("if-none-match")
      ?.split(",")
      .map((value) => value.trim().replace(/^W\//, ""));
    if (matches?.includes(etag) || matches?.includes("*"))
      return new Response(null, { status: 304, headers });
    return Response.json(result, { headers });
  } catch (error) {
    const code =
      error instanceof PublicationError ? error.code : "CONTENT_UNAVAILABLE";
    const status =
      error instanceof PublicationError && error.status < 500
        ? error.status
        : 503;
    return Response.json(
      { error: { code } },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          ...(status === 503 ? { "Retry-After": "5" } : {}),
        },
      },
    );
  }
}
