import type {
  Agency,
  Agent,
  AuthorityValidity,
  EligibilityDecision,
  EligibilitySnapshot,
  Product,
  StateCode,
} from "../contracts/portal";

export interface ProductEligibilityInput {
  agent: Agent;
  agency: Agency;
  product: Product;
  state: StateCode;
  eligibility: EligibilitySnapshot;
  at?: string | Date;
  effectiveDate?: string;
}
export type ProductAvailabilityInput = Omit<
  ProductEligibilityInput,
  "agent" | "agency"
>;

const STATES: readonly StateCode[] = ["TX", "FL", "IL"];
const LEGAL_LINES = new Set([
  "property",
  "casualty",
  "personal-lines",
  "surety",
]);
const denied = (reason: string): EligibilityDecision => ({
  allowed: false,
  reason,
  requirements: [],
  industries: [],
});

function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validOn(record: AuthorityValidity, day: string): boolean {
  return (
    record.status === "active" &&
    calendarDate(record.validFrom) &&
    calendarDate(record.validThrough) &&
    record.validFrom <= record.validThrough &&
    record.validFrom <= day &&
    record.validThrough >= day
  );
}

/** Product catalog availability is independent of an agent's transactional authority. */
export function evaluateProductAvailability(
  input: ProductAvailabilityInput,
): EligibilityDecision {
  const { product, state, eligibility, effectiveDate } = input;
  const now = input.at === undefined ? new Date() : new Date(input.at);
  if (!Number.isFinite(now.getTime()))
    return denied("Current product availability could not be verified.");
  const today = now.toISOString().slice(0, 10);
  if (
    !eligibility ||
    eligibility.schemaVersion !== 1 ||
    !Array.isArray(eligibility.productRules)
  )
    return denied(
      "Product availability is not configured. Contact your relationship team.",
    );
  if (!STATES.includes(state) || !product.states.includes(state))
    return denied("This product is not available in the selected state.");

  const rules = eligibility.productRules.filter(
    (rule) => rule.productId === product.id && rule.state === state,
  );
  if (rules.length !== 1)
    return denied(
      "Product availability for this state could not be verified. Contact your relationship team.",
    );
  const rule = rules[0];
  if (!validOn(rule, today))
    return denied(
      "This product is not currently available in the selected state.",
    );
  if (
    effectiveDate !== undefined &&
    (!calendarDate(effectiveDate) || !validOn(rule, effectiveDate))
  )
    return denied(
      "This product is not available for the requested effective date.",
    );
  if (
    !rule.carrierId ||
    !Array.isArray(rule.requiredLinesOfAuthority) ||
    !rule.requiredLinesOfAuthority.length ||
    !rule.requiredLinesOfAuthority.every((line) => LEGAL_LINES.has(line)) ||
    !["agency", "producer", "both"].includes(rule.appointmentScope) ||
    !Array.isArray(rule.industries) ||
    !rule.industries.length ||
    !rule.industries.every(
      (value) => typeof value === "string" && value.trim(),
    ) ||
    !Array.isArray(rule.requirements) ||
    !rule.requirements.length ||
    !rule.requirements.every(
      (value) => typeof value === "string" && value.trim(),
    )
  )
    return denied(
      "Product requirements for this state could not be verified. Contact your relationship team.",
    );
  return {
    allowed: true,
    requirements: [...new Set(rule.requirements)],
    industries: [...new Set(rule.industries)],
  };
}

/** Evaluate transaction authority. Browsing rights and policy servicing are separate decisions. */
export function evaluateProductEligibility(
  input: ProductEligibilityInput,
): EligibilityDecision {
  const { agent, agency, product, state, eligibility } = input;
  const now = input.at === undefined ? new Date() : new Date(input.at);
  if (!Number.isFinite(now.getTime()))
    return denied("Current transaction authority could not be verified.");
  const today = now.toISOString().slice(0, 10);
  if (
    !eligibility ||
    eligibility.schemaVersion !== 1 ||
    !Array.isArray(eligibility.agentAuthorities) ||
    !Array.isArray(eligibility.carrierAppointments)
  )
    return denied(
      "Transaction authority is not configured. Contact your relationship team.",
    );
  if (
    agent.agencyId !== agency.id ||
    !agency.appointedLines.includes(product.line) ||
    (agent.role !== "principal" &&
      !agent.specializations.includes(product.line))
  )
    return denied(
      "This product is not available for your role or agency appointment.",
    );
  if (!STATES.includes(state) || !agent.licensedStates.includes(state))
    return denied(
      "Your current licenses do not authorize transactions in this state.",
    );
  const availability = evaluateProductAvailability({ ...input, at: now });
  if (!availability.allowed) return availability;
  const rule = eligibility.productRules.find(
    (entry) => entry.productId === product.id && entry.state === state,
  )!;

  const authorities = eligibility.agentAuthorities.filter(
    (record) => record.agentId === agent.id && record.state === state,
  );
  if (
    authorities.length !== 1 ||
    !validOn(authorities[0], today) ||
    !Array.isArray(authorities[0].linesOfAuthority) ||
    !authorities[0].linesOfAuthority.every((line) => LEGAL_LINES.has(line)) ||
    !rule.requiredLinesOfAuthority.every((line) =>
      authorities[0].linesOfAuthority?.includes(line),
    )
  )
    return denied(
      "An active license with the required lines of authority is needed for this state.",
    );
  const subjects =
    rule.appointmentScope === "both"
      ? ["agency", "producer"]
      : [rule.appointmentScope];
  for (const subject of subjects) {
    const appointments = eligibility.carrierAppointments.filter(
      (record) =>
        record.agencyId === agency.id &&
        record.carrierId === rule.carrierId &&
        record.state === state &&
        (subject === "agency"
          ? record.agentId === undefined
          : record.agentId === agent.id),
    );
    if (
      appointments.length !== 1 ||
      !validOn(appointments[0], today) ||
      !Array.isArray(appointments[0].linesOfAuthority) ||
      !appointments[0].linesOfAuthority.every((line) =>
        LEGAL_LINES.has(line),
      ) ||
      !rule.requiredLinesOfAuthority.every((line) =>
        appointments[0].linesOfAuthority?.includes(line),
      )
    )
      return denied(
        `An active ${subject === "agency" ? "agency" : "producer"} carrier appointment with the required authority is needed for this state.`,
      );
  }
  return availability;
}

export function eligibleProductStates(
  input: Omit<ProductEligibilityInput, "state">,
): StateCode[] {
  return [...new Set(input.agent.licensedStates)].filter(
    (state) => evaluateProductEligibility({ ...input, state }).allowed,
  );
}

/** Current license relevance, independent of a particular product or carrier appointment. */
export function activeLicensedStates(
  agent: Pick<Agent, "id" | "licensedStates">,
  eligibility: EligibilitySnapshot,
  at?: string | Date,
): StateCode[] {
  const now = at === undefined ? new Date() : new Date(at);
  if (
    !Number.isFinite(now.getTime()) ||
    eligibility?.schemaVersion !== 1 ||
    !Array.isArray(eligibility?.agentAuthorities)
  )
    return [];
  const today = now.toISOString().slice(0, 10);
  return [...new Set(agent.licensedStates)].filter((state) => {
    const records = eligibility.agentAuthorities.filter(
      (entry) => entry.agentId === agent.id && entry.state === state,
    );
    return (
      STATES.includes(state) &&
      records.length === 1 &&
      validOn(records[0], today) &&
      Array.isArray(records[0].linesOfAuthority) &&
      records[0].linesOfAuthority.length > 0 &&
      records[0].linesOfAuthority.every((line) => LEGAL_LINES.has(line))
    );
  });
}

/** Explicit mapping keeps legacy saved bond types usable without accepting unknown types. */
export function resolveBondProductId(
  bondType: string,
  eligibility: EligibilitySnapshot,
): string | undefined {
  if (
    !eligibility?.bondProducts ||
    !Object.prototype.hasOwnProperty.call(eligibility.bondProducts, bondType)
  )
    return undefined;
  const value = eligibility.bondProducts[bondType];
  return typeof value === "string" && value ? value : undefined;
}
