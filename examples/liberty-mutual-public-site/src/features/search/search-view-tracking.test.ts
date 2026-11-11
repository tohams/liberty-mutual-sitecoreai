import assert from "node:assert/strict";
import test from "node:test";
import { createSearchViewTracker } from "./search-view-tracking";
import { normalizeSearchQuestion } from "./normalize-search-question";

test("denied consent leaves a view unrecorded until an explicit allowed attempt succeeds once", async () => {
  const tracker = createSearchViewTracker();
  let consent = false,
    sends = 0;
  const send = async () => {
    sends++;
    return consent;
  };
  assert.equal(
    await tracker.record("run1:raw-question:site:component", send),
    false,
  );
  await Promise.resolve();
  assert.equal(sends, 1, "There is no automatic retry after a declined send.");
  consent = true;
  assert.equal(
    await tracker.record("run1:raw-question:site:component", send),
    true,
  );
  assert.equal(
    await tracker.record("run1:raw-question:site:component", send),
    true,
  );
  assert.equal(sends, 2);
});

test("distinct raw queries and repeated search runs remain distinct when native results are unchanged", async () => {
  const tracker = createSearchViewTracker();
  const first = "Can I bundle home and auto?";
  const second = "Could I bundle home and auto?";
  assert.equal(normalizeSearchQuestion(first), normalizeSearchQuestion(second));
  let sends = 0;
  const send = async () => {
    sends++;
    return true;
  };
  for (const key of [
    JSON.stringify([1, first, "site", "component"]),
    JSON.stringify([2, second, "site", "component"]),
    JSON.stringify([3, second, "site", "component"]),
  ])
    assert.equal(await tracker.record(key, send), true);
  assert.equal(sends, 3);
});

test("concurrent requests for the same intent share a single in-flight send", async () => {
  const tracker = createSearchViewTracker();
  let release!: (accepted: boolean) => void,
    sends = 0;
  const response = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  const send = () => {
    sends++;
    return response;
  };
  const first = tracker.record("same-view", send);
  const duplicate = tracker.record("same-view", send);
  assert.equal(first, duplicate);
  await Promise.resolve();
  assert.equal(sends, 1);
  release(true);
  assert.deepEqual(await Promise.all([first, duplicate]), [true, true]);
  await tracker.record("same-view", send);
  assert.equal(sends, 1);
});

test("a late old completion cannot overwrite the newer accepted intent", async () => {
  for (const oldAccepted of [true, false]) {
    const tracker = createSearchViewTracker();
    let release!: (accepted: boolean) => void;
    const old = tracker.record(
      "older-view",
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    await Promise.resolve();
    let newSends = 0;
    const sendNew = async () => {
      newSends++;
      return true;
    };
    assert.equal(await tracker.record("newer-view", sendNew), true);
    release(oldAccepted);
    assert.equal(await old, oldAccepted);
    assert.equal(await tracker.record("newer-view", sendNew), true);
    assert.equal(newSends, 1);
  }
});

test("a rejected send stays unrecorded and only a later explicit call retries it", async () => {
  const tracker = createSearchViewTracker();
  let sends = 0;
  const send = async () => {
    if (++sends === 1) throw new Error("SDK unavailable");
    return true;
  };
  assert.equal(await tracker.record("view", send), false);
  assert.equal(sends, 1);
  assert.equal(await tracker.record("view", send), true);
  assert.equal(sends, 2);
});
