import type { AgentRole, StateCode } from "@/contracts/portal";
import type { AudiencePreviewInput } from "./types";

export const ROLE_OPTIONS: ReadonlyArray<{ value: AgentRole; label: string }> =
  [
    { value: "principal", label: "Principal" },
    { value: "producer", label: "Producer" },
    { value: "account-manager", label: "Account manager" },
    { value: "account-executive", label: "Account executive" },
    { value: "surety-specialist", label: "Surety specialist" },
    { value: "wholesale-broker", label: "Wholesale broker" },
  ];
export const STATE_OPTIONS: ReadonlyArray<{ value: StateCode; label: string }> =
  [
    { value: "TX", label: "Texas" },
    { value: "FL", label: "Florida" },
    { value: "IL", label: "Illinois" },
  ];

export const AUDIENCE_PREVIEW_BUSINESS_DEFAULTS = Object.freeze({
  specializesInSmallCommercial: true,
  agencySmallCommercialSharePercent: 15,
  agencyTotalWrittenPremiumUsd: 1_000_000,
  agentSmallCommercialWrittenPremiumUsd: 60_000,
});

/** Builds native profile attributes only; native SitecoreAI rules select the experience. */
export function createAudiencePreviewInput(
  role: AgentRole,
  licensedStates: readonly StateCode[],
): AudiencePreviewInput {
  if (
    !ROLE_OPTIONS.some((option) => option.value === role) ||
    licensedStates.length === 0 ||
    new Set(licensedStates).size !== licensedStates.length ||
    licensedStates.some(
      (state) => !STATE_OPTIONS.some((option) => option.value === state),
    )
  ) {
    throw new Error("Choose a role and at least one licensed state.");
  }
  return {
    role,
    licensedStates: STATE_OPTIONS.map((option) => option.value).filter(
      (state) => licensedStates.includes(state),
    ),
    ...AUDIENCE_PREVIEW_BUSINESS_DEFAULTS,
  };
}

/** All selectable audiences, sharing the normal native profile hash and preparation pipeline. */
export const AUDIENCE_PREVIEW_SCENARIOS: readonly AudiencePreviewInput[] =
  Object.freeze(
    ROLE_OPTIONS.flatMap((role) =>
      Array.from({ length: (1 << STATE_OPTIONS.length) - 1 }, (_, index) =>
        createAudiencePreviewInput(
          role.value,
          STATE_OPTIONS.filter(
            (_state, bit) => ((index + 1) & (1 << bit)) !== 0,
          ).map((state) => state.value),
        ),
      ),
    ),
  );

export const DEFAULT_AUDIENCE_PREVIEW_INPUT = createAudiencePreviewInput(
  "principal",
  ["TX", "IL"],
);
