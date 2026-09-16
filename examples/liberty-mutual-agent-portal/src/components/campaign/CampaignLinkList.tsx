"use client";

import { Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { PortalContentLink } from "@/components/ui/portal-link";
import { PortalIcon } from "@/components/ui/portal-icon";
import { CampaignIcon, useCampaignLink } from "@/features/growth/campaign-ui";
import type { CampaignProps } from "./campaign.props";

export function Default({ fields, params }: CampaignProps) {
  const { page } = useSitecore();
  const link = useCampaignLink();
  if (!fields)
    return page.mode.isEditing ? (
      <p className="cms-empty">Select a Campaign Link List content item.</p>
    ) : null;
  return (
    <section
      className="cms-campaign-links"
      id={params?.RenderingIdentifier || undefined}
    >
      <span className="round-icon">
        <CampaignIcon name={fields.icon?.value} />
      </span>
      <Text field={fields.title} tag="h2" />
      <ul>
        {[fields.link1, fields.link2, fields.link3].map(
          (field, index) =>
            (field?.value.href || page.mode.isEditing) && (
              <li key={index}>
                <PortalContentLink field={link(field)} />
                <PortalIcon name="arrow" width="16" />
              </li>
            ),
        )}
      </ul>
    </section>
  );
}
