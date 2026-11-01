import {
  publicationGet,
  publicationPost,
} from "@/features/publication/publication-http";
import { revalidatePublicDelivery } from "@/features/publication/delivery-revalidation";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request) {
  return publicationPost(request, process.env, undefined, () =>
    revalidatePublicDelivery({ path: revalidatePath, tag: revalidateTag }),
  );
}
export async function GET(request: Request) {
  return publicationGet(request);
}
