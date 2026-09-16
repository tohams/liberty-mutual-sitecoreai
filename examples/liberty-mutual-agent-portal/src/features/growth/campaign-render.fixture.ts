import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SitecoreProviderReactContext,
  type Page,
} from "@sitecore-content-sdk/nextjs";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import {
  AppPlaceholder,
  type ComponentMap,
  type RouteData,
} from "@sitecore-content-sdk/nextjs";
import { Default as CampaignPage } from "@/components/campaign/CampaignPage";
import { Default as CampaignHero } from "@/components/campaign/CampaignHero";
import { Default as CampaignCallout } from "@/components/campaign/CampaignCallout";
import { Default as CampaignAlert } from "@/components/campaign/CampaignAlert";
import { Default as CampaignAccordion } from "@/components/campaign/CampaignAccordion";
import { Default as CampaignContact } from "@/components/campaign/CampaignContact";
import { Default as CampaignLinkList } from "@/components/campaign/CampaignLinkList";
import { getPortalPlaceholders } from "../portal/portal-placeholders";
import contacts from "../../../fixtures/relationship-team.json";
import type { PortalBootstrap } from "@/contracts/portal";
import { PortalApp } from "../portal/PortalApp";
import agents from "../../../fixtures/agents.json";
import agencies from "../../../fixtures/agencies.json";
import products from "../../../fixtures/products.json";
import eligibility from "../../../fixtures/eligibility.json";
import growthCampaign from "../../../fixtures/growth-campaign.json";

const agent = agents.find((item) => item.id === "jordan")!;
const data = {
  agent,
  agency: agencies.find((item) => item.id === agent.agencyId),
  products,
  eligibility,
  growthCampaign,
  asOfDate: "2026-09-10T12:00:00Z",
  productionPeriod: {
    start: "2025-09-01",
    end: "2026-08-31",
    label: "Past year",
    currency: "USD",
  },
  session: {
    stateVersion: 0,
    runId: "spotlight-render-test",
    profileId: "",
    profileGeneration: 0,
    expiresAt: "2026-09-11T12:00:00Z",
  },
  udlIdentity: null,
  policies: [],
  submissions: [],
  bondRequests: [],
  tasks: [],
  resources: [],
  learning: [],
  contacts: contacts.filter((item) => item.lines.includes("small-commercial")),
  activity: [],
  favorites: [],
  registrations: [],
  actionEligibility: { submissions: {}, bondRequests: {} },
} as PortalBootstrap;

const map: ComponentMap = new Map([
  ["CampaignPage", { Default: CampaignPage }],
  ["CampaignHero", { Default: CampaignHero }],
  ["CampaignCallout", { Default: CampaignCallout }],
  ["CampaignAlert", { Default: CampaignAlert }],
  ["CampaignAccordion", { Default: CampaignAccordion }],
  ["CampaignContact", { Default: CampaignContact }],
  ["CampaignLinkList", { Default: CampaignLinkList }],
]);
const link = {
  value: {
    href: "/resources/build-a-bop-submission",
    text: "Prepare a BOP submission",
  },
};
function routeData(empty = false): RouteData {
  return {
    name: "small-business",
    itemId: "campaign-page",
    placeholders: {
      "headless-campaign-page": [
        {
          componentName: "CampaignPage",
          uid: "native-campaign",
          params: { DynamicPlaceholderId: "1" },
          placeholders: empty
            ? {}
            : {
                "headless-campaign-hero-{*}": [
                  {
                    componentName: "CampaignHero",
                    uid: "native-hero",
                    fields: {
                      eyebrow: { value: "BUILD YOUR NEXT CHAPTER" },
                      title: { value: "Small business. Shared ambition." },
                      summary: {
                        value:
                          "A practical path from opportunity to preparation.",
                      },
                      icon: { value: "briefcase" },
                    },
                  },
                ],
                "headless-campaign-main-{*}": [
                  {
                    componentName: "CampaignAlert",
                    uid: "native-alert",
                    fields: {
                      title: { value: "Make room for your next conversation" },
                      body: {
                        value:
                          "<p>Explore <strong>practical preparation</strong> with your team.</p>",
                      },
                    },
                  },
                  {
                    componentName: "CampaignCallout",
                    uid: "native-callout-variant",
                    params: { RenderingIdentifier: "growth-opportunity" },
                    fields: {
                      title: {
                        value:
                          "Turn a promising introduction into a stronger submission",
                      },
                      body: {
                        value:
                          "<p>Start with the <strong>client’s next step</strong>.</p>",
                      },
                      actionLink: link,
                    },
                  },
                  {
                    componentName: "CampaignAccordion",
                    uid: "native-accordion",
                    params: { RenderingIdentifier: "growth-questions" },
                    fields: {
                      title: { value: "How should I prepare?" },
                      body: {
                        value:
                          "<p>Bring your account details and questions.</p>",
                      },
                    },
                  },
                  {
                    componentName: "CampaignContact",
                    uid: "misplaced-contact",
                    fields: { title: { value: "WRONG SLOT" } },
                  },
                ],
                "headless-campaign-sidebar-{*}": [
                  {
                    componentName: "CampaignLinkList",
                    uid: "native-links",
                    fields: {
                      title: { value: "Keep the right guidance close" },
                      icon: { value: "book" },
                      link1: link,
                    },
                  },
                  {
                    componentName: "CampaignContact",
                    uid: "native-contact",
                    params: { RenderingIdentifier: "growth-contact" },
                    fields: {
                      title: { value: "Plan your next growth conversation" },
                      summary: { value: "Put your ambitions on the agenda." },
                      buttonLabel: { value: "Request a growth conversation" },
                    },
                  },
                ],
              },
        },
      ],
    },
  };
}
function render({
  query = "state=IL",
  editing = false,
  empty = false,
  bootstrap = data,
  route = routeData(empty),
  child,
}: {
  query?: string;
  editing?: boolean;
  empty?: boolean;
  bootstrap?: PortalBootstrap;
  route?: RouteData;
  child?: ReactNode;
} = {}) {
  const page = {
    locale: "en",
    layout: { sitecore: { context: {}, route } },
    mode: {
      name: editing ? "edit" : "normal",
      isEditing: editing,
      isPreview: false,
      isNormal: !editing,
      isDesignLibrary: false,
      designLibrary: { isVariantGeneration: false },
    },
  } as Page;
  const placement = getPortalPlaceholders(
    "/growth/small-business",
    route,
    page.mode,
  ).campaignPage!;
  const app = createElement(PortalApp, {
    initialData: bootstrap,
    route: "/growth/small-business",
    isEditing: editing,
    pageContent:
      child ??
      createElement(AppPlaceholder, { ...placement, page, componentMap: map }),
  });
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      {
        value: {
          back() {},
          forward() {},
          refresh() {},
          push() {},
          replace() {},
          prefetch() {},
          bfcacheId: "campaign",
        },
      },
      createElement(
        PathnameContext.Provider,
        { value: "/growth/small-business" },
        createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams(query) },
          createElement(
            SitecoreProviderReactContext.Provider,
            {
              value: {
                page,
                componentMap: map,
                loadImportMap: async () => ({ default: [] }),
              },
            },
            app,
          ),
        ),
      ),
    ),
  );
}

test("the authored campaign replaces the operational growth screen and preserves native nested rendering", () => {
  const html = render();
  assert.match(html, /Small business. Shared ambition./);
  assert.match(html, /<strong>practical preparation<\/strong>/);
  assert.match(html, /Back to agency growth/);
  assert.doesNotMatch(
    html,
    /Total written premium|Your business mix|WRONG SLOT/,
  );
  for (const anchor of [
    "growth-opportunity",
    "growth-questions",
    "growth-contact",
  ]) {
    assert.match(html, new RegExp(`href="#${anchor}"`));
    assert.equal(
      (html.match(new RegExp(`id="${anchor}"`, "g")) ?? []).length,
      1,
    );
  }
  assert.match(html, /<details[^>]*id="growth-questions"[^>]*><summary>/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /aria-controls="agency-growth-pages"/);
  assert.match(
    html,
    /aria-current="page" href="\/growth\/small-business\?state=IL"/,
  );
});

test("authoring retains nested insertion chrome, editable accordion bodies and native variant UIDs", () => {
  const html = render({ editing: true });
  assert.match(html, /id="native-callout-variant"/);
  assert.match(html, /<details[^>]* open=""/);
  assert.match(html, /Display window \(UTC\)/);
  assert.match(html, /This controls alert visibility, not publishing/);
  const blank = render({ editing: true, empty: true });
  for (const slot of ["hero", "main", "sidebar"])
    assert.match(blank, new RegExp(`headless-campaign-${slot}`));
  assert.match(blank, /sc-jss-empty-placeholder/);
});

test("campaign actions carry licensed risk state and never a forged Florida state", () => {
  assert.match(
    render(),
    /href="\/resources\/build-a-bop-submission\?state=IL"/,
  );
  assert.match(
    render({ query: "" }),
    /href="\/resources\/build-a-bop-submission\?state=TX"/,
  );
  const forged = render({ query: "state=FL" });
  assert.doesNotMatch(forged, /href="[^"]*[?&](?:amp;)?state=FL/);
  assert.match(forged, /href="\/resources\/build-a-bop-submission"/);
  assert.equal(link.value.href, "/resources/build-a-bop-submission");
});

test("contact form is scoped to authorized small-business contacts and never sends outside the portal", () => {
  const html = render();
  assert.match(html, /Request a growth conversation/);
  assert.match(html, /name="topic" required="" minLength="3" maxLength="1000"/);
  assert.match(html, /Save conversation request/);
  assert.match(html, /Your request is saved with your agency priorities/);
  const noContact = render({ bootstrap: { ...data, contacts: [] } });
  assert.match(noContact, /Meet your relationship team/);
  assert.doesNotMatch(noContact, />Request a growth conversation</);
  assert.match(
    render({ editing: true }),
    /class="button button-primary" disabled=""/,
  );
});

test("scheduled alerts stay hidden on the deterministic initial response while editors can still edit them", () => {
  const route = routeData();
  const parent = route.placeholders["headless-campaign-page"][0];
  const alert = parent.placeholders!["headless-campaign-main-{*}"][0];
  alert.fields = { ...alert.fields, startsAt: { value: "20990101T000000Z" } };
  assert.doesNotMatch(
    render({ route }),
    /Make room for your next conversation/,
  );
  assert.match(
    render({ route, editing: true }),
    /Make room for your next conversation/,
  );
});
