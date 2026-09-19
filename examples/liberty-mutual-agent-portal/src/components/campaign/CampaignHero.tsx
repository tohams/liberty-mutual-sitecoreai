"use client";

import { Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { PortalLink } from "@/components/ui/portal-link";
import { CampaignIcon } from "@/features/growth/campaign-ui";
import type { CampaignProps } from "./campaign.props";

export function Default({ fields, params }: CampaignProps) {
  const { page } = useSitecore();
  if (!fields)
    return page.mode.isEditing ? (
      <p className="cms-empty">Select a Campaign Hero content item.</p>
    ) : null;
  return (
    <>
      <header
        className="cms-campaign-hero"
        id={params?.RenderingIdentifier || undefined}
      >
        <div className="cms-campaign-hero-copy">
          <Text field={fields.eyebrow} tag="p" className="cms-eyebrow" />
          <h1>
            <span className="cms-campaign-title-icon">
              <CampaignIcon name={fields.icon?.value} />
            </span>
            <Text field={fields.title} />
          </h1>
          <Text
            field={fields.summary}
            tag="p"
            className="cms-campaign-summary"
          />
        </div>
        <div className="cms-campaign-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </header>
      <nav className="cms-campaign-jump" aria-label="On this page">
        <span>ON THIS PAGE</span>
        <PortalLink href="#growth-opportunity">Opportunity</PortalLink>
        <PortalLink href="#growth-questions">Your questions</PortalLink>
        <PortalLink href="#growth-contact">Your next step</PortalLink>
      </nav>
    </>
  );
}
