import { contentGet } from "@/features/publication/content-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return contentGet(request);
}
