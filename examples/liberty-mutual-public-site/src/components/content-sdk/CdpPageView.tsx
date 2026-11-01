"use client";
import { useEffect } from "react";
import { CdpHelper, useSitecore } from "@sitecore-content-sdk/nextjs";
import { pageView } from "@sitecore-content-sdk/events";
import config from "sitecore.config";
import { CONSENT_EVENT, trackingAllowed } from "src/features/consent/consent";
import {
  ensurePublicAnalytics,
  recordPublicEvent,
} from "src/features/analytics/public-analytics";
import { createScrollMilestoneTracker } from "src/features/analytics/scroll-milestones";

export default function CdpPageView() {
  const { page } = useSitecore();
  const { route, context } = page.layout.sitecore;
  const normal = page.mode.isNormal;
  const routeId = route?.itemId;
  const routeName = route?.name;
  const language = route?.itemLanguage || config.defaultLanguage;
  const variantId = String(context.variantId || "");
  const siteName = page.siteName;
  useEffect(() => {
    if (!normal || !routeId || process.env.NODE_ENV === "development") return;
    let sent = false;
    const measure = async () => {
      if (sent || !trackingAllowed()) return;
      const ready = ensurePublicAnalytics(siteName);
      if (!ready) return;
      try {
        await ready;
        if (sent || !trackingAllowed()) return;
        sent = true;
        await pageView({
          channel: "WEB",
          currency: "USD",
          page: routeName,
          language,
          pageVariantId: CdpHelper.getPageVariantId(
            routeId,
            language,
            variantId,
            config.personalize?.scope,
          ),
        });
      } catch {
        /* Optional measurement never interrupts the visitor's task. */
      }
    };
    void measure();
    window.addEventListener(CONSENT_EVENT, measure);
    const measureScroll = createScrollMilestoneTracker();
    const scroll = () => {
      if (!trackingAllowed()) return;
      for (const milestone of measureScroll({
        scrollTop: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      }))
        void recordPublicEvent(`SCROLL_${milestone}`, {
          percent: milestone,
          contentId: routeId,
        });
    };
    const click = (event: MouseEvent) => {
      if (!trackingAllowed()) return;
      const element =
        event.target instanceof Element
          ? event.target.closest("a.public-button, a.public-text-link")
          : null;
      if (element instanceof HTMLAnchorElement)
        void recordPublicEvent("CTA_CLICK", {
          label: element.textContent?.trim() || "",
          destination: element.pathname,
          contentId: routeId,
        });
    };
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("click", click);
    return () => {
      window.removeEventListener(CONSENT_EVENT, measure);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("click", click);
    };
  }, [normal, routeId, routeName, language, variantId, siteName]);
  return null;
}
