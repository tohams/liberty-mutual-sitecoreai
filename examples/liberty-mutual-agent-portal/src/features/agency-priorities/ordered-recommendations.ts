import type { AgencyRecommendation } from "@/components/agency-priorities/agency-priorities.props";

/** Preserve the native reference order and the SDK field objects, including editing metadata. */
export function orderedRecommendations(value: unknown): AgencyRecommendation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is AgencyRecommendation =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      item.fields !== null &&
      typeof item.fields === "object" &&
      !Array.isArray(item.fields),
  );
}
