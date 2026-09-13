"use client";

import { useEffect } from "react";
import { CdpHelper, useSitecore } from "@sitecore-content-sdk/nextjs";
import type { PortalBootstrap } from "@/contracts/portal";
import { recordPortalPageView } from "@/lib/portal-analytics";
import config from "sitecore.config";

export function PortalTracking({
  identity,
  runId,
  path,
}: {
  identity: PortalBootstrap["udlIdentity"];
  runId: string;
  path: string;
}) {
  const { page } = useSitecore();
  const { route, context } = page.layout.sitecore;
  const language = route?.itemLanguage || config.defaultLanguage;
  const pageName = route?.name;
  const variant = route?.itemId
    ? CdpHelper.getPageVariantId(
        route.itemId,
        language,
        context.variantId as string,
        config.personalize?.scope,
      )
    : "";
  useEffect(() => {
    if (!page.mode.isNormal || !identity || !variant) return;
    void recordPortalPageView(identity, runId, path, {
      page: pageName,
      language,
      pageVariantId: variant,
    });
  }, [identity, runId, path, variant, pageName, language, page.mode.isNormal]);
  return null;
}
