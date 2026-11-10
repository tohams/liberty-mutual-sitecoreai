import "server-only";
import type {
  AgentRole,
  PortalBootstrap,
  ProductionLine,
} from "@/contracts/portal";
import { getEditorBootstrap } from "../data/portal";
import { validateAudiencePreviewInput } from "./contracts";

const roleLabels: Record<AgentRole, string> = {
  principal: "Principal",
  producer: "Producer",
  "account-manager": "Account manager",
  "account-executive": "Account executive",
  "surety-specialist": "Surety specialist",
  "wholesale-broker": "Wholesale broker",
};

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

/** Read-only rendering context. Native personalization has already selected the CMS content. */
export function getAudiencePreviewBootstrap(input: unknown): PortalBootstrap {
  const audience = validateAudiencePreviewInput(input);
  const base = structuredClone(getEditorBootstrap());
  const state = audience.licensedStates[0] || "TX";
  const total = Math.round(audience.agencyTotalWrittenPremiumUsd * 100);
  const smallCommercial = Math.round(
    (total * audience.agencySmallCommercialSharePercent) / 100,
  );
  const agencyId = "audience-preview-agency";
  return {
    ...base,
    agent: {
      id: "audience-preview",
      agencyId,
      firstName: "Audience",
      lastName: "Preview",
      name: "Audience Preview",
      initials: "AP",
      email: "",
      role: audience.role,
      roleLabel: roleLabels[audience.role],
      state,
      licensedStates: [...audience.licensedStates],
      specializations: audience.specializesInSmallCommercial
        ? ["small-commercial"]
        : [],
      production: [
        production(
          "small-commercial",
          "Small commercial",
          Math.round(audience.agentSmallCommercialWrittenPremiumUsd * 100),
        ),
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
      provenance: "Read-only audience preview context",
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
      id: "audience-preview",
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
