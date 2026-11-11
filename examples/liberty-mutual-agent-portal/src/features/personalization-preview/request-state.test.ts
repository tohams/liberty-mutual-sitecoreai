import assert from "node:assert/strict";
import test from "node:test";
import {
  PersonalizationRequestSuperseded,
  readCurrentPersonalizationResponse,
} from "./request-state";

function deferredJson() {
  let resolve!: (value: unknown) => void;
  const json = new Promise<unknown>((done) => {
    resolve = done;
  });
  return { response: { json: () => json }, resolve };
}

test("an old 401 or 409 parsed after a page switch cannot reach its state handlers", async () => {
  for (const code of ["AUTHENTICATION_REQUIRED", "CONFIGURATION_CHANGED"]) {
    const controller = new AbortController();
    let pageKey = "home:en:1";
    const pending = deferredJson();
    let handled = false;
    const result = readCurrentPersonalizationResponse(pending.response, {
      controller,
      activeController: () => controller,
      expectedPageKey: pageKey,
      currentPageKey: () => pageKey,
    }).then(() => {
      handled = true;
    });
    pageKey = "resources:en:2";
    pending.resolve({ error: { code } });
    await assert.rejects(result, PersonalizationRequestSuperseded);
    assert.equal(handled, false);
  }
});

test("clearing the selected page invalidates a parsing request without a timeout message", async () => {
  const controller = new AbortController();
  let active: AbortController | null = controller;
  const pending = deferredJson();
  const result = readCurrentPersonalizationResponse(pending.response, {
    controller,
    activeController: () => active,
    expectedPageKey: "home:en:1",
    currentPageKey: () => "home:en:1",
  });
  active = null;
  pending.resolve({ page: { name: "Home" } });
  await assert.rejects(result, PersonalizationRequestSuperseded);
});

test("a newer request for the same page supersedes the older response", async () => {
  const controller = new AbortController();
  let active = controller;
  const pending = deferredJson();
  const result = readCurrentPersonalizationResponse(pending.response, {
    controller,
    activeController: () => active,
    expectedPageKey: "home:en:1",
    currentPageKey: () => "home:en:1",
  });
  active = new AbortController();
  pending.resolve({ revision: "old" });
  await assert.rejects(result, PersonalizationRequestSuperseded);
});

test("only the active, non-aborted response reaches catalog or preview handlers", async () => {
  const controller = new AbortController();
  const state = {
    controller,
    activeController: () => controller,
    expectedPageKey: "home:en:1",
    currentPageKey: () => "home:en:1",
  };
  const payload = { revision: "current" };
  assert.equal(
    await readCurrentPersonalizationResponse(
      { json: async () => payload },
      state,
    ),
    payload,
  );
  controller.abort();
  await assert.rejects(
    readCurrentPersonalizationResponse({ json: async () => payload }, state),
    PersonalizationRequestSuperseded,
  );
});
