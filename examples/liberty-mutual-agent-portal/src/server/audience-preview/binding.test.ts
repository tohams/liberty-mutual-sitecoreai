import assert from "node:assert/strict";
import test from "node:test";
import { inspectAudiencePreviewBinding } from "./binding";

const browser = {
  edgeUrl: "https://edge-platform.sitecorecloud.io",
  contextId: "synthetic-private-context",
  browserId: "11111111-1111-4111-8111-111111111111",
};
const profileId = "22222222-2222-4222-8222-222222222222";

test("the same strict browser/show read distinguishes matched and mismatched references without returning them", async () => {
  for (const [reference, category] of [
    [profileId, "matched"],
    ["33333333-3333-4333-8333-333333333333", "mismatched"],
  ]) {
    let requests = 0;
    const result = await inspectAudiencePreviewBinding(
      browser,
      profileId,
      AbortSignal.timeout(1_000),
      async (input, init) => {
        requests++;
        assert.equal(init?.method, "GET");
        assert.equal(
          new URL(String(input)).pathname,
          `/v1/events/v1.2/browser/${browser.browserId}/show.json`,
        );
        return Response.json({
          ref: browser.browserId,
          customer: { ref: reference },
        });
      },
    );
    assert.equal(requests, 1);
    assert.deepEqual(result, { category, status: 200 });
    const diagnostic = JSON.stringify(result);
    for (const sensitive of [
      profileId,
      browser.browserId,
      browser.contextId,
      reference,
    ])
      assert.equal(diagnostic.includes(sensitive), false);
  }
});

test("a valid success body for a different browser cannot confirm a binding", async () => {
  const result = await inspectAudiencePreviewBinding(
    browser,
    profileId,
    AbortSignal.timeout(1_000),
    async () => Response.json({ ref: profileId, customer: { ref: profileId } }),
  );
  assert.deepEqual(result, { category: "invalid-response", status: 200 });
});

test("missing resources, HTTP failures, and invalid success bodies remain distinct and never retry", async () => {
  for (const [status, category] of [
    [404, "not-found"],
    [401, "http-failure"],
    [429, "http-failure"],
    [503, "http-failure"],
    [200, "invalid-response"],
  ] as const) {
    let requests = 0;
    const result = await inspectAudiencePreviewBinding(
      browser,
      profileId,
      AbortSignal.timeout(1_000),
      async () => {
        requests++;
        return new Response("private-provider-error", { status });
      },
    );
    assert.equal(requests, 1);
    assert.deepEqual(result, { category, status });
  }
});

test("transport errors and timeouts disclose only a fixed category", async () => {
  const failed = await inspectAudiencePreviewBinding(
    browser,
    profileId,
    AbortSignal.timeout(1_000),
    async () => {
      throw new Error("private-error-details");
    },
  );
  assert.deepEqual(failed, { category: "transport-failure" });
  const timedOut = await inspectAudiencePreviewBinding(
    browser,
    profileId,
    AbortSignal.timeout(1_000),
    async () => {
      throw new DOMException("private-timeout-details", "TimeoutError");
    },
  );
  assert.deepEqual(timedOut, { category: "timeout" });
  const controller = new AbortController();
  controller.abort();
  let requests = 0;
  const aborted = await inspectAudiencePreviewBinding(
    browser,
    profileId,
    controller.signal,
    async () => {
      requests++;
      return Response.json({});
    },
  );
  assert.deepEqual(aborted, { category: "timeout" });
  assert.equal(requests, 0);
});
