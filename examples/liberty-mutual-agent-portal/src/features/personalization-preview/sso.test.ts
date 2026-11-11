import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSONALIZATION_PREVIEW_AUTH_MESSAGE,
  PersonalizationPreviewSsoBridge,
  personalizationPreviewCompletionOutcome,
} from "./sso";

const origin = "https://portal.example";
const source = {} as Window;
const message = {
  type: PERSONALIZATION_PREVIEW_AUTH_MESSAGE,
  outcome: "authenticated",
};

test("a completion URL claiming authentication cannot replace a verified server session", () => {
  assert.equal(
    personalizationPreviewCompletionOutcome(false, "authenticated"),
    "failed",
  );
  assert.equal(
    personalizationPreviewCompletionOutcome(false, "interaction_required"),
    "interaction_required",
  );
  assert.equal(
    personalizationPreviewCompletionOutcome(true, "failed"),
    "authenticated",
  );
});

test("silent sign-in is attempted only once, including after a failed attempt", () => {
  const bridge = new PersonalizationPreviewSsoBridge();
  assert.equal(bridge.takeSilentAttempt(), true);
  bridge.watch("silent", source);
  assert.equal(
    bridge.receive(
      { origin, source, data: { ...message, outcome: "interaction_required" } },
      origin,
    ),
    "silent",
  );
  assert.equal(bridge.takeSilentAttempt(), false);
});

test("completion requires the exact origin, expected window, and a bounded signal without credentials", () => {
  const bridge = new PersonalizationPreviewSsoBridge();
  bridge.watch("popup", source);
  for (const event of [
    { origin: "https://other.example", source, data: message },
    { origin, source: {} as Window, data: message },
    { origin, source: null, data: message },
    { origin, source, data: { ...message, accessToken: "untrusted" } },
    { origin, source, data: { ...message, outcome: "unknown" } },
  ])
    assert.equal(bridge.receive(event, origin), null);
  // This returns only a completion signal, never an authenticated identity.
  assert.equal(
    bridge.receive({ origin, source, data: message }, origin),
    "popup",
  );
  assert.equal(bridge.receive({ origin, source, data: message }, origin), null);
});

test("an expired frame or replaced popup cannot trigger another session check", () => {
  const bridge = new PersonalizationPreviewSsoBridge();
  bridge.watch("silent", source);
  bridge.forget("silent");
  assert.equal(bridge.receive({ origin, source, data: message }, origin), null);
  const replacement = {} as Window;
  bridge.watch("popup", source);
  bridge.watch("popup", replacement);
  assert.equal(bridge.receive({ origin, source, data: message }, origin), null);
  assert.equal(
    bridge.receive({ origin, source: replacement, data: message }, origin),
    "popup",
  );
});
