import { errorResponse, privateHeaders } from "@/server/http";
import { readDemoAsset } from "@/server/workshops/demo-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await context.params;
    const asset = await readDemoAsset(filename);
    return new Response(asset.bytes as BodyInit, {
      headers: {
        ...privateHeaders,
        "Content-Type": asset.contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
