import {
  GRAPHQL_EXPLORER,
  PORTAL,
  PUBLIC,
  SCRUNCH_REVIEW,
  SITECORE_AI,
} from "./demo-destinations";

export const demoTabNames = {
  publicWebsite: "Public website",
  averyPortal: "Avery portal",
  danielPortal: "Daniel portal",
  sitecoreAI: "SitecoreAI",
  pageBuilder: "Page Builder",
  personalizationPreview: "Personalization Preview",
  searchPreview: "Search Preview",
  events: "Events",
  graphqlExplorer: "GraphQL Explorer",
  profiles: "Profiles",
  brandKit: "Brand Kit",
  prosperaRecommendations: "Prospera recommendations",
  prosperaPageBuilder: "Prospera Page Builder",
} as const;

export type DemoTabId = keyof typeof demoTabNames;

export interface DemoTab {
  id: DemoTabId;
  href?: string;
  navigation?: string;
  cue: string;
}

export interface DemoTabGroup {
  id: string;
  title: string;
  note: string;
  tabs: DemoTab[];
  wide?: boolean;
}

/** Reuse the named tabs throughout the thirteen flows instead of accumulating tabs. */
export const customerDemoTabGroups: DemoTabGroup[] = [
  {
    id: "public-visitor",
    title: "Public visitor window",
    note: "Use its own browser profile for the public customer journey.",
    tabs: [
      {
        id: "publicWebsite",
        href: `${PUBLIC}/`,
        cue: "Keep Home ready; P1 begins with Search in the header.",
      },
    ],
  },
  {
    id: "daniel",
    title: "Daniel window",
    note: "Use a separate browser profile for Daniel’s producer baseline, shown first in A1.",
    tabs: [
      {
        id: "danielPortal",
        href: `${PORTAL}/login`,
        cue: "Sign in as daniel.01 with the agent portal password; leave the portal home open.",
      },
    ],
  },
  {
    id: "avery",
    title: "Avery window",
    note: "Use another browser profile for Avery’s principal contrast, shown second in A1.",
    tabs: [
      {
        id: "averyPortal",
        navigation:
          "Reuse the **Daniel portal** login address from the **Daniel window** in another browser profile.",
        cue: "Sign in as avery.01 with the agent portal password; leave the portal home open. Stay with Avery for Profiles and the native personalization test.",
      },
    ],
  },
  {
    id: "sitecore",
    title: "SitecoreAI window",
    note: "Use your presenter account throughout. It can edit, submit, approve, and publish; explain that separate roles normally control those actions.",
    wide: true,
    tabs: [
      {
        id: "sitecoreAI",
        href: SITECORE_AI,
        cue: "Start at Channels. Reuse this SitecoreAI tab for each native tool when its loop begins.",
      },
      {
        id: "pageBuilder",
        navigation: "**Channels → Public Website → Page builder**.",
        cue: "Keep the Page Builder tab opened from Channels, and reuse it for both sites. In A1, open Agency priorities’ native rule Builder in this tab.",
      },
      {
        id: "personalizationPreview",
        navigation:
          "**Page Builder → Site switcher → Agent Portal → Editor → Pages → Home → Apps → Personalization Preview**.",
        cue: "Check the Agency growth priorities and Producer priorities variants before presenting. Preview page opens each result directly. Allow pop-ups, then return all selectors to Default. Reuse Page Builder for A4.",
      },
      {
        id: "searchPreview",
        navigation:
          "**Content → Search Sources → Liberty Mutual Approved Answers → Preview**.",
        cue: "Use this view in P3, then return after publication to verify the added sentence.",
      },
      {
        id: "events",
        navigation:
          "Expand the navigation if collapsed, then choose **Optimization → Analytics → Events**.",
        cue: "Select Site → liberty-mutual-public-site and Time → 1 month. Under Event Type, select pageView and LM_PUBLIC_CTA_CLICK for P6.",
      },
      {
        id: "graphqlExplorer",
        href: GRAPHQL_EXPLORER,
        cue: "For P7, use Copy HTTP headers in the guide to configure HTTP HEADERS. This queries Live Experience Edge, not Preview. Leave the Explorer ready.",
      },
      {
        id: "profiles",
        navigation: "**Optimization → Profiles**.",
        cue: "After Daniel’s portal baseline and Avery’s contrast in A1, open Avery Brooks - 01. Use her Client ID for the native personalization test.",
      },
      {
        id: "brandKit",
        navigation: "**Design → Brand kits**.",
        cue: "Open Liberty Mutual — Independent Agents, marked PUBLISHED, then choose Sections → Tone of Voice.",
      },
    ],
  },
  {
    id: "prospera",
    title: "Prospera window · Incognito / Private",
    note: "For P5 only: Sales Engineers 1 → agverticals → Prospera. Keep the recommendation and its Page Builder view read-only.",
    wide: true,
    tabs: [
      {
        id: "prosperaRecommendations",
        href: SCRUNCH_REVIEW,
        cue: "Keep Home → Readability & Clarity → Cards · Description ready.",
      },
      {
        id: "prosperaPageBuilder",
        navigation:
          "In **Prospera recommendations**, open **Home → Readability & Clarity → Cards · Description**, then choose the **page-opening icon** to the right of **Select**.",
        cue: "Use the Page Builder tab opened by that icon to inspect AEO opportunities and the matching Cards · Description field.",
      },
    ],
  },
];
