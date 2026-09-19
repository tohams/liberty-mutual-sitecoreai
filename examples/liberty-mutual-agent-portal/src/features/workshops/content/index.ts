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
// Previously shared transaction links now lead to the single component example.
const consolidatedTransactionGuides = new Set([
  "bop-submission",
  "renewal-follow-up",
  "commercial-and-wholesale",
  "surety-request",
]);
export function findWorkshopGuide(slug: string) {
  const canonicalSlug = consolidatedTransactionGuides.has(slug)
    ? "campaign-and-conversation"
    : slug;
  return workshopGuides.find((guide) => guide.slug === canonicalSlug);
}
