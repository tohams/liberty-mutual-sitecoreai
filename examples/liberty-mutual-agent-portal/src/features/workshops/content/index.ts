import "server-only";
import { marketingGuides } from "./marketing";
import { developmentGuides } from "./development";
import { withScreenshots } from "./screenshots";
export const workshopGuides = [...marketingGuides, ...developmentGuides].map(
  withScreenshots,
);
export function findWorkshopGuide(slug: string) {
  return workshopGuides.find((guide) => guide.slug === slug);
}
