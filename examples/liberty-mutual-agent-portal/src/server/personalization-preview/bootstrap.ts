import "server-only";
import type { PortalBootstrap, ProductionLine } from "@/contracts/portal";
import { getEditorBootstrap } from "../data/portal";

function production(
  line: ProductionLine["line"],
  label: string,
  writtenPremiumCents: number,
): ProductionLine {
  return {
    line,
    label,
    writtenPremiumCents,
    priorPeriodPremiumCents: writtenPremiumCents,
    policyCount: 0,
    newBusinessPremiumCents: 0,
  };
}

/** Fixed inert rendering shell; selected native receipts supply all personalized content. */
export function getPersonalizationPreviewBootstrap(): PortalBootstrap {
  const base = structuredClone(getEditorBootstrap());
  const state = "TX";
  const licensedStates: PortalBootstrap["agent"]["licensedStates"] = [
    "TX",
    "FL",
    "IL",
  ];
  const total = 100_000_000;
  const smallCommercial = 15_000_000;
  const agencyId = "personalization-preview-agency";
  return {
    ...base,
    agent: {
      id: "personalization-preview",
      agencyId,
      firstName: "Content",
      lastName: "Preview",
      name: "Content Preview",
      initials: "CP",
      email: "",
      role: "producer",
      roleLabel: "Preview",
      state,
      licensedStates,
      specializations: ["small-commercial"],
      production: [
        production("small-commercial", "Small commercial", 6_000_000),
      ],
    },
    agency: {
      id: agencyId,
      name: "Independent agency",
      city: "",
      state,
      channel: "independent",
      relationshipSince: Number(base.asOfDate.slice(0, 4)),
      appointedLines: [],
      production: [
        production("personal", "Personal", total - smallCommercial),
        production("small-commercial", "Small commercial", smallCommercial),
      ],
    },
    eligibility: {
      schemaVersion: 1,
      provenance: "Read-only personalization preview context",
      agentAuthorities: [],
      carrierAppointments: [],
      productRules: [],
      bondProducts: {},
    },
    actionEligibility: { submissions: {}, bondRequests: {} },
    session: {
      ...base.session,
      stateVersion: 0,
      runId: "editor",
      profileId: "",
      profileGeneration: 0,
    },
    udlIdentity: null,
    products: [],
    policies: [],
    submissions: [],
    bondRequests: [],
    tasks: [],
    resources: [],
    learning: [],
    contacts: [],
    activity: [],
    favorites: [],
    registrations: [],
    growthCampaign: {
      id: "personalization-preview",
      title: "Agency growth",
      description: "",
      agencyGoal: "",
      audienceLabel: "",
      steps: [],
      resourceIds: [],
      courseIds: [],
    },
  };
}
