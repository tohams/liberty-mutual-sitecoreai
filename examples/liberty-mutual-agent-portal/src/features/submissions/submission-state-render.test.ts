import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { join } from "node:path";

test("submission form renders saved and invalid risk states without silently replacing them", async () => {
  const environment = { ...process.env };
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
        "src/features/submissions/submission-state-render.fixture.ts",
      ),
    ],
    { env: environment, timeout: 15000 },
  );
  assert.match(stdout, /pass 4/);
});
