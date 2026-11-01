import { contentGet } from "@/features/publication/content-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return contentGet(request, (await params).id);
}
