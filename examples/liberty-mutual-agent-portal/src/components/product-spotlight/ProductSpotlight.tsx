"use client";

import { RichText, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import { useContext } from "react";
import { useSearchParams } from "next/navigation";
import { PortalContentLink } from "@/components/ui/portal-link";
import { guidanceLinkWithRiskState } from "@/components/agent-guidance/guidance-risk-state";
import { PortalContext } from "@/features/portal/portal-context";
import { initialRiskState } from "@/features/portal/risk-state-navigation";
import {
  ProductSpotlightFallback,
  ProductSpotlightFrame,
} from "@/features/products/product-spotlight-view";
import type { ProductSpotlightProps } from "./product-spotlight.props";

/** Sitecore supplies the authored content and native variant selection. */
export function Default({ fields, params }: ProductSpotlightProps) {
  const { page } = useSitecore();
  const portal = useContext(PortalContext);
  const searchParams = useSearchParams();
  const state = portal
    ? initialRiskState({
        queryState: searchParams.get("state"),
        homeState: portal.data.agent.state,
        licensedStates: portal.data.agent.licensedStates,
      })
    : undefined;
  const actionLink = guidanceLinkWithRiskState(
    fields?.actionLink,
    state || undefined,
    page.mode.isEditing || page.mode.isPreview,
  );

  if (!fields || !Object.keys(fields).length) {
    return page.mode.isEditing ? (
      <ProductSpotlightFrame id={params?.RenderingIdentifier}>
        <p className="cms-empty">Select a Product Spotlight content item.</p>
      </ProductSpotlightFrame>
    ) : (
      <ProductSpotlightFallback />
    );
  }

  return (
    <ProductSpotlightFrame
      id={params?.RenderingIdentifier}
      styles={params?.styles}
    >
      <Text field={fields.eyebrow} tag="span" className="eyebrow" />
      <Text field={fields.headline} tag="h2" />
      <RichText field={fields.body} className="cms-rich-text" />
      {(fields.actionLink?.value?.href || page.mode.isEditing) && (
        <PortalContentLink
          field={actionLink ?? { value: {} }}
          className="button button-primary cms-action"
        />
      )}
    </ProductSpotlightFrame>
  );
}
