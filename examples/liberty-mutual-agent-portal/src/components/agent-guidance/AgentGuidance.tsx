"use client";

import {
  Text,
  RichText,
  Link,
  useSitecore,
} from "@sitecore-content-sdk/nextjs";
import { useContext } from "react";
import { useSearchParams } from "next/navigation";
import { PortalContext } from "@/features/portal/portal-context";
import { readRiskState } from "@/features/portal/risk-state-navigation";
import { guidanceLinkWithRiskState } from "./guidance-risk-state";
import type { AgentGuidanceProps } from "./agent-guidance.props";

/** Reusable editorial guidance. Sitecore owns every field and audience variant. */
export function Default({ fields, params }: AgentGuidanceProps) {
  const { page } = useSitecore();
  const portal = useContext(PortalContext);
  const searchParams = useSearchParams();
  const state = readRiskState(
    searchParams.get("state"),
    portal?.data.agent.licensedStates ?? [],
  );
  const actionLink = guidanceLinkWithRiskState(
    fields?.actionLink,
    state,
    page.mode.isEditing || page.mode.isPreview,
  );
  if (!fields) {
    return page.mode.isEditing ? (
      <p className="cms-empty">Select an Agent Guidance content item.</p>
    ) : null;
  }
  return (
    <aside
      id={params?.RenderingIdentifier || undefined}
      className={["cms-guidance", params?.styles].filter(Boolean).join(" ")}
      aria-label="Agent guidance"
    >
      <div>
        <Text field={fields.eyebrow} tag="p" className="cms-eyebrow" />
        <Text field={fields.headline} tag="h2" />
        <RichText field={fields.body} className="cms-rich-text" />
      </div>
      {(fields.actionLink?.value?.href || page.mode.isEditing) && (
        <Link field={actionLink ?? { value: {} }} className="cms-action" />
      )}
    </aside>
  );
}

export function Highlight(props: AgentGuidanceProps) {
  return (
    <div className="cms-highlight">
      <Default {...props} />
    </div>
  );
}
