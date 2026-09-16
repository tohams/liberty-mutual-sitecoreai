"use client";

import { useEffect, useState } from "react";
import { RichText, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { PortalIcon } from "@/components/ui/portal-icon";
import {
  campaignDate,
  campaignWindow,
} from "@/features/growth/campaign-contract";
import type { CampaignProps } from "./campaign.props";

/** Display scheduling affects this component only; it is not a publish/unpublish job. */
export function Default({ fields, params }: CampaignProps) {
  const { page } = useSitecore();
  const [now, setNow] = useState<number>();
  const start = fields?.startsAt?.value;
  const end = fields?.endsAt?.value;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const instant = Date.now();
      setNow(instant);
      const boundary = [campaignDate(start), campaignDate(end)]
        .filter(
          (value): value is number =>
            value !== undefined && Number.isFinite(value) && value > instant,
        )
        .sort((a, b) => a - b)[0];
      if (boundary)
        timer = setTimeout(
          update,
          Math.min(boundary - instant + 1, 2_147_483_647),
        );
    };
    // A deterministic first render avoids mismatched server/client clocks and flashes outside a window.
    timer = setTimeout(update, 0);
    return () => clearTimeout(timer);
  }, [start, end]);
  if (!fields)
    return page.mode.isEditing ? (
      <p className="cms-empty">Select a Campaign Alert content item.</p>
    ) : null;
  const window = campaignWindow(start, end, now ?? 0);
  const bounded = !!(start?.trim() || end?.trim());
  if (
    !page.mode.isEditing &&
    ((bounded && now === undefined) || window !== "active")
  )
    return null;
  return (
    <aside
      className="cms-campaign-alert"
      id={params?.RenderingIdentifier || undefined}
      aria-label={fields.title?.value || "Agency update"}
    >
      <span className="cms-campaign-alert-icon">
        <PortalIcon name="info" width="23" />
      </span>
      <div>
        <Text field={fields.title} tag="h2" />
        <RichText field={fields.body} className="cms-rich-text" />
        {page.mode.isEditing && (
          <p className="cms-campaign-editor-note">
            Display window (UTC): {start || "No start date"} –{" "}
            {end || "No end date"}.{" "}
            {now !== undefined && window !== "active"
              ? `Currently ${window}; visible here for editing.`
              : "Shown while the published display window is active."}{" "}
            This controls alert visibility, not publishing.
          </p>
        )}
      </div>
    </aside>
  );
}
