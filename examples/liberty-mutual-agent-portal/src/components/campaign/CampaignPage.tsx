"use client";

import { AppPlaceholder, useSitecore } from "@sitecore-content-sdk/nextjs";
import { campaignPlaceholder } from "@/features/growth/campaign-contract";
import type { ComponentProps } from "@/lib/component-props";

/** The campaign is an authored composition, including nested native personalization instances. */
export function Default({ rendering, params }: ComponentProps) {
  const { page, componentMap } = useSitecore();
  const slot = (name: "hero" | "main" | "sidebar") => {
    const placement = campaignPlaceholder(rendering, name, page.mode.isEditing);
    return placement ? (
      <AppPlaceholder {...placement} page={page} componentMap={componentMap} />
    ) : null;
  };
  return (
    <div className="cms-campaign" id={params?.RenderingIdentifier || undefined}>
      {slot("hero")}
      <div className="cms-campaign-columns">
        <div className="cms-campaign-main">{slot("main")}</div>
        <aside
          className="cms-campaign-sidebar"
          aria-label="Growth resources and support"
        >
          {slot("sidebar")}
        </aside>
      </div>
    </div>
  );
}
