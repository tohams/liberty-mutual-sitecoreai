import type { GuideImage, GuideLink } from "../types";

/** One card in the customer's prescribed use-case order. */
export interface DemoStep {
  id: string;
  title: string;
  /** The original card heading from Liberty Mutual's demo guide. */
  label: string;
  phase: string;
  sourceSlide: 10 | 11;
  durationMinutes: number;
  objective: string;
  actions: string[];
  expected: string[];
  talkTrack: string[];
  controls: string[];
  links?: GuideLink[];
  images?: GuideImage[];
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
