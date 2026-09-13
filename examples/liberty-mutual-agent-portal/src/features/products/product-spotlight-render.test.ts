import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { join } from "node:path";

test("product spotlight preserves native composition, fallback and risk-state boundaries", async () => {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    SITECORE_EDGE_CONTEXT_ID: "spotlight-render-test",
    SITECORE_EDGE_CLIENT_CONTEXT_ID: "spotlight-render-test",
    NEXT_PUBLIC_PORTAL_TRACKING_ENABLED: "false",
  };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      join(
        process.cwd(),
        "src/features/products/product-spotlight-render.fixture.ts",
      ),
    ],
    { env: environment, timeout: 15000 },
  );
  assert.match(stdout, /pass 4/);
});
