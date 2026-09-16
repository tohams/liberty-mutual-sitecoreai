"use client";

import { RichText, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { PortalIcon } from "@/components/ui/portal-icon";
import type { CampaignProps } from "./campaign.props";

export function Default({ fields, params }: CampaignProps) {
  const { page } = useSitecore();
  if (!fields)
    return page.mode.isEditing ? (
      <p className="cms-empty">Select a Campaign Accordion content item.</p>
    ) : null;
  return (
    <details
      className="cms-campaign-accordion"
      id={params?.RenderingIdentifier || undefined}
      open={page.mode.isEditing || undefined}
    >
      <summary>
        <Text field={fields.title} tag="span" />
        <PortalIcon name="plus" width="20" />
      </summary>
      <RichText field={fields.body} className="cms-rich-text" />
    </details>
  );
}
