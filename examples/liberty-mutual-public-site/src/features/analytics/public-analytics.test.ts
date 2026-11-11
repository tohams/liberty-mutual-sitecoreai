import assert from "node:assert/strict";
import test, { before } from "node:test";

let recordSearchInteraction: typeof import("./public-analytics").recordSearchInteraction;
before(async () => {
  process.env.SITECORE_EDGE_CONTEXT_ID ||= "synthetic-analytics-context";
  process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID ||=
    "synthetic-analytics-context";
  ({ recordSearchInteraction } = await import("./public-analytics"));
});

const data = {
  query: "Can I bundle home and auto?",
  componentId: "synthetic-component",
  siteName: "liberty-mutual-public-site",
  interactionType: "viewed" as const,
  nullResults: false,
};
function fixture() {
  const sent: Record<string, unknown>[] = [];
  let allowed = true,
    setups = 0;
  const runtime = {
    allowed: () => allowed,
    ensure: async (siteName: string) => {
      assert.equal(siteName, data.siteName);
      setups++;
    },
    send: async (payload: Record<string, unknown>): Promise<unknown> => {
      sent.push(payload);
      return { ref: "synthetic-receipt" };
    },
    page: () => "/search",
    language: () => "en",
  };
  return {
    runtime,
    sent,
    decline: () => {
      allowed = false;
    },
    setups: () => setups,
  };
}

test("a successful search send returns true and preserves the native event contract", async () => {
  const run = fixture();
  assert.equal(await recordSearchInteraction(data, run.runtime), true);
  assert.deepEqual(run.sent, [
    {
      type: "search",
      siteId: data.siteName,
      channel: "web",
      name: "/search",
      language: "en",
      core: {
        componentId: data.componentId,
        interactionType: "viewed",
        keyword: data.query,
        nullResults: false,
      },
    },
  ]);
});

test("consent or missing configuration declines return false without sending", async () => {
  const denied = fixture();
  denied.decline();
  assert.equal(await recordSearchInteraction(data, denied.runtime), false);
  assert.equal(denied.setups(), 0);
  assert.equal(denied.sent.length, 0);
  const missing = fixture();
  assert.equal(
    await recordSearchInteraction(data, {
      ...missing.runtime,
      ensure: () => null,
    }),
    false,
  );
  assert.equal(missing.sent.length, 0);
});

test("synchronous or asynchronous initialization failures return false", async () => {
  for (const ensure of [
    () => {
      throw new Error("init declined");
    },
    async () => {
      throw new Error("init rejected");
    },
  ]) {
    const run = fixture();
    assert.equal(
      await recordSearchInteraction(data, { ...run.runtime, ensure }),
      false,
    );
    assert.equal(run.sent.length, 0);
  }
});

test("consent revoked while initialization is pending prevents the send", async () => {
  const run = fixture();
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const result = recordSearchInteraction(data, {
    ...run.runtime,
    ensure: () => ready,
  });
  run.decline();
  release();
  assert.equal(await result, false);
  assert.equal(run.sent.length, 0);
});

test("SDK null receipts and rejected sends return false without background retry", async () => {
  for (const rejected of [false, true]) {
    const run = fixture();
    let calls = 0;
    assert.equal(
      await recordSearchInteraction(data, {
        ...run.runtime,
        send: async () => {
          calls++;
          if (rejected) throw new Error("send rejected");
          return null;
        },
      }),
      false,
    );
    assert.equal(calls, 1);
  }
});
