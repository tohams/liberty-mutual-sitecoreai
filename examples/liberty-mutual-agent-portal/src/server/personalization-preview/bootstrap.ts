import "server-only";
import { getAudiencePreviewBootstrap } from "@/server/audience-preview/bootstrap";
import { createAudiencePreviewInput } from "@/features/audience-preview/scenarios";

/** A fixed, inert operational shell; the selected native variants supply the content. */
export function getPersonalizationPreviewBootstrap() {
  const data = getAudiencePreviewBootstrap(
    createAudiencePreviewInput("producer", ["TX", "FL", "IL"]),
  );
  return {
    ...data,
    agent: {
      ...data.agent,
      id: "personalization-preview",
      agencyId: "personalization-preview-agency",
      firstName: "Content",
      lastName: "Preview",
      name: "Content Preview",
      initials: "CP",
      roleLabel: "Preview",
    },
    agency: { ...data.agency, id: "personalization-preview-agency" },
    growthCampaign: { ...data.growthCampaign, id: "personalization-preview" },
  };
}
