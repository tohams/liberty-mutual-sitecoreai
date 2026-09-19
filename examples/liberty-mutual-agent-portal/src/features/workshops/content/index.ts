import "server-only";
import { marketingGuides } from "./marketing";
import { governanceGuides } from "./governance";
import { developmentGuides } from "./development";
import { withScreenshots } from "./screenshots";
import { orderByWorkshopSection, withPriorities } from "./priorities";
export const workshopGuides = orderByWorkshopSection(
  [
    ...marketingGuides.flatMap((guide) =>
      guide.slug === "resource-content-workflow"
        ? [...governanceGuides, guide]
        : [guide],
    ),
    ...developmentGuides,
  ]
    .map(withScreenshots)
    .map(withPriorities),
);
export function findWorkshopGuide(slug: string) {
  return workshopGuides.find((guide) => guide.slug === slug);
}
