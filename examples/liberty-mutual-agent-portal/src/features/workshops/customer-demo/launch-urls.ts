import { guideTextParts, isGuideHref, plainGuideText } from "../guide-text";
import type { GuideLink } from "../types";
import type { DemoStep } from "./types";

type LaunchSource = Pick<DemoStep, "links" | "actions" | "presenterActions">;

/** Keep each destination once, including URLs embedded beside individual clicks. */
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
  for (const line of [...step.presenterActions.flat(), ...step.actions]) {
    for (const part of guideTextParts(line)) {
      if (part.kind === "link")
        add({
          label: part.children.map((child) => child.text).join(""),
          href: part.href,
        });
    }
  }
  return [...destinations.values()];
}
