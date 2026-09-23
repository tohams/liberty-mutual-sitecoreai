/** Public portal contracts. Credentials and storage records never cross this boundary. */
export type StateCode = 'TX' | 'FL' | 'IL';
export type BusinessLine = 'personal' | 'small-commercial' | 'commercial' | 'specialty' | 'surety';
export type AgentRole = 'principal' | 'account-manager' | 'producer' | 'account-executive' | 'surety-specialist' | 'wholesale-broker';
export interface Agent {
  id: string; agencyId: string; firstName: string; lastName: string; name: string;
  role: AgentRole; roleLabel: string; state: StateCode; licensedStates: StateCode[];
  specializations: BusinessLine[]; email: string; initials: string; production: ProductionLine[];
}
export interface ProductionLine {
  line: BusinessLine; label: string; writtenPremiumCents: number; policyCount: number;
  newBusinessPremiumCents: number; priorPeriodPremiumCents: number;
}
export interface Agency {
  id: string; name: string; city: string; state: StateCode; channel: 'independent' | 'wholesale';
  relationshipSince: number; production: ProductionLine[]; appointedLines: BusinessLine[];
}
export interface Product {
  id: string; name: string; line: BusinessLine; description: string; industries: string[];
  states: StateCode[]; requirements: string[]; highlights: string[];
}
/** Published editorial pages reference the separate operational product registry. */
export interface ProductCatalogPage {
  id: string;
  href: string;
  title: string;
  summary: string;
  image?: { src: string; alt: string; width?: number; height?: number };
  productIds: string[];
  channel: 'all' | 'independent' | 'wholesale';
}
export type LegalLineOfAuthority = 'property' | 'casualty' | 'personal-lines' | 'surety';
export type AuthorityStatus = 'active' | 'suspended' | 'revoked';
export interface AuthorityValidity { status: AuthorityStatus; validFrom: string; validThrough: string; }
export interface AgentAuthority extends AuthorityValidity {
  agentId: string; state: StateCode; linesOfAuthority: LegalLineOfAuthority[];
}
export interface CarrierAppointment extends AuthorityValidity {
  agencyId: string; agentId?: string; carrierId: string; state: StateCode; linesOfAuthority: LegalLineOfAuthority[];
}
export interface ProductStateRule extends AuthorityValidity {
  productId: string; state: StateCode; carrierId: string;
  appointmentScope: 'agency' | 'producer' | 'both';
  requiredLinesOfAuthority: LegalLineOfAuthority[]; industries: string[]; requirements: string[];
}
/** Versioned synthetic transaction rules, separate from educational content relevance. */
export interface EligibilitySnapshot {
  schemaVersion: 1; provenance: string;
  agentAuthorities: AgentAuthority[]; carrierAppointments: CarrierAppointment[];
  productRules: ProductStateRule[]; bondProducts: Record<string, string>;
}
export interface EligibilityDecision {
  allowed: boolean; reason?: string; requirements: string[]; industries: string[];
}
export interface PortalActionEligibility {
  submissions: Record<string, EligibilityDecision>;
  bondRequests: Record<string, EligibilityDecision>;
}
export interface Policy {
  id: string; agencyId: string; accountId: string; accountName: string; productId: string;
  line: BusinessLine; state: StateCode; policyNumber: string; effectiveDate: string;
  expirationDate: string; premiumCents: number; status: 'Active' | 'Renewal review';
  assignedAgentId: string; address: string; renewalNote: string;
  documents: { id: string; name: string; kind: string }[];
}
export type SubmissionStatus = 'Draft' | 'Submitted' | 'Information needed' | 'In review' | 'Quote available';
export interface Submission {
  id: string; agencyId: string; accountName: string; productId: string; line: BusinessLine;
  state: StateCode; industry: string; status: SubmissionStatus; updatedAt: string;
  assignedAgentId: string; effectiveDate: string; employeeCount: number; annualRevenueCents: number;
  notes: string; requirements: string[]; completedRequirements: string[]; reference: string;
}
export interface BondRequest {
  id: string; agencyId: string; principal: string; obligee: string; state: StateCode;
  bondType: string; amountCents: number; status: 'Draft' | 'Submitted' | 'Information needed' | 'In review';
  updatedAt: string; reference: string; notes: string;
}
export interface Task {
  id: string; agencyId: string; title: string; description: string; dueDate: string;
  priority: 'High' | 'Normal'; status: 'Open' | 'Completed'; assignedAgentId: string;
  href: string; kind: 'renewal' | 'submission' | 'follow-up' | 'service' | 'learning' | 'surety';
}
export interface Resource {
  id: string; title: string; description: string; body: string; line: BusinessLine | 'all';
  href?: string; states: StateCode[]; type: string;
  readMinutes: number; updatedAt: string; tags: string[]; sourceUrl?: string;
}
export interface LearningCourse {
  id: string; title: string; description: string; line: BusinessLine; durationMinutes: number;
  format: 'On demand' | 'Workshop'; lessons: string[];
}
export interface RelationshipContact {
  id: string; name: string; title: string; initials: string; lines: BusinessLine[];
  email: string; phone: string; availability: string;
}
export interface Activity {
  id: string; agencyId: string; title: string; detail: string; createdAt: string; href: string;
}
export interface GrowthCampaign {
  id: string; title: string; description: string; agencyGoal: string; audienceLabel: string;
  steps: { id: string; title: string; description: string; href: string }[];
  resourceIds: string[]; courseIds: string[];
}
export interface PortalBootstrap {
  agent: Agent; agency: Agency;
  eligibility: EligibilitySnapshot; actionEligibility: PortalActionEligibility;
  session: { stateVersion: number; runId: string; profileId: string; profileGeneration: number; expiresAt: string };
  udlIdentity: { provider: 'liberty-mutual-agent'; id: string } | null;
  asOfDate: string; productionPeriod: { start: string; end: string; label: string; currency: 'USD' };
  products: Product[]; policies: Policy[]; submissions: Submission[]; bondRequests: BondRequest[];
  tasks: Task[]; resources: Resource[]; learning: LearningCourse[]; contacts: RelationshipContact[];
  activity: Activity[]; growthCampaign: GrowthCampaign; favorites: string[]; registrations: string[];
}
export type PortalAction = (
  | { type: 'save-submission'; submissionId?: string; accountName: string; productId: string; state: StateCode; industry: string; effectiveDate: string; employeeCount: number; annualRevenueCents: number; notes?: string }
  | { type: 'submit-submission'; submissionId: string }
  | { type: 'complete-requirement'; submissionId: string; requirement: string }
  | { type: 'save-follow-up'; policyId: string; title: string; dueDate: string; notes?: string }
  | { type: 'create-service-request'; policyId: string; requestType: 'Certificate request' | 'Policy change' | 'Billing question' | 'Claim status'; notes: string }
  | { type: 'complete-task'; taskId: string }
  | { type: 'save-bond-request'; bondRequestId?: string; principal: string; obligee: string; state: StateCode; bondType: string; amountCents: number; notes?: string }
  | { type: 'submit-bond-request'; bondRequestId: string }
  | { type: 'toggle-favorite'; resourceId: string }
  | { type: 'register-learning'; courseId: string }
  | { type: 'request-contact'; contactId: string; topic: string }
) & { expectedVersion: number; idempotencyKey: string; runId: string };
export interface PortalApiError { error: { code: string; message: string }; }
