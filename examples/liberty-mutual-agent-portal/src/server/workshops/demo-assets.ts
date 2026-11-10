import "server-only";
import { customerDemoChapters } from "@/features/workshops/customer-demo/content";
import { PortalError } from "../errors";
import { readWorkshopAsset } from "./auth-assets";

const demoAssets = new Set(
  customerDemoChapters.flatMap((chapter) =>
    chapter.steps.flatMap((step) =>
      (step.images ?? []).map((image) => image.file),
    ),
  ),
);

/** Only screenshots explicitly included in the anonymous demonstration guides are public. */
export async function readDemoAsset(
  filename: string,
  directory?: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (!demoAssets.has(filename))
    throw new PortalError("NOT_FOUND", "Screenshot not found.", 404);
  return readWorkshopAsset(filename, directory);
}
