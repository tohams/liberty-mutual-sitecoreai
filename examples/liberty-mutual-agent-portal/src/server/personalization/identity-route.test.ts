import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

test("identity route verifies portal access independently of CMS resource content", async () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--experimental-test-module-mocks",
      "--test",
      "--test-reporter=tap",
      join(
        process.cwd(),
        "src/server/personalization/identity-route.fixture.ts",
      ),
    ],
    { env: environment, timeout: 15000 },
  );
  assert.match(stdout, /pass 4/);
});
