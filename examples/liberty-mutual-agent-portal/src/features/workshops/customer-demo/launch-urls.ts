import { isGuideHref, plainGuideText } from "../guide-text";
import type { DemoLaunchLink, DemoStep } from "./types";

type LaunchSource = Pick<DemoStep, "links">;

/** Keep each explicit destination at its authored cue; do not infer extra URLs. */
export function demoLaunchUrls(step: LaunchSource): DemoLaunchLink[] {
  const destinations = new Map<string, DemoLaunchLink>();
  const add = (link: DemoLaunchLink) => {
    const { label, href } = link;
    if (!isGuideHref(href)) return;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return;
    }
    if (
      url.protocol !== "https:" ||
      /^\/(?:demo|workshops?)(?:\/|$)/.test(url.pathname) ||
      [...url.searchParams.keys()].some((name) =>
        /secret|token|api.?key|authorization/i.test(name),
      )
    )
      return;
    const name = plainGuideText(label).trim();
    if (name && !destinations.has(url.href))
      destinations.set(url.href, { ...link, label: name });
  };
  step.links?.forEach(add);
  return [...destinations.values()];
}
