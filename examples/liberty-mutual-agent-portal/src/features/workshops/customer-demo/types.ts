import type { GuideImage, GuideLink } from "../types";

/** Screenshot placed next to the click it explains; unassigned images follow the controls. */
export interface DemoImage extends GuideImage {
  afterAction?: number;
}

/** Exact static text to paste into a field during the numbered action. */
export interface DemoInput {
  action: number;
  /** One-based line within the action, immediately before its value is needed. */
  beforeLine?: number;
  label: string;
  value: string;
}

/** A cue appears after this line; zero places it before the action's first line. */
export interface DemoCuePosition {
  action: number;
  afterLine: number;
}

export interface DemoPresenterCue extends DemoCuePosition {
  /** One-based reference into presenterPoints, keeping the spoken copy in one place. */
  point: number;
}

export interface DemoLaunchLink extends GuideLink, DemoCuePosition {}

/** One card in the customer's prescribed use-case order. */
export interface DemoStep {
  id: string;
  title: string;
  /** The original card heading from Liberty Mutual's demo guide. */
  label: string;
  phase: string;
  sourceSlide: 10 | 11;
  durationMinutes: number;
  /** The person whose task is being demonstrated. */
  persona: string;
  /** The business situation that makes this task useful. */
  scenario: string;
  objective: string;
  /** The observable completion condition for this customer-requested outcome. */
  stopWhen: string;
  actions: string[];
  /** Brief spoken business points and concrete screen observations for this requirement. */
  presenterPoints: string[];
  presenterCues: DemoPresenterCue[];
  /** Exact clicks in the same action order as the copy fields and screenshots. */
  presenterActions: string[][];
  presenterResult: string;
  inputs?: DemoInput[];
  expected: string[];
  talkTrack: string[];
  controls: string[];
  links?: DemoLaunchLink[];
  images?: DemoImage[];
  transition: string;
  mode?: "demonstrate" | "explain";
}

export interface DemoChapter {
  id: "public" | "portal";
  title: string;
  summary: string;
  sourceSlide: 10 | 11;
  steps: DemoStep[];
}
