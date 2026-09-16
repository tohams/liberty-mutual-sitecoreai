"use client";

import { useContext } from "react";
import { useSearchParams } from "next/navigation";
import { useSitecore, type LinkField } from "@sitecore-content-sdk/nextjs";
import { PortalIcon, type IconName } from "@/components/ui/portal-icon";
import { guidanceLinkWithRiskState } from "@/components/agent-guidance/guidance-risk-state";
import { PortalContext } from "@/features/portal/portal-context";
import { initialRiskState } from "@/features/portal/risk-state-navigation";

const campaignIcons = new Set([
  "growth",
  "briefcase",
  "shield",
  "book",
  "headset",
  "info",
]);
export function CampaignIcon({ name }: { name?: string }) {
  return (
    <PortalIcon
      name={campaignIcons.has(name ?? "") ? (name as IconName) : "growth"}
      width="26"
      height="26"
    />
  );
}

/** Match the product catalog's licensed-state context without granting transaction authority. */
export function useCampaignLink() {
  const portal = useContext(PortalContext);
  const query = useSearchParams();
  const { page } = useSitecore();
  const state = portal
    ? initialRiskState({
        queryState: query.get("state"),
        homeState: portal.data.agent.state,
        licensedStates: portal.data.agent.licensedStates,
      })
    : undefined;
  return (field?: LinkField) =>
    guidanceLinkWithRiskState(
      field,
      state || undefined,
      page.mode.isEditing || page.mode.isPreview,
    ) ?? { value: {} };
}
