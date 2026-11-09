import {
  publicationGet,
  publicationPost,
} from "@/features/resource-publication/publication-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  return publicationPost(request);
}

export async function GET(request: Request) {
  return publicationGet(request);
}
