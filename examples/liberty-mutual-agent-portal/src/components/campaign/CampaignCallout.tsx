"use client";

import { RichText, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { PortalContentLink } from "@/components/ui/portal-link";
import { useCampaignLink } from "@/features/growth/campaign-ui";
import type { CampaignProps } from "./campaign.props";

export function Default({ fields, params }: CampaignProps) {
  const { page } = useSitecore();
  const link = useCampaignLink();
  if (!fields)
    return page.mode.isEditing ? (
      <p className="cms-empty">Select a Campaign Callout content item.</p>
    ) : null;
  return (
    <section
      className="cms-campaign-callout"
      id={params?.RenderingIdentifier || undefined}
    >
      <Text field={fields.eyebrow} tag="p" className="cms-eyebrow" />
      <Text field={fields.title} tag="h2" />
      <RichText field={fields.body} className="cms-rich-text" />
      {(fields.actionLink?.value.href || page.mode.isEditing) && (
        <PortalContentLink
          field={link(fields.actionLink)}
          className="button button-primary cms-action"
        />
      )}
    </section>
  );
}
