"use client";

import { useEffect } from "react";

/** Marks a painted, hydrated preview without changing the customer-facing UI. */
export function PersonalizationPreviewRenderReady() {
  useEffect(() => {
    let cancelled = false;
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;
    const root = document.documentElement;
    root.setAttribute("data-personalization-preview-ready", "false");
    root.removeAttribute("data-personalization-preview-rendered-ms");
    root.setAttribute(
      "data-personalization-preview-start-visibility",
      document.visibilityState,
    );

    const markReady = () => {
      if (cancelled) return;
      const elapsed = performance.now();
      try {
        performance.mark("personalization-preview-rendered");
        performance.measure("personalization-preview-render", {
          start: 0,
          end: elapsed,
        });
      } catch {
        // The readiness marker remains available if User Timing is unavailable.
      }
      root.setAttribute(
        "data-personalization-preview-rendered-ms",
        elapsed.toFixed(1),
      );
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      if (navigation && navigation.responseStart > 0)
        root.setAttribute(
          "data-personalization-preview-navigation-ttfb-ms",
          Math.max(0, navigation.responseStart - navigation.startTime).toFixed(
            1,
          ),
        );
      root.setAttribute(
        "data-personalization-preview-visibility",
        document.visibilityState,
      );
      root.setAttribute("data-personalization-preview-ready", "true");
    };

    const fontsReady = document.fonts?.ready || Promise.resolve();
    void fontsReady
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(markReady);
        });
      });

    return () => {
      cancelled = true;
      if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, []);
  return null;
}
