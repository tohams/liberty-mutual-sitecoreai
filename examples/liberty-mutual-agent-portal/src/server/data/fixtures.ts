import 'server-only';
import agents from '../../../fixtures/agents.json';
import agencies from '../../../fixtures/agencies.json';
import products from '../../../fixtures/products.json';
import policies from '../../../fixtures/policies.json';
import submissions from '../../../fixtures/submissions.json';
import bondRequests from '../../../fixtures/bond-requests.json';
import tasks from '../../../fixtures/tasks.json';
import resources from '../../../fixtures/resources.json';
import learning from '../../../fixtures/learning.json';
import contacts from '../../../fixtures/relationship-team.json';
import activity from '../../../fixtures/activity.json';
import growthCampaign from '../../../fixtures/growth-campaign.json';
import manifest from '../../../fixtures/manifest.json';
import eligibility from '../../../fixtures/eligibility.json';
import { evaluateProductEligibility, resolveBondProductId } from '../../domain/eligibility';
import type { Agency, Agent, Product, Policy, Submission, BondRequest, Task, Resource, LearningCourse, RelationshipContact, Activity, GrowthCampaign, PortalBootstrap, EligibilitySnapshot } from '../../contracts/portal';

export interface PortalFixtures {
  agents: Agent[]; agencies: Agency[]; products: Product[]; policies: Policy[];
  submissions: Submission[]; bondRequests: BondRequest[]; tasks: Task[];
  resources: Resource[]; learning: LearningCourse[]; contacts: RelationshipContact[];
  activity: Activity[]; growthCampaign: GrowthCampaign;
  eligibility: EligibilitySnapshot;
  manifest: { schemaVersion: number; asOfDate: string; productionPeriod: PortalBootstrap['productionPeriod']; provenance: string; reviewerPacks: string[] };
}

/** Validate versioned integration seeds at the adapter boundary before exposing them. */
export function validateFixtures(data: PortalFixtures): void {
  if (data.manifest.schemaVersion !== 1) throw new Error('Unsupported portal fixture schema.');
  const collections = [data.agents, data.agencies, data.products, data.policies, data.submissions, data.bondRequests, data.tasks, data.resources, data.learning, data.contacts, data.activity];
  for (const collection of collections) {
    if (!Array.isArray(collection)) throw new Error('Invalid fixture collection.');
    const ids = new Set<string>();
    for (const record of collection) {
      if (!record || typeof record.id !== 'string' || !/^[a-z0-9-]+$/.test(record.id) || ids.has(record.id)) throw new Error('Invalid or duplicate fixture identifier.');
      ids.add(record.id);
    }
  }
  const findAgency = (id: string) => data.agencies.find((agency) => agency.id === id);
  const states = new Set(['TX', 'FL', 'IL']);
  const lines = new Set(['personal', 'small-commercial', 'commercial', 'specialty', 'surety']);
  const date = (value: string) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime()) && new Date(value).toISOString().slice(0, 10) === value;
  const authority = data.eligibility;
  if (!authority || authority.schemaVersion !== 1 || !authority.provenance || !Array.isArray(authority.agentAuthorities) || !Array.isArray(authority.carrierAppointments) || !Array.isArray(authority.productRules) || !authority.bondProducts) throw new Error('Invalid eligibility fixture schema.');
  const legalLines = new Set(['property', 'casualty', 'personal-lines', 'surety']);
  const ruleKeys = new Set<string>();
  for (const rule of [...authority.agentAuthorities, ...authority.carrierAppointments, ...authority.productRules]) {
    if (!states.has(rule.state) || !['active', 'suspended', 'revoked'].includes(rule.status) || !date(rule.validFrom) || !date(rule.validThrough) || rule.validFrom > rule.validThrough) throw new Error('Invalid dated eligibility rule.');
    const required = 'requiredLinesOfAuthority' in rule ? rule.requiredLinesOfAuthority : rule.linesOfAuthority;
    if (!Array.isArray(required) || !required.length || !required.every((line) => legalLines.has(line))) throw new Error('Invalid legal lines of authority.');
    const key = 'carrierId' in rule && 'agencyId' in rule ? `appointment:${rule.agencyId}:${rule.agentId ?? 'agency'}:${rule.carrierId}:${rule.state}` : 'productId' in rule ? `product:${rule.productId}:${rule.state}` : `agent:${rule.agentId}:${rule.state}`;
    if (ruleKeys.has(key)) throw new Error('Duplicate eligibility rule.');
    ruleKeys.add(key);
    if ('agentId' in rule && rule.agentId && !data.agents.some((agent) => agent.id === rule.agentId && agent.licensedStates.includes(rule.state) && (!('agencyId' in rule) || agent.agencyId === rule.agencyId))) throw new Error('Invalid agent authority relationship.');
    if ('agencyId' in rule && (!findAgency(rule.agencyId) || !rule.carrierId)) throw new Error('Invalid carrier appointment relationship.');
    if ('productId' in rule && (!data.products.some((product) => product.id === rule.productId && product.states.includes(rule.state)) || !rule.carrierId || !['agency', 'producer', 'both'].includes(rule.appointmentScope) || !Array.isArray(rule.industries) || !rule.industries.length || !Array.isArray(rule.requirements) || !rule.requirements.length || ![...rule.industries, ...rule.requirements].every((value) => typeof value === 'string' && value.trim()))) throw new Error('Invalid product eligibility relationship.');
  }
  for (const agent of data.agents) {
    if (!findAgency(agent.agencyId) || !states.has(agent.state) || !agent.licensedStates.every((state) => states.has(state)) || !agent.specializations.every((line) => lines.has(line))) throw new Error(`Invalid agent relationship: ${agent.id}`);
  }
  for (const agency of data.agencies) {
    for (const production of agency.production) {
      if (!lines.has(production.line) || ![production.writtenPremiumCents, production.priorPeriodPremiumCents, production.newBusinessPremiumCents, production.policyCount].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error(`Invalid production: ${agency.id}`);
      const agentPremium = data.agents.filter((agent) => agent.agencyId === agency.id).reduce((total, agent) => total + (agent.production.find((line) => line.line === production.line)?.writtenPremiumCents ?? 0), 0);
      if (agentPremium !== production.writtenPremiumCents) throw new Error(`Agent production does not reconcile to agency production: ${agency.id}`);
    }
  }
  for (const product of data.products) {
    if (!lines.has(product.line) || !product.states.every((state) => states.has(state)) || !product.requirements.length) throw new Error(`Invalid product: ${product.id}`);
    if (!product.states.every((state) => ruleKeys.has(`product:${product.id}:${state}`))) throw new Error(`Missing product eligibility rule: ${product.id}`);
  }
  for (const record of [...data.policies, ...data.submissions]) {
    const product = data.products.find((entry) => entry.id === record.productId);
    const owner = data.agents.find((entry) => entry.id === record.assignedAgentId);
    if (!findAgency(record.agencyId) || !product || product.line !== record.line || !owner || owner.agencyId !== record.agencyId || !states.has(record.state) || !date(record.effectiveDate)) throw new Error(`Invalid insurance record relationship: ${record.id}`);
    const decision = evaluateProductEligibility({ agent: owner, agency: findAgency(record.agencyId)!, product, state: record.state, eligibility: authority, at: data.manifest.asOfDate });
    if (!decision.allowed) throw new Error(`Invalid insurance record authority or availability: ${record.id}`);
  }
  for (const policy of data.policies) {
    if (!date(policy.expirationDate) || policy.effectiveDate >= policy.expirationDate || !Number.isSafeInteger(policy.premiumCents) || policy.premiumCents < 0) throw new Error(`Invalid policy dates or premium: ${policy.id}`);
  }
  for (const submission of data.submissions) {
    if (!['Draft', 'Submitted', 'Information needed', 'In review', 'Quote available'].includes(submission.status) || !submission.completedRequirements.every((item) => submission.requirements.includes(item))) throw new Error(`Invalid submission status: ${submission.id}`);
    const rule = authority.productRules.find((entry) => entry.productId === submission.productId && entry.state === submission.state)!;
    if (!rule.industries.includes(submission.industry) || submission.requirements.length !== rule.requirements.length || !rule.requirements.every((requirement) => submission.requirements.includes(requirement))) throw new Error(`Invalid submission state requirements: ${submission.id}`);
  }
  for (const task of data.tasks) {
    const owner = data.agents.find((entry) => entry.id === task.assignedAgentId);
    if (!owner || owner.agencyId !== task.agencyId || !date(task.dueDate)) throw new Error(`Invalid task relationship: ${task.id}`);
  }
  for (const bond of data.bondRequests) {
    if (!findAgency(bond.agencyId) || !states.has(bond.state) || !Number.isSafeInteger(bond.amountCents) || bond.amountCents <= 0 || !['Draft', 'Submitted', 'Information needed', 'In review'].includes(bond.status)) throw new Error(`Invalid bond request: ${bond.id}`);
    const productId = resolveBondProductId(bond.bondType, authority);
    const product = data.products.find((entry) => entry.id === productId && entry.line === 'surety');
    if (!product || !data.agents.some((agent) => agent.agencyId === bond.agencyId && evaluateProductEligibility({ agent, agency: findAgency(bond.agencyId)!, product, state: bond.state, eligibility: authority, at: data.manifest.asOfDate }).allowed)) throw new Error(`Invalid bond request authority or availability: ${bond.id}`);
  }
  for (const resource of data.resources) {
    if (!date(resource.updatedAt) || !resource.states.every((state) => states.has(state)) || typeof resource.body !== 'string') throw new Error(`Invalid resource: ${resource.id}`);
  }
}

export const fixtures = { agents, agencies, products, policies, submissions, bondRequests, tasks, resources, learning, contacts, activity, growthCampaign, manifest, eligibility } as unknown as PortalFixtures;
validateFixtures(fixtures);
