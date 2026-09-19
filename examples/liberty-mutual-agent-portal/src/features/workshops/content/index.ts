import "server-only";
import { marketingGuides } from "./marketing";
import { governanceGuides } from "./governance";
import { developmentGuides } from "./development";
import { withScreenshots } from "./screenshots";
export const workshopGuides = [
  ...marketingGuides.flatMap((guide) =>
    guide.slug === "resource-content-workflow"
      ? [...governanceGuides, guide]
      : [guide],
  ),
  ...developmentGuides,
].map(withScreenshots);
export function findWorkshopGuide(slug: string) {
  return workshopGuides.find((guide) => guide.slug === slug);
}
