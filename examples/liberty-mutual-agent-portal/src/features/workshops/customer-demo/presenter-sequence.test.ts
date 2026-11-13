import assert from "node:assert/strict";
import test from "node:test";
import { presenterActionSequence } from "./presenter-sequence";
import type { DemoInput, DemoStep } from "./types";

const source: Pick<
  DemoStep,
  | "presenterActions"
  | "actionSummaries"
  | "presenterPoints"
  | "presenterCues"
  | "links"
> = {
  presenterActions: [
    ["Create the page.", "Paste the heading.", "Save the page."],
    [
      "Approve the page.",
      "Publish and wait for completion.",
      "Open the published page.",
    ],
  ],
  actionSummaries: [
    { action: 1, beforeLine: 1, text: "Create the page" },
    { action: 1, beforeLine: 2, text: "Edit the heading" },
    { action: 1, beforeLine: 3, text: "Save the page" },
    { action: 2, beforeLine: 1, text: "Approve and publish" },
    { action: 2, beforeLine: 3, text: "Open the live page" },
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
    { kind: "action", summary: "Create the page", lines: ["Create the page."] },
    { kind: "copy", inputs: [input] },
    {
      kind: "action",
      summary: "Edit the heading",
      lines: ["Paste the heading."],
    },
    { kind: "say", lines: ["Show the editable heading."] },
    { kind: "action", summary: "Save the page", lines: ["Save the page."] },
  ]);
});

test("the published URL follows completed publication, while uninterrupted actions stay together", () => {
  assert.deepEqual(presenterActionSequence(source, 2, [input]), [
    {
      kind: "action",
      summary: "Approve and publish",
      lines: ["Approve the page.", "Publish and wait for completion."],
    },
    { kind: "url", links: [source.links![1]] },
    {
      kind: "action",
      summary: "Open the live page",
      lines: ["Open the published page."],
    },
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

test("authored summaries can split an uninterrupted task without moving clicks or cues", () => {
  const step = {
    ...source,
    actionSummaries: [
      ...source.actionSummaries,
      { action: 2, beforeLine: 2, text: "Wait for publication" },
    ],
  };
  const sequence = presenterActionSequence(step, 2, [input]);
  const actions = sequence.filter((beat) => beat.kind === "action");
  assert.deepEqual(
    actions.map((beat) => beat.summary),
    ["Approve and publish", "Wait for publication", "Open the live page"],
  );
  assert.deepEqual(
    actions.flatMap((beat) => beat.lines),
    source.presenterActions[1],
  );
  assert.deepEqual(
    sequence.filter((beat) => beat.kind !== "action"),
    presenterActionSequence(source, 2, [input]).filter(
      (beat) => beat.kind !== "action",
    ),
  );
});

test("missing, duplicate, empty, or misplaced Do summaries fail instead of hiding click instructions", () => {
  const invalid = [
    source.actionSummaries.filter(
      (summary) => !(summary.action === 1 && summary.beforeLine === 2),
    ),
    [...source.actionSummaries, source.actionSummaries[0]],
    [
      { ...source.actionSummaries[0], text: " " },
      ...source.actionSummaries.slice(1),
    ],
    [
      ...source.actionSummaries,
      { action: 1, beforeLine: 4, text: "Outside the action" },
    ],
    [
      ...source.actionSummaries,
      { action: 0, beforeLine: 1, text: "Outside the action" },
    ],
  ];
  for (const actionSummaries of invalid)
    assert.throws(
      () => presenterActionSequence({ ...source, actionSummaries }, 1, [input]),
      RangeError,
    );
});
