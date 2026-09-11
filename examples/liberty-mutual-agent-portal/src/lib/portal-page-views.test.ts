import assert from "node:assert/strict";
import test from "node:test";
import { PortalPageViews } from "./portal-page-views";

const ready = async () => true;
const key = (
  path: string,
  identity = "agent",
  run = "run",
  variant = "default",
) => JSON.stringify([identity, run, path, variant]);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("a prior goal visit never suppresses a later post-exposure goal visit", async () => {
  const views = new PortalPageViews();
  const sent: string[] = [];
  for (const path of [
    "/resources/guide",
    "/resources",
    "/resources/guide",
    "/resources",
    "/resources/guide",
  ]) {
    await views.record(key(path), ready, async () => {
      sent.push(path);
      return {};
    });
  }
  assert.deepEqual(sent, [
    "/resources/guide",
    "/resources",
    "/resources/guide",
    "/resources",
    "/resources/guide",
  ]);
});

test("Strict Mode effect reruns share preparation and in-flight send, then remain deduplicated", async () => {
  const views = new PortalPageViews();
  const preparation = deferred<boolean>();
  const receipt = deferred<object>();
  let preparations = 0;
  let sends = 0;
  const prepare = () => {
    preparations++;
    return preparation.promise;
  };
  const send = () => {
    sends++;
    return receipt.promise;
  };
  const first = views.record(key("/resources"), prepare, send);
  assert.equal(views.record(key("/resources"), prepare, send), first);
  await Promise.resolve();
  assert.equal(preparations, 1);
  preparation.resolve(true);
  await Promise.resolve();
  assert.equal(sends, 1);
  assert.equal(views.record(key("/resources"), prepare, send), first);
  receipt.resolve({});
  await first;
  await views.record(key("/resources"), prepare, send);
  assert.equal(sends, 1);
});

test("identity preparation failure, empty receipt and thrown send permit the next visit attempt", async () => {
  for (const failure of ["identity", "empty", "throw"] as const) {
    const views = new PortalPageViews();
    let sends = 0;
    await views.record(
      key("/resources"),
      async () => failure !== "identity",
      async () => {
        sends++;
        if (failure === "throw") throw new Error("unavailable");
        return null;
      },
    );
    await views.record(key("/resources"), ready, async () => {
      sends++;
      return {};
    });
    assert.equal(sends, failure === "identity" ? 1 : 2);
  }
});

test("a superseded identity lookup cannot send for an earlier navigation", async () => {
  const views = new PortalPageViews();
  const preparation = deferred<boolean>();
  const sent: string[] = [];
  const first = views.record(
    key("/resources"),
    () => preparation.promise,
    async () => {
      sent.push("stale");
      return {};
    },
  );
  await Promise.resolve();
  await views.record(key("/resources/guide"), ready, async () => {
    sent.push("goal");
    return {};
  });
  preparation.resolve(true);
  await first;
  await views.record(key("/resources"), ready, async () => {
    sent.push("return");
    return {};
  });
  assert.deepEqual(sent, ["goal", "return"]);
});

test("a late receipt cannot deduplicate a newer occurrence of the same page", async () => {
  const views = new PortalPageViews();
  const oldReceipt = deferred<object>();
  const sent: string[] = [];
  const old = views.record(key("/resources"), ready, async () => {
    sent.push("old");
    return oldReceipt.promise;
  });
  await Promise.resolve();
  await Promise.resolve();
  await views.record(key("/resources/guide"), ready, async () => {
    sent.push("goal");
    return {};
  });
  // The new occurrence fails, so it must remain retryable after the old receipt arrives.
  await views.record(key("/resources"), ready, async () => {
    sent.push("return failed");
    return null;
  });
  oldReceipt.resolve({});
  await old;
  await views.record(key("/resources"), ready, async () => {
    sent.push("return retry");
    return {};
  });
  assert.deepEqual(sent, ["old", "goal", "return failed", "return retry"]);
});

test("logout invalidates pending preparation and permits a fresh login at the same route", async () => {
  const views = new PortalPageViews();
  const preparation = deferred<boolean>();
  let sends = 0;
  const stale = views.record(
    key("/resources"),
    () => preparation.promise,
    async () => {
      sends++;
      return {};
    },
  );
  await Promise.resolve();
  views.clear();
  preparation.resolve(true);
  await stale;
  assert.equal(sends, 0);
  await views.record(key("/resources"), ready, async () => {
    sends++;
    return {};
  });
  assert.equal(sends, 1);
});

test("identity, run and native page-variant changes each create a distinct visit", async () => {
  const views = new PortalPageViews();
  let sends = 0;
  for (const visit of [
    key("/resources"),
    key("/resources", "second"),
    key("/resources", "second", "new run"),
    key("/resources", "second", "new run", "native variant"),
  ]) {
    await views.record(visit, ready, async () => {
      sends++;
      return {};
    });
    await views.record(visit, ready, async () => {
      sends++;
      return {};
    });
  }
  assert.equal(sends, 4);
});

test("a long journey retains no historical suppression", async () => {
  const views = new PortalPageViews();
  let sends = 0;
  for (let index = 0; index < 1000; index++)
    await views.record(key(`/resources/${index % 2}`), ready, async () => {
      sends++;
      return {};
    });
  assert.equal(sends, 1000);
});
