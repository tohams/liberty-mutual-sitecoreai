import {
  ANALYTICS,
  BRAND_KITS,
  CONTEXT,
  GRAPHQL_EXPLORER,
  PORTAL,
  PUBLIC,
  SCRUNCH_EDITOR,
  SCRUNCH_REVIEW,
  SEARCH_SOURCE,
  publicEditor,
} from "./demo-destinations";

export const demoTabNames = {
  publicWebsite: "Public website",
  averyPortal: "Avery portal",
  danielPortal: "Daniel portal",
  authorPageBuilder: "Author Page Builder",
  approverPageBuilder: "Approver Page Builder",
  publisherPageBuilder: "Publisher Page Builder",
  searchPreview: "Search Preview",
  events: "Events",
  graphqlExplorer: "GraphQL Explorer",
  profiles: "Profiles",
  stateBusinessRule: "State business rule",
  brandKit: "Brand Kit",
  prosperaRecommendations: "Prospera recommendations",
  prosperaPageBuilder: "Prospera Page Builder",
} as const;

export type DemoTabId = keyof typeof demoTabNames;

export interface DemoTab {
  id: DemoTabId;
  href: string;
  cue: string;
}

export interface DemoTabGroup {
  id: string;
  title: string;
  note: string;
  tabs: DemoTab[];
  wide?: boolean;
}

export const nativeProfilesUrl = `https://app.sitecorecloud.io/optimization/profiles?${CONTEXT}`;

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
    id: "avery",
    title: "Avery window",
    note: "Use a separate browser profile to preserve Avery’s agent session.",
    tabs: [
      {
        id: "averyPortal",
        href: `${PORTAL}/login`,
        cue: "Sign in as avery.01 with Sitecore1; leave Home open.",
      },
    ],
  },
  {
    id: "daniel",
    title: "Daniel window",
    note: "Use another browser profile to preserve Daniel’s agent session.",
    tabs: [
      {
        id: "danielPortal",
        href: `${PORTAL}/login`,
        cue: "Sign in as daniel.01 with Sitecore1; leave Home open.",
      },
    ],
  },
  {
    id: "author",
    title: "Author window",
    note: "Sitecore account: tohams+author@gmail.com.",
    tabs: [
      {
        id: "authorPageBuilder",
        href: publicEditor,
        cue: "Confirm Public Website, English, and Default editing host.",
      },
    ],
  },
  {
    id: "approver",
    title: "Approver window",
    note: "Use a separate Sitecore profile: tohams+approver@gmail.com.",
    tabs: [
      {
        id: "approverPageBuilder",
        href: publicEditor,
        cue: "Keep Page Builder ready for the submitted page and content reviews.",
      },
    ],
  },
  {
    id: "publisher",
    title: "Publisher window",
    note: "Use your Sitecore administrator profile for publication and native platform views.",
    wide: true,
    tabs: [
      {
        id: "publisherPageBuilder",
        href: publicEditor,
        cue: "Reuse this tab for the Page Builder destinations named in each flow.",
      },
      {
        id: "searchPreview",
        href: SEARCH_SOURCE,
        cue: "Keep the public Search source’s Preview view ready for P3.",
      },
      {
        id: "events",
        href: ANALYTICS,
        cue: "Select Site → liberty-mutual-public-site and Time → 1 month. Under Event Type, select pageView and LM_PUBLIC_CTA_CLICK for P6.",
      },
      {
        id: "graphqlExplorer",
        href: GRAPHQL_EXPLORER,
        cue: "For P7, use Copy HTTP headers in the guide to configure HTTP HEADERS. This queries Live Experience Edge, not Preview. Leave the Explorer ready.",
      },
      {
        id: "profiles",
        href: nativeProfilesUrl,
        cue: "Use the native profile filters to find Avery and Daniel with number 01 appended to their names. Keep their SitecoreAI profile records ready for A1.",
      },
      {
        id: "stateBusinessRule",
        href: `https://app.sitecorecloud.io/optimization/custom-values/ad7b493b-f768-404c-adc6-9841c2fe1a6e?${CONTEXT}`,
        cue: "For A1, keep the published Liberty Mutual - Agency product priorities custom value ready. Its Texas and Illinois licensing conditions use known agent attributes. Leave the rule unchanged.",
      },
      {
        id: "brandKit",
        href: BRAND_KITS,
        cue: "Open Published → Liberty Mutual — Independent Agents → Sections → Tone of Voice.",
      },
    ],
  },
  {
    id: "prospera",
    title: "Prospera window · Incognito / Private",
    note: "For P5 only: Sales Engineers 1 → agverticals → Prospera. Keep both tabs read-only.",
    wide: true,
    tabs: [
      {
        id: "prosperaRecommendations",
        href: SCRUNCH_REVIEW,
        cue: "Keep Home → Readability & Clarity → Cards · Description ready.",
      },
      {
        id: "prosperaPageBuilder",
        href: SCRUNCH_EDITOR,
        cue: "Keep AEO opportunities and the matching Cards · Description field ready.",
      },
    ],
  },
];
