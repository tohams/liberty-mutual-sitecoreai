import assert from "node:assert/strict";
import test from "node:test";
import {
  observePersonalizationPreviewStage,
  PersonalizationPreviewServerTimings,
  type PersonalizationPreviewTimingStage,
} from "./timing";

test("Server-Timing includes only named numeric stages and total, with no identifiers or payload values", async () => {
  let now = 10;
  const timings = new PersonalizationPreviewServerTimings(() => now);
  const value = await timings.measure("auth", async () => {
    now = 14;
    return "private-actor-value";
  });
  assert.equal(value, "private-actor-value");
  timings.add("catalog", 12.25);
  timings.add("token", -1);
  timings.add("private-actor-value" as PersonalizationPreviewTimingStage, 8);
  now = 40;
  const response = timings.apply(Response.json({ ready: true }));
  assert.equal(
    response.headers.get("Server-Timing"),
    "auth;dur=4.0, catalog;dur=12.3, total;dur=30.0",
  );
  assert.equal(
    response.headers.get("Server-Timing")?.includes("private-actor-value"),
    false,
  );
  assert.deepEqual(await response.json(), { ready: true });
});

test("failed stages remain measurable without changing the original error", async () => {
  let now = 0;
  const timings = new PersonalizationPreviewServerTimings(() => now);
  const failure = new Error("expected");
  await assert.rejects(
    () =>
      timings.measure("render", async () => {
        now = 5;
        throw failure;
      }),
    (error) => error === failure,
  );
  assert.equal(
    timings
      .apply(new Response(null, { status: 409 }))
      .headers.get("Server-Timing"),
    "render;dur=5.0, total;dur=5.0",
  );
});

test("service timing observers are optional, duration-only, and cannot interrupt a successful operation", async () => {
  const observed: Array<[string, number]> = [];
  assert.equal(
    await observePersonalizationPreviewStage(
      "render",
      async () => "native-content",
      (stage, duration) => observed.push([stage, duration]),
    ),
    "native-content",
  );
  assert.equal(observed[0][0], "render");
  assert.ok(Number.isFinite(observed[0][1]) && observed[0][1] >= 0);
  assert.equal(
    await observePersonalizationPreviewStage(
      "token",
      async () => "opaque-result",
      () => {
        throw new Error("observer failure");
      },
    ),
    "opaque-result",
  );
});
