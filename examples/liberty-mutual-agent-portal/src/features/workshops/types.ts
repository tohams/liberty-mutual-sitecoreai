export type WorkshopAudience = "marketing" | "development";
export interface GuideLink {
  label: string;
  href: string;
}
export interface GuideImage {
  file: string;
  alt: string;
  caption: string;
}
export interface GuideStep {
  id?: string;
  title: string;
  action: string[];
  expected: string[];
  note?: string;
  code?: string;
  links?: GuideLink[];
  image?: GuideImage;
}
export interface WorkshopGuide {
  slug: string;
  audience: WorkshopAudience;
  category: string;
  accountScope?: "local" | "assigned";
  title: string;
  summary: string;
  outcome: string;
  duration: string;
  personas: string[];
  prerequisites: string[];
  links?: GuideLink[];
  steps: GuideStep[];
  cleanup: {
    title?: string;
    body: string[];
    code?: string;
    links?: GuideLink[];
  };
  related?: string[];
  sourceSlides: number[];
}
