import assert from "node:assert/strict";
import test from "node:test";
import {
  recordAudiencePreviewStage,
  observeAudiencePreviewStage,
} from "./telemetry";

test("preparation telemetry includes only safe enums, known codes, and numeric HTTP status", async (t) => {
  const entries: unknown[][] = [];
  t.mock.method(console, "info", (...args: unknown[]) => entries.push(args));
  recordAudiencePreviewStage("identity-event", "unconfirmed", { status: 503 });
  recordAudiencePreviewStage("profile-preparation", "failed", {
    code: "PROFILE_LINK_TIMEOUT",
    status: "private-response-body",
  });
  recordAudiencePreviewStage("request", "failed", {
    code: "person@example.test/token-value",
    status: Number.NaN,
    reason: "private-native-body",
  });
  recordAudiencePreviewStage("request", "failed", {
    code: "SITECORE_UNAVAILABLE",
  });
  const cause = Object.assign(
    new Error("secret exception with native response"),
    {
      code: "IMPORT_UPLOAD_UNCONFIRMED",
      token: "never-log-me",
    },
  );
  await assert.rejects(
    observeAudiencePreviewStage("profile-import", async () => {
      throw cause;
    }),
    (error: unknown) => error === cause,
  );
  assert.deepEqual(
    entries.map((entry) => JSON.parse(String(entry[1]))),
    [
      { stage: "identity-event", outcome: "unconfirmed", status: 503 },
      {
        stage: "profile-preparation",
        outcome: "failed",
        code: "PROFILE_LINK_TIMEOUT",
      },
      { stage: "request", outcome: "failed", code: "PREVIEW_UNAVAILABLE" },
      { stage: "request", outcome: "failed", code: "SITECORE_UNAVAILABLE" },
      { stage: "profile-import", outcome: "started" },
      {
        stage: "profile-import",
        outcome: "failed",
        code: "IMPORT_UPLOAD_UNCONFIRMED",
      },
    ],
  );
  const serialized = JSON.stringify(entries);
  for (const hidden of [
    "person@",
    "token-value",
    "private-response-body",
    "private-native-body",
    "secret exception",
    "never-log-me",
  ])
    assert.equal(serialized.includes(hidden), false);
});
