import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { Agent, BusinessLine, PortalAction, PortalBootstrap, Submission, BondRequest, Task, Activity, Resource } from '../../contracts/portal';
import { RESOURCE_SLUG_ALIASES } from '../../contracts/resource-routes';
import type { PortalSession } from '../auth/session';
import { getProfileIdentifier } from '../auth/profile-identity';
import { PortalError } from '../errors';
import { getStateStore, stateNamespace, type StateStore, type StoredValue } from '../state/store';
import { fixtures } from './fixtures';
import { getResourceCatalog } from './cms-resources';

const STATE_TTL_SECONDS = 7 * 24 * 60 * 60;
const METADATA_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;
interface PackMetadata { runId: string; profileGeneration: number; createdAt: number; restartedAt: number; }
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

function baseline(agencyId: string): AgencyState {
  const owns = <T extends { agencyId: string }>(items: T[]) => items.filter((item) => item.agencyId === agencyId);
  return structuredClone({ submissions: owns(fixtures.submissions), bondRequests: owns(fixtures.bondRequests), tasks: owns(fixtures.tasks), activity: owns(fixtures.activity), favorites: {}, registrations: {}, appliedActions: {} });
}

async function getPack(store: StateStore, reviewerPack: string): Promise<StoredValue<PackMetadata>> {
  const key = `${stateNamespace()}:pack:${reviewerPack}`;
  const existing = await store.read<PackMetadata>(key);
  if (existing) return existing;
  const created = await store.compareAndSet<PackMetadata>(key, null, { runId: randomUUID(), profileGeneration: 0, createdAt: Date.now(), restartedAt: 0 }, METADATA_TTL_SECONDS);
  const result = created ?? await store.read<PackMetadata>(key);
  if (!result) throw new PortalError('STATE_UNAVAILABLE', 'Your workspace could not be opened. Please try again.', 503);
  return result;
}

async function getPackContext(session: PortalSession, store: StateStore) {
  const agent = getAgent(session);
  const pack = await getPack(store, session.reviewerPack);
  const issuedAt = Date.parse(session.issuedAt);
  if (!Number.isFinite(issuedAt) || pack.value.restartedAt > issuedAt) throw new PortalError('UNAUTHENTICATED', 'Your workspace was restarted. Please sign in again.', 401);
  const remainingSeconds = Math.ceil((pack.value.createdAt + STATE_TTL_SECONDS * 1000 - Date.now()) / 1000);
  if (remainingSeconds <= 0) throw new PortalError('WORKSPACE_EXPIRED', 'This workspace has expired. Contact your portal administrator to restore it.', 409);
  return { agent, pack, remainingSeconds };
}

function verifiedProfileIdentity(session: PortalSession, agent: Agent, metadata: PackMetadata): PortalBootstrap['udlIdentity'] {
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
  const { agent, pack, remainingSeconds } = await getPackContext(session, store);
  const key = `${stateNamespace()}:pack:${session.reviewerPack}:run:${pack.value.runId}:agency:${agent.agencyId}`;
  const initial = await store.read<AgencyState>(key);
  const record = initial ?? await store.compareAndSet(key, null, baseline(agent.agencyId), remainingSeconds) ?? await store.read<AgencyState>(key);
  if (!record) throw new PortalError('STATE_UNAVAILABLE', 'Your workspace could not be opened. Please try again.', 503);
  const resources = await getResourceCatalog();
  return { agent, pack, key, record, remainingSeconds, resources };
}

function resolveResource(reference: string, resources: Resource[]) {
  return resources.find((resource) => resource.id === reference || resource.href === `/resources/${RESOURCE_SLUG_ALIASES[reference] ?? reference}`);
}

function makeBootstrap(session: PortalSession, agent: Agent, metadata: PackMetadata, record: StoredValue<AgencyState>, editor = false, resources = fixtures.resources): PortalBootstrap {
  const agency = fixtures.agencies.find((entry) => entry.id === agent.agencyId)!;
  const allowedLine = (line: BusinessLine) => canAccessLine(agent, line);
  const policies = fixtures.policies.filter((policy) => policy.agencyId === agency.id && allowedLine(policy.line));
  const submissions = record.value.submissions.filter((entry) => allowedLine(entry.line));
  const bondRequests = allowedLine('surety') ? record.value.bondRequests : [];
  const allowedPaths = new Set([...policies.flatMap((item) => [`/policies/${item.id}`, `/renewals/${item.id}`]), ...submissions.map((item) => `/submissions/${item.id}`), ...bondRequests.map((item) => `/surety/${item.id}`)]);
  const profileId = editor ? '' : getProfileIdentifier(session.reviewerPack, agent.id, metadata.profileGeneration);
  return structuredClone({
    agent,
    agency: { ...agency, production: agency.production.filter((entry) => allowedLine(entry.line)) },
    session: { stateVersion: record.version, runId: metadata.runId, profileId, profileGeneration: metadata.profileGeneration, expiresAt: session.expiresAt },
    udlIdentity: editor ? null : verifiedProfileIdentity(session, agent, metadata),
    asOfDate: fixtures.manifest.asOfDate,
    productionPeriod: fixtures.manifest.productionPeriod,
    products: fixtures.products, policies, submissions, bondRequests,
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
    allowed(result.line); return result;
  };
  const addActivity = (title: string, detail: string, href: string) => next.activity.unshift({ id: `activity-${id}`, agencyId: agent.agencyId, title, detail, href, createdAt: timestamp });
  const addTask = (title: string, description: string, href: string, kind: Task['kind'], dueDate = fixtures.manifest.asOfDate) => next.tasks.unshift({ id: `task-${id}`, agencyId: agent.agencyId, title, description, href, kind, dueDate, priority: 'Normal', status: 'Open', assignedAgentId: agent.id });
  switch (action.type) {
    case 'save-submission': {
      const product = fixtures.products.find((item) => item.id === action.productId);
      if (!product) failNotFound();
      allowed(product.line);
      if (product.line === 'surety') throw new PortalError('INVALID_INPUT', 'Use a bond request for a surety opportunity.');
      if (!agent.licensedStates.includes(action.state) || !product.states.includes(action.state)) throw new PortalError('FORBIDDEN', 'Choose a state available for this account and your appointment.', 403);
      if (!product.industries.includes(action.industry)) throw new PortalError('INVALID_INPUT', 'Choose a business type listed for this product.');
      const existing = action.submissionId ? submission(action.submissionId) : undefined;
      if (existing && existing.status !== 'Draft') throw new PortalError('INVALID_TRANSITION', 'Only a draft can be edited. Respond to the requested information for a submitted account.', 409);
      const value: Submission = { id: existing?.id ?? `sub-${id}`, agencyId: agent.agencyId, assignedAgentId: existing?.assignedAgentId ?? agent.id,
        accountName: text(action.accountName, 'account name', 120), productId: product.id, line: product.line, state: action.state,
        industry: action.industry, effectiveDate: date(action.effectiveDate, 'effective date'), employeeCount: number(action.employeeCount, 'employee count', 100000),
        annualRevenueCents: number(action.annualRevenueCents, 'annual revenue', 100000000000000), notes: text(action.notes ?? '', 'notes', 2000, true),
        status: 'Draft', updatedAt: timestamp, requirements: [...product.requirements], completedRequirements: existing?.productId === product.id ? existing.completedRequirements : [],
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
      if (value.completedRequirements.length !== value.requirements.length) throw new PortalError('MISSING_REQUIREMENTS', 'Complete the preparation checklist before submitting.');
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
      if (!agent.licensedStates.includes(action.state)) throw new PortalError('FORBIDDEN', 'Choose a state available for your appointment.', 403);
      const existing = action.bondRequestId ? next.bondRequests.find((item) => item.id === action.bondRequestId) : undefined;
      if (action.bondRequestId && !existing) failNotFound();
      if (existing && !['Draft', 'Information needed'].includes(existing.status)) throw new PortalError('INVALID_TRANSITION', 'This bond request is already being reviewed.', 409);
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
      if (!['Draft', 'Information needed'].includes(value.status)) throw new PortalError('INVALID_TRANSITION', 'This bond request has already been sent for review.', 409);
      value.status = value.status === 'Draft' ? 'Submitted' : 'In review'; value.updatedAt = timestamp;
      next.tasks = next.tasks.map((task) => task.href === `/surety/${value.id}` ? { ...task, status: 'Completed' } : task);
      addActivity(value.principal, `Bond request received · ${value.reference}`, `/surety/${value.id}`); break;
    }
    case 'toggle-favorite': {
      if (!context.resources.some((resource) => resource.id === action.resourceId)) failNotFound();
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
  const saved = await store.compareAndSet(context.key, context.record.version, next, context.remainingSeconds);
  if (!saved) throw new PortalError('VERSION_CONFLICT', 'Your workspace changed in another window. Refresh and try again.', 409);
  const latestPack = await getPack(store, session.reviewerPack);
  if (latestPack.value.runId !== context.pack.value.runId) throw new PortalError('WORKSPACE_RESET', 'Your workspace was reset. Refresh the page before continuing.', 409);
  return makeBootstrap(session, agent, context.pack.value, saved, false, context.resources);
}

export async function resetReviewerPack(reviewerPack: string, mode: 'saved-work' | 'restart', store = getStateStore()) {
  if (!fixtures.manifest.reviewerPacks.includes(reviewerPack)) throw new PortalError('INVALID_INPUT', 'Choose a valid reviewer pack.');
  const current = await getPack(store, reviewerPack);
  const generation = current.value.profileGeneration + (mode === 'restart' ? 1 : 0);
  const verified = (process.env.PORTAL_VERIFIED_PROFILE_GENERATIONS ?? '').split(',').map((value) => value.trim());
  if (mode === 'restart' && !verified.includes(String(generation))) throw new PortalError('PROFILE_NOT_READY', 'The next native profile generation has not been imported and verified.', 409);
  const next = { runId: randomUUID(), profileGeneration: generation, createdAt: Date.now(), restartedAt: mode === 'restart' ? Date.now() : current.value.restartedAt };
  const saved = await store.compareAndSet(`${stateNamespace()}:pack:${reviewerPack}`, current.version, next, METADATA_TTL_SECONDS);
  if (!saved) throw new PortalError('VERSION_CONFLICT', 'This reviewer pack changed. Refresh and try again.', 409);
  return { reviewerPack, mode, runId: next.runId, profileGeneration: generation, clearBrowserIdentity: mode === 'restart' };
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
