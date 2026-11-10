import type { GuideImage, GuideLink } from "../types";

/** Screenshot placed next to the click it explains; unassigned images follow the controls. */
export interface DemoImage extends GuideImage {
  afterAction?: number;
}

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
  expected: string[];
  talkTrack: string[];
  controls: string[];
  links?: GuideLink[];
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
