import { demoLaunchUrls } from "./launch-urls";
import type { DemoInput, DemoLaunchLink, DemoStep } from "./types";

export type PresenterBeat =
  | { kind: "say"; lines: string[] }
  | { kind: "url"; links: DemoLaunchLink[] }
  | { kind: "copy"; inputs: DemoInput[] }
  | { kind: "action"; lines: string[] };

type SequenceSource = Pick<
  DemoStep,
  "presenterActions" | "presenterPoints" | "presenterCues" | "links"
>;

/** Interleave authored cues without changing action order or clipboard values. */
export function presenterActionSequence(
  step: SequenceSource,
  action: number,
  inputs: DemoInput[] = [],
): PresenterBeat[] {
  const lines = step.presenterActions[action - 1];
  if (!Number.isInteger(action) || !lines)
    throw new RangeError("Choose an existing presenter action.");
  const cues = step.presenterCues.filter((cue) => cue.action === action);
  const links = demoLaunchUrls(step).filter((link) => link.action === action);
  const values = inputs.filter((input) => input.action === action);
  for (const cue of [...cues, ...links]) {
    if (
      !Number.isInteger(cue.afterLine) ||
      cue.afterLine < 0 ||
      cue.afterLine > lines.length
    )
      throw new RangeError(
        "Place each presenter cue at an existing action line.",
      );
  }
  for (const cue of cues) {
    if (
      !Number.isInteger(cue.point) ||
      cue.point < 1 ||
      cue.point > step.presenterPoints.length
    )
      throw new RangeError("Choose an existing presenter speaking point.");
  }
  for (const input of values) {
    const beforeLine = input.beforeLine ?? 1;
    if (
      !Number.isInteger(beforeLine) ||
      beforeLine < 1 ||
      beforeLine > lines.length
    )
      throw new RangeError(
        "Place each copy value before an existing action line.",
      );
  }

  const beats: PresenterBeat[] = [];
  for (let afterLine = 0; afterLine <= lines.length; afterLine++) {
    const spoken = cues
      .filter((cue) => cue.afterLine === afterLine)
      .map((cue) => step.presenterPoints[cue.point - 1]);
    if (spoken.length) beats.push({ kind: "say", lines: spoken });
    const destinations = links.filter((link) => link.afterLine === afterLine);
    if (destinations.length) beats.push({ kind: "url", links: destinations });
    const copy = values.filter(
      (input) => (input.beforeLine ?? 1) === afterLine + 1,
    );
    if (copy.length) beats.push({ kind: "copy", inputs: copy });
    if (afterLine === lines.length) continue;
    const previous = beats.at(-1);
    if (previous?.kind === "action") previous.lines.push(lines[afterLine]);
    else beats.push({ kind: "action", lines: [lines[afterLine]] });
  }
  return beats;
}
