import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { GET } from "@/app/api/demo/assets/[filename]/route";
import { customerDemoChapters } from "@/features/workshops/customer-demo/content";
import { workshopGuides } from "@/features/workshops/content";
import { guideStepImages } from "@/features/workshops/guide-images";
import { PortalError } from "../errors";
import { readDemoAsset } from "./demo-assets";

const demoFiles = new Set(
  customerDemoChapters.flatMap((chapter) =>
    chapter.steps.flatMap((step) =>
      (step.images ?? []).map((image) => image.file),
    ),
  ),
);
const firstDemoFile = [...demoFiles][0];
const workshopOnlyFile = workshopGuides
  .flatMap((guide) => guide.steps.flatMap(guideStepImages))
  .map((image) => image.file)
  .find((filename) => !demoFiles.has(filename));

test("anonymous screenshots include every current demo image and no other workshop image", async () => {
  assert(demoFiles.size > 0);
  for (const filename of demoFiles) {
    const result = await readDemoAsset(filename);
    assert(result.bytes.byteLength > 0, filename);
    assert.match(result.contentType, /^image\/(?:png|webp)$/);
  }
  assert(
    workshopOnlyFile,
    "A non-demo workshop screenshot exercises the boundary.",
  );
  await assert.rejects(
    readDemoAsset(workshopOnlyFile),
    (error: unknown) => error instanceof PortalError && error.status === 404,
  );
});

test("anonymous asset requests need no cookie and retain no-store, noindex, and same-origin headers", async () => {
  const response = await GET(
    new Request(`https://portal.example/api/demo/assets/${firstDemoFile}`),
    { params: Promise.resolve({ filename: firstDemoFile }) },
  );
  assert.equal(response.status, 200);
  assert((await response.arrayBuffer()).byteLength > 0);
  assert.match(
    response.headers.get("Cache-Control") ?? "",
    /private, no-store/,
  );
  assert.match(response.headers.get("X-Robots-Tag") ?? "", /noindex/);
  assert.equal(
    response.headers.get("Cross-Origin-Resource-Policy"),
    "same-origin",
  );
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.has("Set-Cookie"), false);
});

test("the anonymous route rejects workshop-only files, traversal, encoded paths, and unknown assets", async () => {
  assert(workshopOnlyFile);
  for (const filename of [
    workshopOnlyFile,
    "../" + firstDemoFile,
    "%2e%2e%2f" + firstDemoFile,
    "/" + firstDemoFile,
    firstDemoFile + "?public=1",
    "fixtures/portal-logins.json",
    "missing-demo-screenshot.png",
  ]) {
    const response = await GET(
      new Request("https://portal.example/api/demo/assets/unknown.png"),
      { params: Promise.resolve({ filename }) },
    );
    assert.equal(response.status, 404, filename);
    assert.match(
      response.headers.get("Cache-Control") ?? "",
      /private, no-store/,
    );
    assert.match(response.headers.get("X-Robots-Tag") ?? "", /noindex/);
    assert.deepEqual(await response.json(), {
      error: { code: "NOT_FOUND", message: "Screenshot not found." },
    });
  }
});

test("allowlisting cannot bypass the existing file and symbolic-link checks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "demo-assets-"));
  try {
    await writeFile(join(directory, "private.png"), new Uint8Array([1, 2, 3]));
    await symlink(
      join(directory, "private.png"),
      join(directory, firstDemoFile),
    );
    await assert.rejects(
      readDemoAsset(firstDemoFile, directory),
      (error: unknown) => error instanceof PortalError && error.status === 404,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
