import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { fixtures } from '../data/fixtures';
import { getFreshProfileIdentifier } from '../auth/profile-identity';

const PROFILE_COUNT = 7;
const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_DEADLINE_MS = 8_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MD5 = /^[0-9a-f]{32}$/i;

export interface ProfileImportPlan {
  readonly reviewerPack: string;
  readonly generation: number;
  readonly profileSetId: string;
  readonly identityScope: string;
  readonly profiles: ReadonlyArray<Readonly<{ agentId: string; identifier: string; correlationId: string }>>;
  readonly payload: string;
  readonly checksumMd5: string;
  readonly fileSizeBytes: number;
}

export interface ProfileImportSubmission {
  readonly batchId: string;
  readonly checksumMd5: string;
  readonly fileSizeBytes: number;
}

export interface VerifiedProfileImport extends ProfileImportSubmission {
  readonly counts: Readonly<{ CREATED: number; UPDATED: number; FAILED: number }>;
  readonly profiles: ReadonlyArray<Readonly<{
    agentId: string; identifier: string; correlationId: string; profileId: string;
  }>>;
  readonly verifiedAt: string;
}

export type ProfileImportReceipt = VerifiedProfileImport;
export interface ProfileImportDiagnostic {
  stage: 'status' | 'stats' | 'results';
  fieldTypes?: Readonly<Record<string, string>>;
  recordCount?: number;
  recordIndex?: number;
  recordType?: 'profile' | 'PROFILE' | 'Profile' | 'other-string';
  recordTypeCaseInsensitiveProfile?: boolean;
}
export type ProfileImportInspection =
  | { status: 'pending'; retryAfterSeconds: number }
  | { status: 'verified'; receipt: VerifiedProfileImport }
  | { status: 'failed'; code: string; message: string;
      diagnosticCode?: string; diagnostic?: ProfileImportDiagnostic };

/** Safe, stable diagnostics only: never retain upstream bodies, URLs or causes. */
export class ProfileImportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly uploadUncertain = false,
  ) {
    super(message);
    this.name = 'ProfileImportError';
  }
}

function invalidPlan(): never {
  throw new ProfileImportError('INVALID_IMPORT_PLAN', 'The profile import plan is invalid.');
}

function configuration() {
  let url: URL;
  const raw = process.env.SITECORE_PROFILE_IMPORT_URL;
  const apiKey = process.env.SITECORE_PROFILE_IMPORT_API_KEY;
  try { url = new URL(raw ?? ''); } catch {
    throw new ProfileImportError('IMPORT_NOT_CONFIGURED', 'Native profile import is not configured.');
  }
  if (url.protocol !== 'https:' ||
      !(url.hostname === 'sitecorecloud.io' || url.hostname.endsWith('.sitecorecloud.io')) ||
      url.username || url.password || url.search || url.hash || (url.port && url.port !== '443') ||
      !apiKey || apiKey !== apiKey.trim() || /[\r\n]/.test(apiKey) || apiKey.length > 4096) {
    throw new ProfileImportError('IMPORT_NOT_CONFIGURED', 'Native profile import is not configured.');
  }
  const base = url.href.replace(/\/+$/, '');
  return { endpoint: base.endsWith('/v1/batches') ? base : `${base}/v1/batches`, apiKey };
}

export function assertProfileImportConfigured(): void { configuration(); }
export const assertConfigured = assertProfileImportConfigured;

interface ProfileImportInput {
  reviewerPack: string; generation: number; profileSetId: string; identityScope: string;
}

export interface ProfileImportRestoreDescriptor extends ProfileImportInput {
  profiles: ProfileImportPlan['profiles'];
  checksumMd5: string;
  fileSizeBytes: number;
}

function buildProfileImport(input: ProfileImportInput, originalProfiles?: ProfileImportPlan['profiles']): ProfileImportPlan {
  if (!input || !fixtures.manifest.reviewerPacks.includes(input.reviewerPack) ||
      !Number.isSafeInteger(input.generation) || input.generation < 0 ||
      !UUID.test(input.profileSetId) || typeof input.identityScope !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(input.identityScope) ||
      fixtures.agents.length !== PROFILE_COUNT) invalidPlan();

  if (originalProfiles && (!Array.isArray(originalProfiles) || originalProfiles.length !== PROFILE_COUNT ||
      fixtures.agents.some((_, index) => !originalProfiles[index] || !uuid(originalProfiles[index].correlationId)))) invalidPlan();
  const profiles = fixtures.agents.map((agent, index) => Object.freeze({
    agentId: agent.id,
    identifier: getFreshProfileIdentifier(input.identityScope, input.profileSetId, input.reviewerPack, agent.id),
    correlationId: originalProfiles ? originalProfiles[index].correlationId : randomUUID(),
  }));
  if (originalProfiles && profiles.some((profile, index) =>
    originalProfiles[index]?.agentId !== profile.agentId || originalProfiles[index]?.identifier !== profile.identifier ||
    !uuid(profile.correlationId))) invalidPlan();
  const records = fixtures.agents.map((agent, index) => {
    const agency = fixtures.agencies.find((entry) => entry.id === agent.agencyId);
    if (!agency) invalidPlan();
    const extensions: Record<string, string | number | boolean> = {
      agentId: agent.id, agencyId: agency.id, agencyName: agency.name, role: agent.role,
      state: agent.state, channel: agency.channel, reviewerPack: input.reviewerPack,
      profileGeneration: input.generation, profileSetId: input.profileSetId, identityScope: input.identityScope,
      productionPeriodStart: fixtures.manifest.productionPeriod.start,
      productionPeriodEnd: fixtures.manifest.productionPeriod.end,
      productionCurrency: 'USD', productionMetricScope: 'agency', scenarioAsOfDate: fixtures.manifest.asOfDate,
      smallBusinessGrowthAudience: agency.id === 'cedar-ridge',
      licensedInTexas: agent.licensedStates.includes('TX'),
      licensedInFlorida: agent.licensedStates.includes('FL'),
      licensedInIllinois: agent.licensedStates.includes('IL'),
    };
    for (const line of ['personal', 'small-commercial', 'commercial', 'specialty', 'surety'] as const) {
      const production = agency.production.find((entry) => entry.line === line);
      const prefix = line.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      extensions[`${prefix}WrittenPremiumCents`] = production?.writtenPremiumCents ?? 0;
      extensions[`${prefix}PolicyCount`] = production?.policyCount ?? 0;
      extensions[`${prefix}NewBusinessPremiumCents`] = production?.newBusinessPremiumCents ?? 0;
      const capitalized = prefix[0].toUpperCase() + prefix.slice(1);
      extensions[`specializesIn${capitalized}`] = agent.specializations.includes(line);
      extensions[`agency${capitalized}WrittenPremiumCents`] = production?.writtenPremiumCents ?? 0;
      const own = agent.production.find((entry) => entry.line === line);
      extensions[`agent${capitalized}WrittenPremiumCents`] = own?.writtenPremiumCents ?? 0;
      extensions[`agent${capitalized}PolicyCount`] = own?.policyCount ?? 0;
      extensions[`agent${capitalized}NewBusinessPremiumCents`] = own?.newBusinessPremiumCents ?? 0;
    }
    return {
      id: profiles[index].correlationId, recordType: 'profile',
      identifiers: [{ provider: 'liberty-mutual-agent', id: profiles[index].identifier }],
      contact: { firstName: agent.firstName, lastName: agent.lastName }, extensions,
    };
  });
  const payload = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
  return Object.freeze({
    ...input, profiles: Object.freeze(profiles), payload,
    checksumMd5: createHash('md5').update(payload, 'utf8').digest('hex'),
    fileSizeBytes: Buffer.byteLength(payload, 'utf8'),
  });
}

/** Uses the scalar-only profile shape already accepted by this tenant. */
export function prepareProfileImport(input: ProfileImportInput): ProfileImportPlan {
  return buildProfileImport(input);
}

/** Rebuilds an existing upload only when retained descriptors reproduce its exact bytes. */
export function restoreProfileImportPlan(input: ProfileImportRestoreDescriptor): ProfileImportPlan {
  if (!input || !Array.isArray(input.profiles) || !MD5.test(input.checksumMd5) || !Number.isSafeInteger(input.fileSizeBytes)) invalidPlan();
  const plan = buildProfileImport({ reviewerPack: input.reviewerPack, generation: input.generation,
    profileSetId: input.profileSetId, identityScope: input.identityScope }, input.profiles);
  assertPlan(plan);
  if (plan.checksumMd5 !== input.checksumMd5 || plan.fileSizeBytes !== input.fileSizeBytes) invalidPlan();
  return plan;
}

function assertPlan(plan: ProfileImportPlan): void {
  if (!plan || typeof plan.payload !== 'string' || plan.payload.length > MAX_RESPONSE_BYTES ||
      !MD5.test(plan.checksumMd5) || !Number.isSafeInteger(plan.fileSizeBytes) ||
      Buffer.byteLength(plan.payload, 'utf8') !== plan.fileSizeBytes ||
      createHash('md5').update(plan.payload, 'utf8').digest('hex') !== plan.checksumMd5 ||
      !fixtures.manifest.reviewerPacks.includes(plan.reviewerPack) || !UUID.test(plan.profileSetId) ||
      !Number.isSafeInteger(plan.generation) || plan.generation < 0 || typeof plan.identityScope !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(plan.identityScope) ||
      !Array.isArray(plan.profiles) || plan.profiles.length !== PROFILE_COUNT) invalidPlan();
  const records = plan.payload.trimEnd().split('\n');
  if (records.length !== PROFILE_COUNT) invalidPlan();
  const correlations = new Set<string>();
  for (let index = 0; index < PROFILE_COUNT; index++) {
    const profile = plan.profiles[index];
    if (!profile || profile.agentId !== fixtures.agents[index].id || !UUID.test(profile.correlationId) ||
        correlations.has(profile.correlationId.toLowerCase()) || profile.identifier !==
        getFreshProfileIdentifier(plan.identityScope, plan.profileSetId, plan.reviewerPack, profile.agentId)) invalidPlan();
    correlations.add(profile.correlationId.toLowerCase());
    try {
      const record = JSON.parse(records[index]);
      if (record.id !== profile.correlationId || record.recordType !== 'profile' ||
          record.identifiers?.length !== 1 || record.identifiers[0].provider !== 'liberty-mutual-agent' ||
          record.identifiers[0].id !== profile.identifier) invalidPlan();
    } catch { invalidPlan(); }
  }
}

type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function count(value: unknown, expected: number): boolean {
  return Number.isSafeInteger(value) && value === expected;
}
function uuid(value: unknown): value is string { return typeof value === 'string' && UUID.test(value); }
function metadata(value: JsonObject, plan: ProfileImportPlan, batchId?: string): boolean {
  return uuid(value.batchId) && (!batchId || value.batchId.toLowerCase() === batchId.toLowerCase()) &&
    typeof value.checksumMd5 === 'string' && MD5.test(value.checksumMd5) &&
    value.checksumMd5.toLowerCase() === plan.checksumMd5 && count(value.fileSizeBytes, plan.fileSizeBytes);
}

async function boundedText(response: Response): Promise<string> {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)) {
    void response.body?.cancel().catch(() => undefined);
    throw new ProfileImportError('INVALID_IMPORT_RESPONSE', 'The profile import response is invalid.');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new ProfileImportError('INVALID_IMPORT_RESPONSE', 'The profile import response is invalid.');
      }
      chunks.push(value);
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
    catch { throw new ProfileImportError('INVALID_IMPORT_RESPONSE', 'The profile import response is invalid.'); }
  } finally { reader.releaseLock(); }
}

async function deadline<T>(upload: boolean, action: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProfileImportError(upload ? 'UPLOAD_UNCERTAIN' : 'IMPORT_READ_TIMEOUT',
        upload ? 'The upload outcome is unknown. Do not submit it again.' : 'Profile import verification timed out. Retry the status check.',
        !upload, upload));
    }, REQUEST_DEADLINE_MS);
  });
  try { return await Promise.race([action(controller.signal), expired]); }
  catch (error) {
    if (error instanceof ProfileImportError) throw error;
    throw new ProfileImportError(upload ? 'UPLOAD_UNCERTAIN' : 'IMPORT_READ_UNAVAILABLE',
      upload ? 'The upload outcome is unknown. Do not submit it again.' : 'Profile import verification is temporarily unavailable.',
      !upload, upload);
  } finally { clearTimeout(timer!); controller.abort(); }
}

async function request(
  config: ReturnType<typeof configuration>, suffix: string, signal: AbortSignal, body?: FormData,
): Promise<string> {
  signal.throwIfAborted();
  const upload = body !== undefined;
  const response = await fetch(config.endpoint + suffix, {
    method: upload ? 'POST' : 'GET', body, signal, redirect: 'error', cache: 'no-store',
    headers: { Authorization: `ApiKey ${config.apiKey}`, Accept: 'application/json, application/x-ndjson' },
  });
  signal.throwIfAborted();
  if (response.status !== (upload ? 202 : 200)) {
    void response.body?.cancel().catch(() => undefined);
    if (upload && response.status === 429) {
      throw new ProfileImportError('IMPORT_QUEUE_BUSY', 'Another native import is running. Retry this same upload later.', true);
    }
    if (upload && (response.status >= 500 || response.status === 408 || response.status < 400)) {
      throw new ProfileImportError('UPLOAD_UNCERTAIN', 'The upload outcome is unknown. Do not submit it again.', false, true);
    }
    const retryable = !upload && (response.status >= 500 || [404, 408, 429].includes(response.status));
    throw new ProfileImportError(retryable ? 'IMPORT_READ_UNAVAILABLE' : 'IMPORT_REQUEST_REJECTED',
      retryable ? 'Profile import verification is temporarily unavailable.' : 'The native profile import request was rejected.', retryable);
  }
  try { return await boundedText(response); }
  catch (error) {
    if (upload) throw new ProfileImportError('UPLOAD_UNCERTAIN', 'The upload outcome is unknown. Do not submit it again.', false, true);
    throw error;
  }
}

function json(text: string): JsonObject {
  let value: unknown;
  try { value = JSON.parse(text); } catch {
    throw new ProfileImportError('INVALID_IMPORT_RESPONSE', 'The profile import response is invalid.');
  }
  if (!object(value)) throw new ProfileImportError('INVALID_IMPORT_RESPONSE', 'The profile import response is invalid.');
  return value;
}

/** One POST only. The caller must persist an uploading phase before calling. */
export async function submitProfileImport(plan: ProfileImportPlan): Promise<ProfileImportSubmission> {
  assertPlan(plan);
  const config = configuration();
  const form = new FormData();
  form.append('file', new Blob([plan.payload], { type: 'application/x-ndjson' }), 'profiles.jsonl');
  form.append('md5', plan.checksumMd5);
  return deadline(true, async (signal) => {
    const text = await request(config, '', signal, form);
    let result: JsonObject;
    try { result = json(text); } catch {
      throw new ProfileImportError('UPLOAD_UNCERTAIN', 'The upload outcome is unknown. Do not submit it again.', false, true);
    }
    if (!metadata(result, plan) || result.status !== 'QUEUED') {
      throw new ProfileImportError('UPLOAD_UNCERTAIN', 'The upload acknowledgement could not be verified. Do not submit it again.', false, true);
    }
    return Object.freeze({ batchId: String(result.batchId).toLowerCase(), checksumMd5: plan.checksumMd5, fileSizeBytes: plan.fileSizeBytes });
  });
}

const failed = (diagnosticCode: string, diagnostic: ProfileImportDiagnostic): ProfileImportInspection => ({
  status: 'failed', code: 'IMPORT_VERIFICATION_FAILED', message: 'Native import did not verify seven new profiles. The active pack has not changed.',
  diagnosticCode, diagnostic,
});

/** Fixed field names and value types only; never expose upstream keys or values. */
function responseShape(value: JsonObject, fields: readonly string[]): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(fields.map((field) => [field,
    !(field in value) ? 'missing' : value[field] === null ? 'null' : Array.isArray(value[field]) ? 'array' : typeof value[field],
  ])));
}

/** Read-only, one bounded inspection. Pending/transient reads are safely resumable. */
export async function inspectProfileImport(
  plan: ProfileImportPlan, submission: ProfileImportSubmission,
): Promise<ProfileImportInspection> {
  assertPlan(plan);
  if (!submission || !metadata(submission as unknown as JsonObject, plan)) invalidPlan();
  const config = configuration();
  return deadline(false, async (signal) => {
    let stage: ProfileImportDiagnostic['stage'] = 'status';
    try {
      const status = json(await request(config, `/${submission.batchId}/status`, signal));
      const statusDiagnostic = { stage, fieldTypes: responseShape(status, ['batchId', 'status', 'totalRecords', 'succeededRecords', 'failedRecords']) };
      if (!uuid(status.batchId) || status.batchId.toLowerCase() !== submission.batchId.toLowerCase()) return failed('STATUS_BATCH_MISMATCH', statusDiagnostic);
      if (status.status === 'QUEUED' || status.status === 'RUNNING') return { status: 'pending', retryAfterSeconds: 3 };
      if (status.status !== 'COMPLETED') return failed('STATUS_NOT_COMPLETED', statusDiagnostic);
      if (!count(status.totalRecords, PROFILE_COUNT) || !count(status.succeededRecords, PROFILE_COUNT) ||
          !count(status.failedRecords, 0)) return failed('STATUS_COUNTS_MISMATCH', statusDiagnostic);
      stage = 'stats';
      const [statsText, resultsText] = await Promise.all([
        request(config, `/${submission.batchId}/stats`, signal),
        request(config, `/${submission.batchId}/results`, signal),
      ]);
      const stats = json(statsText);
      const statsDiagnostic = { stage, fieldTypes: responseShape(stats, ['batchId', 'status', 'checksumMd5', 'fileSizeBytes',
        'totalRecords', 'succeededRecords', 'createdRecords', 'updatedRecords', 'failedRecords']) };
      if (!metadata(stats, plan, submission.batchId)) return failed('STATS_METADATA_MISMATCH', statsDiagnostic);
      if (stats.status !== 'COMPLETED') return failed('STATS_NOT_COMPLETED', statsDiagnostic);
      if (!count(stats.totalRecords, PROFILE_COUNT) || !count(stats.succeededRecords, PROFILE_COUNT) ||
          !count(stats.createdRecords, PROFILE_COUNT) || !count(stats.updatedRecords, 0) ||
          !count(stats.failedRecords, 0)) return failed('STATS_COUNTS_MISMATCH', statsDiagnostic);
      stage = 'results';
      const lines = resultsText.trim().split(/\r?\n/);
      if (lines.length !== PROFILE_COUNT) return failed('RESULT_COUNT_MISMATCH', { stage, recordCount: lines.length });
      const byIndex = new Map<number, string>();
      const nativeIds = new Set<string>();
      for (const line of lines) {
        const record = json(line);
        const index = record.recordIndex;
        const diagnostic: ProfileImportDiagnostic = { stage,
          fieldTypes: responseShape(record, ['recordIndex', 'id', 'recordType', 'outcome', 'profileId']),
          ...(typeof record.recordType === 'string' ? {
            recordType: record.recordType === 'profile' || record.recordType === 'PROFILE' || record.recordType === 'Profile'
              ? record.recordType : 'other-string',
            recordTypeCaseInsensitiveProfile: record.recordType.toLowerCase() === 'profile',
          } : {}),
        };
        if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 0 || index >= PROFILE_COUNT ||
            byIndex.has(index)) return failed('RESULT_INDEX_INVALID', diagnostic);
        diagnostic.recordIndex = index;
        if (record.outcome !== 'CREATED') return failed('RESULT_OUTCOME_MISMATCH', diagnostic);
        // Documentation uses lowercase; this tenant's results endpoint returns uppercase.
        if (record.recordType !== 'profile' && record.recordType !== 'PROFILE') return failed('RESULT_TYPE_MISMATCH', diagnostic);
        if (!uuid(record.id) || record.id.toLowerCase() !== plan.profiles[index].correlationId.toLowerCase())
          return failed('RESULT_CORRELATION_MISMATCH', diagnostic);
        if (!uuid(record.profileId)) return failed('RESULT_PROFILE_ID_INVALID', diagnostic);
        if (nativeIds.has(record.profileId.toLowerCase())) return failed('RESULT_PROFILE_ID_DUPLICATE', diagnostic);
        byIndex.set(index, record.profileId.toLowerCase());
        nativeIds.add(record.profileId.toLowerCase());
      }
      return {
        status: 'verified', receipt: Object.freeze({
          ...submission, counts: Object.freeze({ CREATED: PROFILE_COUNT, UPDATED: 0, FAILED: 0 }),
          profiles: Object.freeze(plan.profiles.map((profile, index) => Object.freeze({ ...profile, profileId: byIndex.get(index)! }))),
          verifiedAt: new Date().toISOString(),
        }),
      };
    } catch (error) {
      if (error instanceof ProfileImportError && error.code === 'INVALID_IMPORT_RESPONSE') return failed('INVALID_RESPONSE_FORMAT', { stage });
      throw error;
    }
  });
}
