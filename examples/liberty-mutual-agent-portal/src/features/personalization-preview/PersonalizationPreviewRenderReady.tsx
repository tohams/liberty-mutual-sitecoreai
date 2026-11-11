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
