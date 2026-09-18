import "server-only";
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PortalError } from "../errors";

const ASSET_NAME = /^[a-z0-9][a-z0-9-]{0,79}\.(png|webp)$/;

/** Assets live outside public and can only be read after the route authenticates access. */
export async function readWorkshopAsset(
  name: string,
  directory = join(process.cwd(), "workshop-assets"),
): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (!ASSET_NAME.test(name))
    throw new PortalError("NOT_FOUND", "Screenshot not found.", 404);
  try {
    const file = join(directory, name);
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink())
      throw new PortalError("NOT_FOUND", "Screenshot not found.", 404);
    const bytes = await readFile(file);
    return {
      bytes: new Uint8Array(bytes),
      contentType: name.endsWith(".webp") ? "image/webp" : "image/png",
    };
  } catch (error) {
    if (error instanceof PortalError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new PortalError("NOT_FOUND", "Screenshot not found.", 404);
    }
    throw error;
  }
}
