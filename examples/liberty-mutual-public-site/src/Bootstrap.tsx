"use client";
import { useEffect } from "react";
import { CONSENT_EVENT } from "src/features/consent/consent";
import { ensurePublicAnalytics } from "src/features/analytics/public-analytics";

export default function Bootstrap({
  siteName,
  isPreviewMode,
}: {
  siteName: string;
  isPreviewMode: boolean;
}) {
  useEffect(() => {
    if (isPreviewMode || process.env.NODE_ENV === "development") return;
    const initialize = () => {
      void ensurePublicAnalytics(siteName)?.catch(() => undefined);
    };
    initialize();
    window.addEventListener(CONSENT_EVENT, initialize);
    return () => window.removeEventListener(CONSENT_EVENT, initialize);
  }, [siteName, isPreviewMode]);
  return null;
}
