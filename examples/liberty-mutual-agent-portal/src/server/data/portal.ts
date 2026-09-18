import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { Agent, BusinessLine, PortalAction, PortalBootstrap, Submission, BondRequest, Task, Activity, Resource, EligibilityDecision, Product, StateCode } from '../../contracts/portal';
import { activeLicensedStates, evaluateProductEligibility, resolveBondProductId } from '../../domain/eligibility';
import { canAccessResourceStates } from '../../domain/resource-access';
import { RESOURCE_SLUG_ALIASES } from '../../contracts/resource-routes';
import type { PortalSession } from '../auth/session';
import { getProfileIdentifier } from '../auth/profile-identity';
import { PortalError } from '../errors';
import { getStateStore, stateNamespace, type StateStore, type StoredValue } from '../state/store';
import { fixtures } from './fixtures';
import { getResourceCatalog } from './cms-resources';
import { getPack, PACK_METADATA_TTL_SECONDS, packStateKey, type PackMetadata } from './pack-state';

const STATE_RETENTION_SECONDS = 7 * 24 * 60 * 60;
interface AgencyState {
  submissions: Submission[]; bondRequests: BondRequest[]; tasks: Task[]; activity: Activity[];
  favorites: Record<string, string[]>; registrations: Record<string, string[]>;
  appliedActions: Record<string, { hash: string; actor: string }>;
}

function getAgent(session: PortalSession): Agent {
  const agent = fixtures.agents.find((entry) => entry.id === session.agentId && entry.agencyId === session.agencyId);
  if (!agent || !fixtures.manifest.reviewerPacks.includes(session.reviewerPack)) throw new PortalError('UNAUTHENTICATED', 'Please sign in to continue.', 401);
  return agent;
}

function canAccessLine(agent: Agent, line: BusinessLine): boolean {
  const agency = fixtures.agencies.find((entry) => entry.id === agent.agencyId)!;
  return agency.appointedLines.includes(line) && (agent.role === 'principal' || agent.specializations.includes(line));
}

function productEligibility(agent: Agent, product: Product, state: StateCode, effectiveDate?: string): EligibilityDecision {
  const agency = fixtures.agencies.find((entry) => entry.id === agent.agencyId)!;
  return evaluateProductEligibility({ agent, agency, product, state, effectiveDate, eligibility: fixtures.eligibility });
}

function submissionEligibility(agent: Agent, value: Submission): EligibilityDecision {
  const product = fixtures.products.find((entry) => entry.id === value.productId && entry.line === value.line);
  if (!product) return { allowed: false, reason: 'The product for this submission could not be verified.', requirements: [], industries: [] };
  const decision = productEligibility(agent, product, value.state, value.effectiveDate);
  if (!decision.allowed) return decision;
  const owner = fixtures.agents.find((entry) => entry.id === value.assignedAgentId && entry.agencyId === value.agencyId);
  const ownerDecision = owner && productEligibility(owner, product, value.state, value.effectiveDate);
  if (!ownerDecision?.allowed) return { allowed: false, reason: 'The assigned producer is not eligible for this product and state. Ask your relationship team to review the assignment.', requirements: [], industries: [] };
  if (!decision.industries.includes(value.industry)) return { ...decision, allowed: false, reason: 'The business type is no longer available for this product and state. Ask your relationship team to review the account.' };
  return decision;
}

function bondEligibility(agent: Agent, value: Pick<BondRequest, 'bondType' | 'state'>): EligibilityDecision {
  const productId = resolveBondProductId(value.bondType, fixtures.eligibility);
  const product = fixtures.products.find((entry) => entry.id === productId && entry.line === 'surety');
  return product ? productEligibility(agent, product, value.state) : { allowed: false, reason: 'Choose a recognized bond type for this request.', requirements: [], industries: [] };
}

function requireEligibility(decision: EligibilityDecision): EligibilityDecision {
  if (!decision.allowed) throw new PortalError('FORBIDDEN', decision.reason ?? 'This transaction is not currently authorized.', 403);
  return decision;
}

function refreshRequirements(value: Submission, decision: EligibilityDecision): void {
  value.requirements = [...decision.requirements];
  value.completedRequirements = [...new Set(value.completedRequirements)].filter((entry) => decision.requirements.includes(entry));
}

function baseline(agencyId: string): AgencyState {
  const owns = <T extends { agencyId: string }>(items: T[]) => items.filter((item) => item.agencyId === agencyId);
  return structuredClone({ submissions: owns(fixtures.submissions), bondRequests: owns(fixtures.bondRequests), tasks: owns(fixtures.tasks), activity: owns(fixtures.activity), favorites: {}, registrations: {}, appliedActions: {} });
}

async function getPackContext(session: PortalSession, store: StateStore) {
  const agent = getAgent(session);
  const pack = await getPack(store, session.reviewerPack);
  const issuedAt = Date.parse(session.issuedAt);
  if (!Number.isFinite(issuedAt) || (pack.value.restartedAt > 0 && pack.value.restartedAt >= issuedAt)) throw new PortalError('UNAUTHENTICATED', 'Your workspace was restarted. Please sign in again.', 401);
  return { agent, pack };
}

function verifiedProfileIdentity(session: PortalSession, agent: Agent, metadata: PackMetadata): PortalBootstrap['udlIdentity'] {
  if (metadata.profileSet) {
    const identifier = metadata.profileSet.identifiers[agent.id];
    return identifier ? { provider: 'liberty-mutual-agent', id: identifier } : null;
  }
  // Existing imported generations retain their original identity and history.
  const verifiedGenerations = (process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  return verifiedGenerations.includes(String(metadata.profileGeneration))
    ? { provider: 'liberty-mutual-agent', id: getProfileIdentifier(session.reviewerPack, agent.id, metadata.profileGeneration) }
    : null;
}

/** Resolve only the authenticated UDL identifier; no content or agency-state hydration. */
export async function getPortalPersonalizationIdentity(session: PortalSession, store = getStateStore()): Promise<PortalBootstrap['udlIdentity']> {
  const { agent, pack } = await getPackContext(session, store);
  return verifiedProfileIdentity(session, agent, pack.value);
}

async function getContext(session: PortalSession, store: StateStore) {
  const { agent, pack } = await getPackContext(session, store);
  const key = `${stateNamespace()}:pack:${session.reviewerPack}:run:${pack.value.runId}:agency:${agent.agencyId}`;
  const initial = await store.read<AgencyState>(key);
  const record = initial ?? await store.compareAndSet(key, null, baseline(agent.agencyId), STATE_RETENTION_SECONDS) ?? await store.read<AgencyState>(key);
  if (!record) throw new PortalError('STATE_UNAVAILABLE', 'Your workspace could not be opened. Please try again.', 503);
  const resources = await getResourceCatalog();
  return { agent, pack, key, record, resources };
}

function resolveResource(reference: string, resources: Resource[]) {
  return resources.find((resource) => resource.id === reference || resource.href === `/resources/${RESOURCE_SLUG_ALIASES[reference] ?? reference}`);
}

function makeBootstrap(session: PortalSession, agent: Agent, metadata: PackMetadata, record: StoredValue<AgencyState>, editor = false, resources = fixtures.resources): PortalBootstrap {
  const licensedStates = activeLicensedStates(agent, fixtures.eligibility);
  resources = editor ? resources : resources.filter((resource) => canAccessResourceStates(resource.states, licensedStates));
  const agency = fixtures.agencies.find((entry) => entry.id === agent.agencyId)!;
  const allowedLine = (line: BusinessLine) => canAccessLine(agent, line);
  const policies = fixtures.policies.filter((policy) => policy.agencyId === agency.id && allowedLine(policy.line));
  const submissions = record.value.submissions.filter((entry) => allowedLine(entry.line));
  const bondRequests = allowedLine('surety') ? record.value.bondRequests : [];
  const actionEligibility = {
    submissions: Object.fromEntries(submissions.map((entry) => [entry.id, submissionEligibility(agent, entry)])),
    bondRequests: Object.fromEntries(bondRequests.map((entry) => [entry.id, bondEligibility(agent, entry)])),
  };
  const allowedPaths = new Set([...policies.flatMap((item) => [`/policies/${item.id}`, `/renewals/${item.id}`]), ...submissions.map((item) => `/submissions/${item.id}`), ...bondRequests.map((item) => `/surety/${item.id}`)]);
  const profileId = editor ? '' : metadata.profileSet?.identifiers[agent.id] ?? getProfileIdentifier(session.reviewerPack, agent.id, metadata.profileGeneration);
  return structuredClone({
    agent: { ...agent, licensedStates },
    eligibility: { ...fixtures.eligibility, agentAuthorities: fixtures.eligibility.agentAuthorities.filter((entry) => entry.agentId === agent.id), carrierAppointments: fixtures.eligibility.carrierAppointments.filter((entry) => entry.agencyId === agency.id && (!entry.agentId || entry.agentId === agent.id)) },
    actionEligibility,
    agency: { ...agency, production: agency.production.filter((entry) => allowedLine(entry.line)) },
    session: { stateVersion: record.version, runId: metadata.runId, profileId, profileGeneration: metadata.profileGeneration, expiresAt: session.expiresAt },
    udlIdentity: editor ? null : verifiedProfileIdentity(session, agent, metadata),
    asOfDate: fixtures.manifest.asOfDate,
    productionPeriod: fixtures.manifest.productionPeriod,
    products: fixtures.products, policies, submissions: submissions.map((entry) => {
      const value = structuredClone(entry);
      const decision = actionEligibility.submissions[value.id];
      if (decision.allowed) refreshRequirements(value, decision);
      return value;
    }), bondRequests,
    tasks: record.value.tasks.filter((task) => task.assignedAgentId === agent.id || (agent.role === 'principal' && (allowedPaths.has(task.href) || task.kind === 'learning' || task.kind === 'service'))),
    resources, learning: fixtures.learning,
    contacts: fixtures.contacts.filter((entry) => entry.lines.some((line) => allowedLine(line))),
    activity: record.value.activity.filter((entry) => allowedPaths.has(entry.href) || ['/support', '/growth', '/resources', '/learning'].some((path) => entry.href === path || entry.href.startsWith(path + '/'))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    growthCampaign: {
      ...fixtures.growthCampaign,
      resourceIds: [...new Set(fixtures.growthCampaign.resourceIds.map((reference) => resolveResource(reference, resources)?.id).filter((id): id is string => !!id))],
      steps: fixtures.growthCampaign.steps.map((step) => ({ ...step, href: step.href.startsWith('/resources/') ? resolveResource(step.href.split('/').pop()!, resources)?.href ?? step.href : step.href })),
    },
    favorites: [...new Set((record.value.favorites[agent.id] ?? []).map((reference) => resolveResource(reference, resources)?.id).filter((id): id is string => !!id))], registrations: record.value.registrations[agent.id] ?? [],
  });
}

export async function getPortalBootstrap(session: PortalSession, store = getStateStore()): Promise<PortalBootstrap> {
  const context = await getContext(session, store);
  return makeBootstrap(session, context.agent, context.pack.value, context.record, false, context.resources);
}

/** Only the verified Sitecore editing route may call this. No cookie, identity, or state writes. */
export function getEditorBootstrap(): PortalBootstrap {
  const agent = fixtures.agents.find((entry) => entry.id === 'avery')!;
  return makeBootstrap({ agentId: agent.id, agencyId: agent.agencyId, username: '', reviewerPack: '01', sessionId: 'editor', issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z' }, agent,
    { runId: 'editor', profileGeneration: 0, createdAt: 0, restartedAt: 0 },
    { version: 0, expiresAt: 0, value: baseline(agent.agencyId) }, true);
}

function text(value: unknown, label: string, maximum = 200, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new PortalError('INVALID_INPUT', `Enter a valid ${label}.`);
  return value.trim();
}
function date(value: unknown, label: string): string {
  const result = text(value, label, 10);
  const parsed = new Date(result);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result || result < fixtures.manifest.asOfDate || result > '2028-12-31') throw new PortalError('INVALID_INPUT', `Choose a valid ${label} on or after ${fixtures.manifest.asOfDate}.`);
  return result;
}
function number(value: unknown, label: string, maximum: number, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw new PortalError('INVALID_INPUT', `Enter a valid ${label}.`);
  return value;
}
function failNotFound(): never { throw new PortalError('NOT_FOUND', 'That record is not available in your workspace.', 404); }

export async function applyPortalAction(session: PortalSession, input: unknown, store = getStateStore()): Promise<PortalBootstrap> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PortalError('INVALID_INPUT', 'Choose a valid action.');
  const action = input as PortalAction;
  text(action.type, 'action', 50);
  const idempotencyKey = text(action.idempotencyKey, 'request identifier', 100);
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(idempotencyKey)) throw new PortalError('INVALID_INPUT', 'The request identifier is invalid.');
  number(action.expectedVersion, 'workspace version', Number.MAX_SAFE_INTEGER);
  text(action.runId, 'workspace identifier', 80);
  const context = await getContext(session, store);
  if (context.pack.value.runId !== action.runId) throw new PortalError('WORKSPACE_RESET', 'Your workspace was reset. Refresh the page before continuing.', 409);
  const { agent } = context;
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = context.record.value.appliedActions[idempotencyKey];
  if (previous) {
    if (previous.hash !== hash || previous.actor !== agent.id) throw new PortalError('DUPLICATE_REQUEST', 'This request identifier has already been used.', 409);
    return makeBootstrap(session, agent, context.pack.value, context.record, false, context.resources);
  }
  if (context.record.version !== action.expectedVersion) throw new PortalError('VERSION_CONFLICT', 'Your workspace changed in another window. Refresh and try again.', 409);
  const next = structuredClone(context.record.value);
  const timestamp = new Date().toISOString();
  const id = randomUUID();
  const allowed = (line: BusinessLine) => { if (!canAccessLine(agent, line)) throw new PortalError('FORBIDDEN', 'This action is not available for your role or appointment.', 403); };
  const policy = (policyId: string) => {
    const result = fixtures.policies.find((item) => item.id === policyId && item.agencyId === agent.agencyId);
    if (!result) failNotFound();
    allowed(result.line); return result;
  };
  const submission = (submissionId: string) => {
    const result = next.submissions.find((item) => item.id === submissionId && item.agencyId === agent.agencyId);
    if (!result) failNotFound();
    allowed(result.line);
    refreshRequirements(result, requireEligibility(submissionEligibility(agent, result)));
    return result;
  };
  const addActivity = (title: string, detail: string, href: string) => next.activity.unshift({ id: `activity-${id}`, agencyId: agent.agencyId, title, detail, href, createdAt: timestamp });
  const addTask = (title: string, description: string, href: string, kind: Task['kind'], dueDate = fixtures.manifest.asOfDate) => next.tasks.unshift({ id: `task-${id}`, agencyId: agent.agencyId, title, description, href, kind, dueDate, priority: 'Normal', status: 'Open', assignedAgentId: agent.id });
  switch (action.type) {
    case 'save-submission': {
      const product = fixtures.products.find((item) => item.id === action.productId);
      if (!product) failNotFound();
      allowed(product.line);
      if (product.line === 'surety') throw new PortalError('INVALID_INPUT', 'Use a bond request for a surety opportunity.');
      const existing = action.submissionId ? submission(action.submissionId) : undefined;
      if (existing && existing.status !== 'Draft') throw new PortalError('INVALID_TRANSITION', 'Only a draft can be edited. Respond to the requested information for a submitted account.', 409);
      const decision = requireEligibility(productEligibility(agent, product, action.state, action.effectiveDate));
      if (!decision.industries.includes(action.industry)) throw new PortalError('INVALID_INPUT', 'Choose a business type listed for this product and state.');
      if (existing) requireEligibility(submissionEligibility(agent, { ...existing, productId: product.id, line: product.line, state: action.state, industry: action.industry, effectiveDate: action.effectiveDate }));
      const value: Submission = { id: existing?.id ?? `sub-${id}`, agencyId: agent.agencyId, assignedAgentId: existing?.assignedAgentId ?? agent.id,
        accountName: text(action.accountName, 'account name', 120), productId: product.id, line: product.line, state: action.state,
        industry: action.industry, effectiveDate: date(action.effectiveDate, 'effective date'), employeeCount: number(action.employeeCount, 'employee count', 100000),
        annualRevenueCents: number(action.annualRevenueCents, 'annual revenue', 100000000000000), notes: text(action.notes ?? '', 'notes', 2000, true),
        status: 'Draft', updatedAt: timestamp, requirements: [...decision.requirements], completedRequirements: existing?.productId === product.id && existing.state === action.state ? existing.completedRequirements.filter((entry) => decision.requirements.includes(entry)) : [],
        reference: existing?.reference ?? `SUB-${id.slice(0, 8).toUpperCase()}` };
      next.submissions = [value, ...next.submissions.filter((item) => item.id !== value.id)];
      if (!existing) addTask(`Complete ${value.accountName}`, 'Finish the submission preparation checklist', `/submissions/${value.id}`, 'submission');
      addActivity(value.accountName, existing ? 'Submission draft updated' : 'Submission draft started', `/submissions/${value.id}`);
      break;
    }
    case 'complete-requirement': {
      const value = submission(action.submissionId);
      if (!['Draft', 'Information needed'].includes(value.status)) throw new PortalError('INVALID_TRANSITION', 'This submission is already being reviewed.', 409);
      if (!value.requirements.includes(action.requirement)) throw new PortalError('INVALID_INPUT', 'Choose a requirement from this submission.');
      if (!value.completedRequirements.includes(action.requirement)) value.completedRequirements.push(action.requirement);
      value.updatedAt = timestamp;
      if (value.status === 'Information needed' && value.completedRequirements.length === value.requirements.length) {
        value.status = 'In review';
        next.tasks = next.tasks.map((task) => task.href === `/submissions/${value.id}` ? { ...task, status: 'Completed' } : task);
      }
      addActivity(value.accountName, 'Submission information updated', `/submissions/${value.id}`);
      break;
    }
    case 'submit-submission': {
      const value = submission(action.submissionId);
      if (value.status !== 'Draft') throw new PortalError('INVALID_TRANSITION', 'This submission has already been sent for review.', 409);
      if (!value.requirements.every((requirement) => value.completedRequirements.includes(requirement))) throw new PortalError('MISSING_REQUIREMENTS', 'Complete the current preparation checklist before submitting.');
      value.status = 'Submitted'; value.updatedAt = timestamp;
      next.tasks = next.tasks.map((task) => task.href === `/submissions/${value.id}` ? { ...task, status: 'Completed' } : task);
      addActivity(value.accountName, `Submission received · ${value.reference}`, `/submissions/${value.id}`);
      break;
    }
    case 'save-follow-up': {
      const value = policy(action.policyId);
      const title = text(action.title, 'follow-up title', 160);
      addTask(title, text(action.notes ?? '', 'follow-up notes', 2000, true), `/renewals/${value.id}`, 'follow-up', date(action.dueDate, 'follow-up date'));
      addActivity(value.accountName, 'Renewal follow-up saved', `/renewals/${value.id}`);
      break;
    }
    case 'create-service-request': {
      const value = policy(action.policyId);
      if (!['Certificate request', 'Policy change', 'Billing question', 'Claim status'].includes(action.requestType)) throw new PortalError('INVALID_INPUT', 'Choose a service request type.');
      addTask(`${action.requestType}: ${value.accountName}`, text(action.notes, 'request details', 2000), `/policies/${value.id}`, 'service');
      addActivity(value.accountName, `${action.requestType} recorded · SR-${id.slice(0, 8).toUpperCase()}`, `/policies/${value.id}`);
      break;
    }
    case 'complete-task': {
      const value = next.tasks.find((task) => task.id === action.taskId && (task.assignedAgentId === agent.id || agent.role === 'principal'));
      if (!value) failNotFound();
      value.status = 'Completed'; addActivity(value.title, 'Task completed', value.href);
      break;
    }
    case 'save-bond-request': {
      allowed('surety');
      const existing = action.bondRequestId ? next.bondRequests.find((item) => item.id === action.bondRequestId) : undefined;
      if (action.bondRequestId && !existing) failNotFound();
      if (existing) requireEligibility(bondEligibility(agent, existing));
      if (existing && !['Draft', 'Information needed'].includes(existing.status)) throw new PortalError('INVALID_TRANSITION', 'This bond request is already being reviewed.', 409);
      requireEligibility(bondEligibility(agent, { bondType: action.bondType, state: action.state }));
      const value: BondRequest = { id: existing?.id ?? `bond-${id}`, agencyId: agent.agencyId, principal: text(action.principal, 'principal', 120), obligee: text(action.obligee, 'obligee', 160), state: action.state,
        bondType: text(action.bondType, 'bond type', 100), amountCents: number(action.amountCents, 'bond amount', 10000000000000, 1), notes: text(action.notes ?? '', 'notes', 2000, true),
        status: existing?.status ?? 'Draft', updatedAt: timestamp, reference: existing?.reference ?? `BND-${id.slice(0, 8).toUpperCase()}` };
      next.bondRequests = [value, ...next.bondRequests.filter((item) => item.id !== value.id)];
      addActivity(value.principal, 'Bond request updated', `/surety/${value.id}`); break;
    }
    case 'submit-bond-request': {
      allowed('surety');
      const value = next.bondRequests.find((item) => item.id === action.bondRequestId);
      if (!value) failNotFound();
      requireEligibility(bondEligibility(agent, value));
      if (!['Draft', 'Information needed'].includes(value.status)) throw new PortalError('INVALID_TRANSITION', 'This bond request has already been sent for review.', 409);
      value.status = value.status === 'Draft' ? 'Submitted' : 'In review'; value.updatedAt = timestamp;
      next.tasks = next.tasks.map((task) => task.href === `/surety/${value.id}` ? { ...task, status: 'Completed' } : task);
      addActivity(value.principal, `Bond request received · ${value.reference}`, `/surety/${value.id}`); break;
    }
    case 'toggle-favorite': {
      if (!context.resources.some((resource) => resource.id === action.resourceId && canAccessResourceStates(resource.states, activeLicensedStates(agent, fixtures.eligibility)))) failNotFound();
      const favorites = (next.favorites[agent.id] ?? []).map((reference) => resolveResource(reference, context.resources)?.id).filter((resourceId): resourceId is string => !!resourceId);
      next.favorites[agent.id] = favorites.includes(action.resourceId) ? favorites.filter((resourceId) => resourceId !== action.resourceId) : [...favorites, action.resourceId];
      break;
    }
    case 'register-learning': {
      const course = fixtures.learning.find((item) => item.id === action.courseId);
      if (!course) failNotFound();
      const registrations = next.registrations[agent.id] ?? [];
      if (!registrations.includes(course.id)) {
        next.registrations[agent.id] = [...registrations, course.id];
        addTask(course.title, 'Continue your learning path', `/learning/${course.id}`, 'learning');
        addActivity(course.title, 'Added to your learning plan', `/learning/${course.id}`);
      }
      break;
    }
    case 'request-contact': {
      const contact = fixtures.contacts.find((item) => item.id === action.contactId && item.lines.some((line) => canAccessLine(agent, line)));
      if (!contact) failNotFound();
      const topic = text(action.topic, 'conversation topic', 1000);
      addTask(`Conversation with ${contact.name}`, topic, '/support', 'service');
      addActivity(`Conversation with ${contact.name}`, 'Conversation request saved to your workspace', '/support'); break;
    }
    default: throw new PortalError('INVALID_INPUT', 'Choose a valid action.');
  }
  next.appliedActions[idempotencyKey] = { hash, actor: agent.id };
  if (Object.keys(next.appliedActions).length > 1000) throw new PortalError('WORKSPACE_LIMIT', 'This workspace has reached its activity limit. Contact your portal administrator to restore it.', 409);
  const saved = await store.compareAndSet(context.key, context.record.version, next, STATE_RETENTION_SECONDS);
  if (!saved) throw new PortalError('VERSION_CONFLICT', 'Your workspace changed in another window. Refresh and try again.', 409);
  const latestPack = await getPack(store, session.reviewerPack);
  if (latestPack.value.runId !== context.pack.value.runId) throw new PortalError('WORKSPACE_RESET', 'Your workspace was reset. Refresh the page before continuing.', 409);
  return makeBootstrap(session, agent, context.pack.value, saved, false, context.resources);
}

export async function resetReviewerPack(reviewerPack: string, mode: 'saved-work' | 'restart', store = getStateStore()) {
  if (!fixtures.manifest.reviewerPacks.includes(reviewerPack)) throw new PortalError('INVALID_INPUT', 'Choose a valid reviewer pack.');
  if (mode !== 'saved-work') throw new PortalError('INVALID_INPUT', 'A profile restart requires a request ID and the current run. Use the operator restart endpoint.');
  const current = await getPack(store, reviewerPack);
  if (current.value.pendingRestart) throw new PortalError('RESTART_PENDING', 'A profile restart is in progress. Complete it before resetting saved work.', 409);
  const next = { ...current.value, runId: randomUUID(), createdAt: Date.now() };
  const saved = await store.compareAndSet(packStateKey(reviewerPack), current.version, next, PACK_METADATA_TTL_SECONDS);
  if (!saved) throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed. Refresh and try again.', 409);
  return { reviewerPack, mode, runId: next.runId, profileGeneration: next.profileGeneration, clearBrowserIdentity: false };
}

export async function getPolicyDocument(session: PortalSession, policyId: string, documentId: string, store = getStateStore()) {
  const workspace = await getPortalBootstrap(session, store);
  const policy = workspace.policies.find((item) => item.id === policyId);
  const document = policy?.documents.find((item) => item.id === documentId);
  if (!policy || !document) failNotFound();
  const product = fixtures.products.find((item) => item.id === policy.productId)!;
  return { filename: `${policy.policyNumber}-${document.kind.toLowerCase()}.txt`,
    body: `LIBERTY MUTUAL | AGENT PORTAL\n${document.name}\n\nAccount: ${policy.accountName}\nPolicy reference: ${policy.policyNumber}\nProduct: ${product.name}\nState: ${policy.state}\nEffective date: ${policy.effectiveDate}\nExpiration date: ${policy.expirationDate}\n\n${document.kind === 'Checklist' ? 'RENEWAL REVIEW\n1. Confirm account and exposure changes.\n2. Review the current policy information.\n3. Gather outstanding details.\n4. Record follow-up questions with your account team.' : `ACCOUNT REVIEW\n${policy.renewalNote}\n\nThis workspace summary supports an account conversation. Refer to issued policy documents for coverage terms and conditions.`}\n\nPrepared for ${workspace.agency.name}\nAs of ${workspace.asOfDate}\n` };
}
