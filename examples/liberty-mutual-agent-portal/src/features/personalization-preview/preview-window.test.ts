import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSONALIZATION_PREVIEW_PREPARING_PATH,
  PersonalizationPreviewLauncher,
  watchPersonalizationPreviewPageExit,
} from "./preview-window";
import type { PersonalizationPreviewResult } from "./types";

const origin = "https://portal.example.com";
const result: PersonalizationPreviewResult = {
  status: "ready",
  title: "Preview ready",
  previewUrl: `/apps/personalization-preview/view/${"a".repeat(43)}`,
  selectedExperiences: [],
};

function browserWindow() {
  const navigations: string[] = [];
  const opened = {
    closed: false,
    opener: {} as unknown,
    closeCount: 0,
    focusCount: 0,
    location: { replace: (url: string) => void navigations.push(url) },
    close() {
      this.closed = true;
      this.closeCount++;
    },
    focus() {
      this.focusCount++;
    },
  };
  return { opened, navigations };
}

test("the click opens a same-origin loading tab before preparation finishes", async () => {
  const { opened, navigations } = browserWindow();
  const loadingUrls: string[] = [];
  const launcher = new PersonalizationPreviewLauncher(
    () => origin,
    (url) => {
      loadingUrls.push(url);
      return opened;
    },
  );
  const attempt = launcher.start();
  assert.deepEqual(loadingUrls, [
    origin + PERSONALIZATION_PREVIEW_PREPARING_PATH,
  ]);
  assert.equal(opened.opener, null);
  assert.deepEqual(navigations, []);
  await Promise.resolve();
  assert.equal(launcher.complete(attempt, result), "opened");
  assert.deepEqual(navigations, [origin + result.previewUrl]);
  assert.equal(opened.focusCount, 1);
  launcher.cancel();
  assert.equal(
    opened.closeCount,
    0,
    "completed previews survive panel unmount",
  );
});

test("a blocked popup permits a fallback without opening asynchronously", () => {
  let openCalls = 0;
  const launcher = new PersonalizationPreviewLauncher(
    () => origin,
    () => {
      openCalls++;
      return null;
    },
  );
  const attempt = launcher.start();
  assert.equal(launcher.complete(attempt, result), "blocked");
  assert.equal(openCalls, 1);
  assert.equal(launcher.isCurrent(attempt), true);
});

test("popup exceptions and a manually closed loading tab permit recovery", () => {
  const blocked = new PersonalizationPreviewLauncher(
    () => origin,
    () => {
      throw new Error("Browser policy");
    },
  );
  assert.equal(blocked.complete(blocked.start(), result), "blocked");
  const { opened, navigations } = browserWindow();
  const closed = new PersonalizationPreviewLauncher(
    () => origin,
    () => opened,
  );
  const attempt = closed.start();
  opened.closed = true;
  assert.equal(closed.complete(attempt, result), "blocked");
  assert.deepEqual(navigations, []);
});

test("a failed preparation, page change, or unmount closes an unfinished tab", () => {
  for (const reason of ["failed request", "page switch", "unmount", "abort"]) {
    const { opened, navigations } = browserWindow();
    const launcher = new PersonalizationPreviewLauncher(
      () => origin,
      () => opened,
    );
    const attempt = launcher.start();
    launcher.cancel(attempt);
    assert.equal(opened.closeCount, 1, reason);
    assert.equal(launcher.complete(attempt, result), null, reason);
    assert.deepEqual(navigations, [], reason);
    launcher.cancel(attempt);
    assert.equal(opened.closeCount, 1, "cleanup is idempotent");
  }
});

test("an older completion or cleanup cannot navigate or close a newer tab", async () => {
  const old = browserWindow();
  const next = browserWindow();
  const windows = [old.opened, next.opened];
  const launcher = new PersonalizationPreviewLauncher(
    () => origin,
    () => windows.shift()!,
  );
  const first = launcher.start();
  let finishOld!: (value: PersonalizationPreviewResult) => void;
  const oldResponse = new Promise<PersonalizationPreviewResult>((resolve) => {
    finishOld = resolve;
  }).then((value) => launcher.complete(first, value));
  const second = launcher.start();
  assert.equal(old.opened.closeCount, 1);
  finishOld(result);
  assert.equal(await oldResponse, null);
  launcher.cancel(first);
  assert.equal(next.opened.closeCount, 0);
  assert.equal(launcher.complete(second, result), "opened");
  assert.deepEqual(next.navigations, [origin + result.previewUrl]);
  assert.deepEqual(old.navigations, []);
});

test("an unsafe result never navigates the reserved tab and closes it", () => {
  for (const previewUrl of [
    "https://other.example.com" + result.previewUrl,
    "javascript:alert(1)",
    "/apps/other-preview/view/" + "a".repeat(43),
    result.previewUrl + "?redirect=https://other.example.com",
  ]) {
    const { opened, navigations } = browserWindow();
    const launcher = new PersonalizationPreviewLauncher(
      () => origin,
      () => opened,
    );
    const attempt = launcher.start();
    assert.throws(() => launcher.complete(attempt, { ...result, previewUrl }));
    assert.equal(opened.closeCount, 1);
    assert.deepEqual(navigations, []);
    assert.equal(
      launcher.isCurrent(attempt),
      true,
      "the active error can still reach the panel",
    );
    launcher.cancel(attempt);
  }
});

test("failed navigation closes the loading tab and permits a fallback", () => {
  const { opened } = browserWindow();
  opened.location.replace = () => {
    throw new Error("Navigation disallowed");
  };
  const launcher = new PersonalizationPreviewLauncher(
    () => origin,
    () => opened,
  );
  const attempt = launcher.start();
  assert.equal(launcher.complete(attempt, result), "blocked");
  assert.equal(opened.closeCount, 1);
  assert.equal(launcher.isCurrent(attempt), true);
});

test("leaving the Page Builder document closes a pending tab and removes its listener on cleanup", () => {
  const first = browserWindow();
  const second = browserWindow();
  const third = browserWindow();
  const windows = [first.opened, second.opened, third.opened];
  const launcher = new PersonalizationPreviewLauncher(
    () => origin,
    () => windows.shift()!,
  );
  const documentLifecycle = new EventTarget();
  const stopWatching = watchPersonalizationPreviewPageExit(
    documentLifecycle,
    launcher,
  );
  const attempt = launcher.start();
  documentLifecycle.dispatchEvent(new Event("pagehide"));
  assert.equal(first.opened.closeCount, 1);
  assert.equal(launcher.complete(attempt, result), null);
  launcher.start();
  stopWatching();
  assert.equal(second.opened.closeCount, 1);
  const afterCleanup = launcher.start();
  documentLifecycle.dispatchEvent(new Event("pagehide"));
  assert.equal(launcher.isCurrent(afterCleanup), true);
  assert.equal(third.opened.closeCount, 0);
  launcher.cancel();
});

test("leaving the Page Builder document preserves an already completed preview", () => {
  const { opened } = browserWindow();
  const launcher = new PersonalizationPreviewLauncher(
    () => origin,
    () => opened,
  );
  const documentLifecycle = new EventTarget();
  const stopWatching = watchPersonalizationPreviewPageExit(
    documentLifecycle,
    launcher,
  );
  assert.equal(launcher.complete(launcher.start(), result), "opened");
  documentLifecycle.dispatchEvent(new Event("pagehide"));
  stopWatching();
  assert.equal(opened.closeCount, 0);
});
