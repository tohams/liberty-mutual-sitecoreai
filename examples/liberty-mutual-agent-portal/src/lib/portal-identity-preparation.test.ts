import assert from "node:assert/strict";
import test from "node:test";
import {
  boundedIdentityPreparation,
  PortalIdentityWork,
  prepareBrowserAdapter,
} from "./portal-identity-preparation";

test("optional bootstrap and body parsing cannot hold successful login indefinitely", async () => {
  let fetchSignal: AbortSignal | undefined;
  assert.equal(
    await boundedIdentityPreparation(async (signal) => {
      fetchSignal = signal;
      await new Promise(() => {});
      return true;
    }, 20),
    false,
  );
  assert.equal(fetchSignal?.aborted, true);
  let bodySignal: AbortSignal | undefined;
  assert.equal(
    await boundedIdentityPreparation(async (signal) => {
      bodySignal = signal;
      const response = { json: () => new Promise(() => {}) };
      await response.json();
      return true;
    }, 20),
    false,
  );
  assert.equal(bodySignal?.aborted, true);
});

test("an upstream SDK that ignores cancellation remains tracked and blocks fresh initialization", async () => {
  const work = new PortalIdentityWork();
  const oldGeneration = work.current();
  let finishOld!: () => void;
  const old = work.run(
    oldGeneration,
    new AbortController().signal,
    () =>
      new Promise<void>((resolve) => {
        finishOld = resolve;
      }),
  );
  await Promise.resolve();
  const freshGeneration = work.invalidate();
  let freshStarted = false;
  assert.equal(
    await boundedIdentityPreparation(async (signal) => {
      await work.waitUntilIdle(signal);
      await work.run(freshGeneration, signal, async () => {
        freshStarted = true;
      });
      return true;
    }, 20),
    false,
  );
  assert.equal(freshStarted, false);
  finishOld();
  await old;
  assert.equal(
    await boundedIdentityPreparation(async (signal) => {
      await work.waitUntilIdle(signal);
      await work.run(freshGeneration, signal, async () => {
        freshStarted = true;
      });
      return true;
    }, 100),
    true,
  );
  assert.equal(freshStarted, true);
});

test("late old initialization cannot send its superseded identity around fresh initialization", async () => {
  const work = new PortalIdentityWork();
  const oldGeneration = work.current();
  const oldSignal = new AbortController().signal;
  let finishOld!: () => void;
  const events: string[] = [];
  const old = (async () => {
    await work.run(
      oldGeneration,
      oldSignal,
      () =>
        new Promise<void>((resolve) => {
          finishOld = resolve;
        }),
    );
    // The same guard used after awaited SDK preparation in identifyProfile.
    if (!work.isCurrent(oldGeneration)) return;
    await work.run(oldGeneration, oldSignal, async () => {
      events.push("old identity");
    });
  })();
  await Promise.resolve();
  const freshGeneration = work.invalidate();
  const fresh = boundedIdentityPreparation(async (signal) => {
    await work.waitUntilIdle(signal);
    await work.run(freshGeneration, signal, async () => {
      events.push("fresh initialization");
    });
    return true;
  }, 100);
  finishOld();
  await old;
  assert.equal(await fresh, true);
  await assert.rejects(
    work.run(oldGeneration, oldSignal, async () => {
      events.push("late old identity");
    }),
  );
  assert.deepEqual(events, ["fresh initialization"]);
});

test("fresh adapter delegates exactly to public methods without mutating the original", async () => {
  let clientId = "old browser";
  let writes = 0;
  let finishSet!: () => void;
  const adapter = {
    type: "browser" as const,
    getClientId: () => clientId,
    setClientId: () =>
      new Promise<void>((resolve) => {
        writes++;
        finishSet = () => {
          clientId = "fresh browser";
          resolve();
        };
      }),
    isBot: () => false,
    location: { getSearchParams: () => "?original=true" },
  };
  const originalGet = adapter.getClientId;
  const wrapped = prepareBrowserAdapter(adapter, true);
  assert.equal(wrapped.getClientId(), null);
  assert.equal(adapter.getClientId(), "old browser");
  assert.equal(wrapped.location, adapter.location);
  assert.equal(wrapped.isBot, adapter.isBot);
  const setting = wrapped.setClientId();
  assert.equal(writes, 1);
  assert.equal(wrapped.getClientId(), null);
  finishSet();
  await setting;
  assert.equal(wrapped.getClientId(), "fresh browser");
  assert.equal(adapter.getClientId, originalGet);
  assert.equal(
    prepareBrowserAdapter(adapter, false).getClientId(),
    "fresh browser",
  );
});

test("aborted preparation cannot start later queued SDK work", async () => {
  const work = new PortalIdentityWork();
  const controller = new AbortController();
  let ran = false;
  const pending = work.run(work.current(), controller.signal, async () => {
    ran = true;
  });
  controller.abort();
  await assert.rejects(pending);
  assert.equal(ran, false);
  assert.equal(
    await boundedIdentityPreparation(
      async () => {
        ran = true;
        return true;
      },
      100,
      controller.signal,
    ),
    false,
  );
  assert.equal(ran, false);
});
