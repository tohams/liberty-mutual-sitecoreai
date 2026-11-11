import assert from "node:assert/strict";
import test from "node:test";
import { presenterActionSequence } from "./presenter-sequence";
import type { DemoInput, DemoStep } from "./types";

const source: Pick<
  DemoStep,
  "presenterActions" | "presenterPoints" | "presenterCues" | "links"
> = {
  presenterActions: [
    ["Create the page.", "Paste the heading.", "Save the page."],
    [
      "Approve the page.",
      "Publish and wait for completion.",
      "Open the published page.",
    ],
  ],
  presenterPoints: [
    "Introduce the goal.",
    "Show the editable heading.",
    "Show the published result.",
  ],
  presenterCues: [
    { point: 1, action: 1, afterLine: 0 },
    { point: 2, action: 1, afterLine: 2 },
    { point: 3, action: 2, afterLine: 3 },
  ],
  links: [
    {
      label: "SitecoreAI",
      href: "https://app.sitecorecloud.io/channels",
      action: 1,
      afterLine: 0,
    },
    {
      label: "Published page",
      href: "https://example.com/coverage-page",
      action: 2,
      afterLine: 2,
    },
  ],
};

const input: DemoInput = {
  action: 1,
  beforeLine: 2,
  label: "Hero heading",
  value: "Explore coverage with confidence",
};

test("spoken context, destination, actions, and copy values follow the presentation sequence", () => {
  const sequence = presenterActionSequence(source, 1, [input]);
  assert.deepEqual(sequence, [
    { kind: "say", lines: ["Introduce the goal."] },
    { kind: "url", links: [source.links![0]] },
    { kind: "action", lines: ["Create the page."] },
    { kind: "copy", inputs: [input] },
    { kind: "action", lines: ["Paste the heading."] },
    { kind: "say", lines: ["Show the editable heading."] },
    { kind: "action", lines: ["Save the page."] },
  ]);
});

test("the published URL follows completed publication, while uninterrupted actions stay together", () => {
  assert.deepEqual(presenterActionSequence(source, 2, [input]), [
    {
      kind: "action",
      lines: ["Approve the page.", "Publish and wait for completion."],
    },
    { kind: "url", links: [source.links![1]] },
    { kind: "action", lines: ["Open the published page."] },
    { kind: "say", lines: ["Show the published result."] },
  ]);
});

test("copy values preserve exact multiline text and separate field positions", () => {
  const values = [
    {
      ...input,
      beforeLine: 1,
      label: "HTTP headers",
      value: '{\n  "sc_apikey": "<Delivery API token>"\n}',
    },
    {
      ...input,
      beforeLine: 2,
      label: "Query",
      value: "query Example {\n  item { name }\n}\n",
    },
  ];
  const copy = presenterActionSequence(source, 1, values).filter(
    (beat) => beat.kind === "copy",
  );
  assert.equal(copy.length, 2);
  assert.equal(copy[0].inputs[0].value, values[0].value);
  assert.equal(copy[1].inputs[0].value, values[1].value);
  assert.deepEqual(source.presenterActions[0], [
    "Create the page.",
    "Paste the heading.",
    "Save the page.",
  ]);
});

test("unavailable destinations cannot become copy cues at any position", () => {
  const invalid = {
    ...source,
    links: [
      { ...source.links![0], href: "https://example.com/?token=private" },
    ],
  };
  assert.equal(
    presenterActionSequence(invalid, 1).some((beat) => beat.kind === "url"),
    false,
  );
});

test("invalid cue references fail rather than silently dropping speaking or copy instructions", () => {
  assert.throws(() => presenterActionSequence(source, 0), RangeError);
  assert.throws(() => presenterActionSequence(source, 3), RangeError);
  assert.throws(
    () =>
      presenterActionSequence(
        { ...source, presenterCues: [{ point: 9, action: 1, afterLine: 0 }] },
        1,
      ),
    RangeError,
  );
  assert.throws(
    () =>
      presenterActionSequence(
        { ...source, presenterCues: [{ point: 1, action: 1, afterLine: 4 }] },
        1,
      ),
    RangeError,
  );
  assert.throws(
    () => presenterActionSequence(source, 1, [{ ...input, beforeLine: 0 }]),
    RangeError,
  );
  assert.throws(
    () => presenterActionSequence(source, 1, [{ ...input, beforeLine: 4 }]),
    RangeError,
  );
});
