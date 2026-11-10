import { isGuideHref, plainGuideText } from "../guide-text";
import type { GuideLink } from "../types";
import type { DemoStep } from "./types";

type LaunchSource = Pick<DemoStep, "links">;

/** Only the loop's explicit starting destinations become copyable launch URLs. */
export function demoLaunchUrls(step: LaunchSource): GuideLink[] {
  const destinations = new Map<string, GuideLink>();
  const add = ({ label, href }: GuideLink) => {
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
      destinations.set(url.href, { label: name, href });
  };
  step.links?.forEach(add);
  return [...destinations.values()];
}
