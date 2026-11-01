import assert from "node:assert/strict";
import test from "node:test";
import { createScrollMilestoneTracker } from "./scroll-milestones";

test("does not report a milestone before its actual threshold", () => {
  const measure = createScrollMilestoneTracker();
  const at = (scrollTop: number) =>
    measure({ scrollTop, documentHeight: 1800, viewportHeight: 800 });

  assert.deepEqual(at(249.99), []);
  assert.deepEqual(at(250), [25]);
  assert.deepEqual(at(499.99), []);
  assert.deepEqual(at(500), [50]);
  assert.deepEqual(at(749.99), []);
  assert.deepEqual(at(750), [75]);
  assert.deepEqual(at(999.99), []);
  assert.deepEqual(at(1000), [100]);
});

test("reports crossed milestones once, including after a jump or resize", () => {
  const measure = createScrollMilestoneTracker();
  assert.deepEqual(
    measure({ scrollTop: 800, documentHeight: 1800, viewportHeight: 800 }),
    [25, 50, 75],
  );
  assert.deepEqual(
    measure({ scrollTop: 300, documentHeight: 1800, viewportHeight: 800 }),
    [],
  );
  assert.deepEqual(
    measure({ scrollTop: 800, documentHeight: 1600, viewportHeight: 800 }),
    [100],
  );
  assert.deepEqual(
    measure({ scrollTop: 1600, documentHeight: 1600, viewportHeight: 800 }),
    [],
  );
});

test("ignores short pages and invalid browser geometry without consuming milestones", () => {
  const measure = createScrollMilestoneTracker();
  for (const position of [
    { scrollTop: 0, documentHeight: 800, viewportHeight: 800 },
    { scrollTop: 0, documentHeight: 700, viewportHeight: 800 },
    { scrollTop: -20, documentHeight: 1800, viewportHeight: 800 },
    { scrollTop: 500, documentHeight: Infinity, viewportHeight: 800 },
    { scrollTop: NaN, documentHeight: 1800, viewportHeight: 800 },
    { scrollTop: 500, documentHeight: 1800, viewportHeight: 0 },
  ])
    assert.deepEqual(measure(position), []);

  assert.deepEqual(
    measure({ scrollTop: 1000, documentHeight: 1800, viewportHeight: 800 }),
    [25, 50, 75, 100],
  );
});

test("a new page view receives its own complete sequence", () => {
  const bottom = { scrollTop: 1000, documentHeight: 1800, viewportHeight: 800 };
  const first = createScrollMilestoneTracker();
  const next = createScrollMilestoneTracker();
  assert.deepEqual(first(bottom), [25, 50, 75, 100]);
  assert.deepEqual(first(bottom), []);
  assert.deepEqual(next(bottom), [25, 50, 75, 100]);
});
