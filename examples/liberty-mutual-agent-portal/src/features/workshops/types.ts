export type WorkshopAudience = "marketing" | "development";
export interface GuideLink {
  label: string;
  href: string;
}
export interface GuideImage {
  file: string;
  alt: string;
  caption: string;
  title?: string;
  /** Pixel bounds within the untouched source screenshot. */
  crop?: GuideImageCrop;
  /** Percentages of the displayed image, after any crop. Order sets the numbers. */
  annotations?: GuideImageAnnotation[];
}
export interface GuideImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}
export interface GuideImageAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
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
  /** Ordered screenshots; when provided, this replaces the legacy single image. */
  images?: GuideImage[];
}
export interface WorkshopGuide {
  slug: string;
  audience: WorkshopAudience;
  category: string;
  accountScope?: "local" | "assigned" | "presenter";
  title: string;
  summary: string;
  outcome: string;
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
