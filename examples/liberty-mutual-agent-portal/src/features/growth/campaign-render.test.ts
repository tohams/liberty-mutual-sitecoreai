import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { join } from "node:path";

test("campaign rendering keeps native composition, editing and licensed-state boundaries", async () => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SITECORE_EDGE_CONTEXT_ID: "campaign-render-test",
    NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: "campaign-client-test",
    NEXT_PUBLIC_PORTAL_TRACKING_ENABLED: "false",
  };
  delete env.NODE_OPTIONS;
  delete env.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      join(process.cwd(), "src/features/growth/campaign-render.fixture.ts"),
    ],
    { env, timeout: 20000 },
  );
  assert.match(stdout, /pass 5/);
});
