import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  Agency,
  Agent,
  EligibilitySnapshot,
  PortalBootstrap,
  Product,
  Submission,
} from "@/contracts/portal";
import agents from "../../../fixtures/agents.json";
import agencies from "../../../fixtures/agencies.json";
import products from "../../../fixtures/products.json";
import eligibility from "../../../fixtures/eligibility.json";
import { PortalContext } from "../portal/portal-context";
import { SubmissionForm } from "./SubmissionForm";

function render({
  saved,
  queryState,
  noLicenses = false,
}: {
  saved?: Submission;
  queryState?: string;
  noLicenses?: boolean;
}) {
  const agent = {
    ...agents.find((entry) => entry.id === "jordan")!,
    ...(noLicenses ? { licensedStates: [] } : {}),
  } as Agent;
  const data: PortalBootstrap = {
    agent,
    agency: agencies.find((entry) => entry.id === agent.agencyId) as Agency,
    products: products as Product[],
    eligibility: eligibility as EligibilitySnapshot,
    asOfDate: "2026-09-10T12:00:00Z",
    session: {
      stateVersion: 0,
      runId: "render-test",
      profileId: "",
      profileGeneration: 0,
      expiresAt: "2026-09-11T12:00:00Z",
    },
    udlIdentity: null,
    productionPeriod: {
      start: "2025-09-01",
      end: "2026-08-31",
      label: "Past year",
      currency: "USD",
    },
    policies: [],
    submissions: saved ? [saved] : [],
    bondRequests: [],
    tasks: [],
    resources: [],
    learning: [],
    contacts: [],
    activity: [],
    favorites: [],
    registrations: [],
    growthCampaign: {
      id: "render-test",
      title: "",
      description: "",
      agencyGoal: "",
      audienceLabel: "",
      steps: [],
      resourceIds: [],
      courseIds: [],
    },
    actionEligibility: {
      submissions: saved
        ? {
            [saved.id]: {
              allowed: false,
              reason:
                "Your current licenses do not authorize transactions in this state.",
              industries: [],
              requirements: [],
            },
          }
        : {},
      bondRequests: {},
    },
  };
  return renderToStaticMarkup(
    createElement(
      PortalContext.Provider,
      {
        value: {
          data,
          busy: false,
          act: async () => null,
          notify: () => undefined,
        },
      },
      createElement(SubmissionForm, {
        submission: saved,
        queryState,
        onSaved: () => undefined,
      }),
    ),
  );
}

test("a Florida record viewed by a Texas/Illinois actor stays Florida and cannot be saved", () => {
  const html = render({
    saved: {
      id: "florida-draft",
      productId: "bop",
      state: "FL",
      industry: "Contractors",
      effectiveDate: "2026-10-01",
    } as Submission,
  });
  const stateSelect =
    html.match(/<select name="state"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? "";
  assert.match(stateSelect, /<option value="FL" disabled="" selected="">/);
  assert.doesNotMatch(stateSelect, /<option value="TX"[^>]*selected=/);
  assert.match(html, /saved risk state has not been changed/);
  assert.match(
    html,
    /<button[^>]*disabled=""[^>]*>Continue to account information/,
  );
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/);
});

test("an invalid state hint does not silently choose the home state", () => {
  const html = render({ queryState: "FL" });
  const stateSelect =
    html.match(/<select name="state"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? "";
  assert.match(
    stateSelect,
    /<option value="" selected="">Choose a licensed state/,
  );
  assert.doesNotMatch(stateSelect, /<option value="TX"[^>]*selected=/);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/);
});

test("no eligible license/product shows a useful empty state with no save action", () => {
  const html = render({ noLicenses: true });
  assert.match(html, /No products are currently available/);
  assert.doesNotMatch(html, /<form|type="submit"/);
});
