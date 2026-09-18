#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

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
      throw new Error('Unsupported client asset entry');
    }
  }
  return { filesScanned, exposed };
}

async function main() {
  // Match production Next environment precedence, including local builds.
  // The logger and failure messages never receive configuration values or paths.
  require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const privateContext = process.env.SITECORE_EDGE_CONTEXT_ID;
  if (!privateContext?.trim()) {
    console.error('[Portal client asset check] Missing private context configuration; scan cannot be verified.');
    process.exitCode = 1;
    return;
  }
  const privateValues = [
    privateContext,
    process.env.SITECORE_EDITING_SECRET,
    process.env.SITECORE_PROFILE_IMPORT_API_KEY,
    process.env.PORTAL_OPERATOR_SECRET,
    process.env.PORTAL_SESSION_SECRET,
  ].filter(Boolean);
  const needles = [...new Set(privateValues.flatMap((value) => [
    value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value),
  ]))].map((value) => Buffer.from(value));
  const result = await inspectDirectory(join(process.cwd(), '.next', 'static'), needles);
  if (!result.filesScanned) throw new Error('No emitted client assets');
  if (result.exposed) {
    console.error('[Portal client asset check] Private configuration was found in browser assets. Build stopped; values and file details are withheld.');
    process.exitCode = 1;
    return;
  }
  console.log(`[Portal client asset check] Passed: ${result.filesScanned} emitted browser assets checked for configured private values.`);
}

main().catch(() => {
  console.error('[Portal client asset check] Browser assets could not be fully checked. Build stopped; error details are withheld.');
  process.exitCode = 1;
});
