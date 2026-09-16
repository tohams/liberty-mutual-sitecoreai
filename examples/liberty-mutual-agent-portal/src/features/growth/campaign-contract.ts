import { HIDDEN_RENDERING_NAME } from "@sitecore-content-sdk/content";
import type { ComponentRendering } from "@sitecore-content-sdk/nextjs";

export const CAMPAIGN_SLOTS = {
  hero: { name: "headless-campaign-hero", components: ["CampaignHero"] },
  main: {
    name: "headless-campaign-main",
    components: ["CampaignAlert", "CampaignCallout", "CampaignAccordion"],
  },
  sidebar: {
    name: "headless-campaign-sidebar",
    components: ["CampaignLinkList", "CampaignContact"],
  },
} as const;

/** Preserve native UIDs, selected variants and editing chrome while enforcing slot boundaries. */
export function campaignPlaceholder(
  rendering: ComponentRendering,
  slot: keyof typeof CAMPAIGN_SLOTS,
  editing: boolean,
) {
  const dynamicId = rendering.params?.DynamicPlaceholderId;
  if (!dynamicId || !/^\d+$/.test(dynamicId)) return undefined;
  const setting = CAMPAIGN_SLOTS[slot];
  const name = `${setting.name}-${dynamicId}`;
  const pattern = `${setting.name}-{*}`;
  const placeholders = rendering.placeholders ?? {};
  const key = Object.hasOwn(placeholders, pattern)
    ? pattern
    : Object.hasOwn(placeholders, name)
      ? name
      : pattern;
  const contents = (placeholders[key] ?? []).filter(
    (component) =>
      (setting.components as readonly string[]).includes(
        component.componentName,
      ) ||
      (editing && component.componentName === HIDDEN_RENDERING_NAME),
  );
  return {
    name,
    rendering: { ...rendering, placeholders: { [key]: contents } },
  };
}

export type CampaignWindow = "active" | "scheduled" | "expired" | "invalid";

/** Sitecore DateTime values are UTC; invalid or reversed windows never display publicly. */
export function campaignDate(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  const iso = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`
    : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(iso)) return NaN;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 19) === iso.slice(0, 19)
    ? parsed
    : NaN;
}

export function campaignWindow(
  startsAt: string | undefined,
  endsAt: string | undefined,
  now: number,
): CampaignWindow {
  const start = campaignDate(startsAt);
  const end = campaignDate(endsAt);
  if (
    !Number.isFinite(now) ||
    (start !== undefined && !Number.isFinite(start)) ||
    (end !== undefined && !Number.isFinite(end)) ||
    (start !== undefined && end !== undefined && end <= start)
  )
    return "invalid";
  if (start !== undefined && now < start) return "scheduled";
  if (end !== undefined && now >= end) return "expired";
  return "active";
}
