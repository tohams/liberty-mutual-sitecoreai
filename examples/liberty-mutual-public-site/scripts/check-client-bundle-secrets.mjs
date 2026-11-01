#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);

async function inspectDirectory(directory, needles) {
  let filesScanned = 0;
  let exposed = false;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await inspectDirectory(path, needles);
      filesScanned += nested.filesScanned;
      exposed ||= nested.exposed;
    } else if (entry.isFile()) {
      const content = await readFile(path);
      filesScanned++;
      exposed ||= needles.some((needle) => content.includes(needle));
    } else {
      // Unexpected links/devices must not silently make the scan incomplete.
      throw new Error("Unsupported client asset entry");
    }
  }
  return { filesScanned, exposed };
}

async function main() {
  // Match production Next environment precedence, including local builds.
  // The logger and failure messages never receive configuration values or paths.
  require("@next/env").loadEnvConfig(process.cwd(), false, {
    info() {},
    error() {},
  });
  const required = [
    "SITECORE_EDGE_CONTEXT_ID",
    "SITECORE_LIVE_EDGE_CONTEXT_ID",
    "SITECORE_EDITING_SECRET",
  ];
  if (required.some((key) => !process.env[key]?.trim())) {
    console.error(
      "[Public client asset check] Required private configuration is missing; scan cannot be verified.",
    );
    process.exitCode = 1;
    return;
  }
  const privateValues = [
    process.env.SITECORE_EDGE_CONTEXT_ID,
    process.env.SITECORE_LIVE_EDGE_CONTEXT_ID,
    process.env.SITECORE_EDITING_SECRET,
    process.env.SITECORE_SEARCH_PUSH_API_KEY,
    process.env.CRON_SECRET,
    process.env.PUBLICATION_WEBHOOK_SECRET,
    process.env.PUBLICATION_REDIS_REST_TOKEN,
    process.env.KV_REST_API_TOKEN,
  ].filter((value) => typeof value === "string" && value.length > 0);
  const needles = [
    ...new Set(
      privateValues.flatMap((value) => [
        value,
        JSON.stringify(value).slice(1, -1),
        encodeURIComponent(value),
      ]),
    ),
  ].map((value) => Buffer.from(value));
  const result = await inspectDirectory(
    join(process.cwd(), process.env.NEXTJS_DIST_DIR || ".next", "static"),
    needles,
  );
  if (!result.filesScanned) throw new Error("No emitted client assets");
  if (result.exposed) {
    console.error(
      "[Public client asset check] Private configuration was found in browser assets. Build stopped; values and file details are withheld.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `[Public client asset check] Passed: ${result.filesScanned} emitted browser assets checked for configured private values.`,
  );
}

main().catch(() => {
  console.error(
    "[Public client asset check] Browser assets could not be fully checked. Build stopped; error details are withheld.",
  );
  process.exitCode = 1;
});
