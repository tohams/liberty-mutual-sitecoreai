import assert from "node:assert/strict";
import test from "node:test";
import { shouldResetRouteScroll } from "./route-scroll";

test("a new page starts at its heading after leaving a lower-page link", () => {
  assert.equal(shouldResetRouteScroll("/", "/bundling", "", null), true);
});
test("hash destinations and same-page changes retain their intended position", () => {
  assert.equal(
    shouldResetRouteScroll("/", "/get-a-quote", "#next-step", null),
    false,
  );
  assert.equal(shouldResetRouteScroll("/search", "/search", "", null), false);
});
test("Back restoration is preserved without suppressing the next normal navigation", () => {
  assert.equal(shouldResetRouteScroll("/bundling", "/", "", "/"), false);
  assert.equal(shouldResetRouteScroll("/", "/bundling", "", "/"), true);
});
