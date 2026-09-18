import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { reviewerPacks } = JSON.parse(await readFile(new URL('../fixtures/manifest.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_WAIT_MS = 15 * 60 * 1000;
const GENERATION = (value) => Number.isSafeInteger(value) && value >= 0;
const USAGE = `Usage: node scripts/reset-reviewer-pack.mjs https://portal-host <${reviewerPacks.join('|')}> [saved-work|restart] [--operation-file PATH] [--request-id UUID --expected-run-id UUID]`;

export class OperatorResetError extends Error {
  constructor(code, message) { super(message); this.name = 'OperatorResetError'; this.code = code; }
}
const fail = (code, message) => { throw new OperatorResetError(code, message); };

function options(args) {
  let parsed;
  try {
    parsed = parseArgs({ args, options: {
      'operation-file': { type: 'string' }, 'request-id': { type: 'string' }, 'expected-run-id': { type: 'string' },
    }, allowPositionals: true });
  } catch { fail('ARGUMENTS', USAGE); }
  const { values, positionals } = parsed;
  const [host, reviewerPack, mode = 'saved-work'] = positionals;
  if (positionals.length < 2 || positionals.length > 3 || !reviewerPacks.includes(reviewerPack) || !['saved-work', 'restart'].includes(mode)) fail('ARGUMENTS', USAGE);
  let url;
  try { url = new URL(host); } catch { fail('ARGUMENTS', 'Provide a valid portal origin.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') fail('ARGUMENTS', 'Provide only the portal origin, without credentials, a path, query or fragment.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) fail('ARGUMENTS', 'Operator requests require HTTPS, except on localhost.');
  const requestId = values['request-id'];
  const expectedRunId = values['expected-run-id'];
  if ((requestId !== undefined || expectedRunId !== undefined) && (!UUID.test(requestId ?? '') || !UUID.test(expectedRunId ?? ''))) fail('ARGUMENTS', 'Supply both --request-id and --expected-run-id as UUIDs.');
  if (mode !== 'restart' && Object.keys(values).length) fail('ARGUMENTS', 'Resume options apply only to restart.');
  if (values['operation-file'] === '') fail('ARGUMENTS', 'The operation file path cannot be blank.');
  return { origin: url.origin, reviewerPack, mode, requestId, expectedRunId, operationFile: values['operation-file'] };
}

function validateOperation(value, config) {
  if (!value || value.schemaVersion !== 1 || value.origin !== config.origin || value.reviewerPack !== config.reviewerPack || value.mode !== 'restart' || !UUID.test(value.requestId ?? '') || !UUID.test(value.expectedRunId ?? '') || Object.keys(value).some((key) => !['schemaVersion', 'origin', 'reviewerPack', 'mode', 'requestId', 'expectedRunId'].includes(key))) fail('RESUME_FILE', 'The operation file is invalid or belongs to a different host or pack. Preserve it and inspect it before retrying.');
  if (config.requestId && (value.requestId !== config.requestId || value.expectedRunId !== config.expectedRunId)) fail('RESUME_FILE', 'The operation file already contains a different restart. Resume that request or explicitly choose a separate operation file; no request was sent.');
  return value;
}

async function readOperation(path, config) {
  let text;
  try { text = await readFile(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return null; fail('RESUME_FILE', 'Cannot read the operation file. No new restart was started.'); }
  let value;
  try { value = JSON.parse(text); } catch { fail('RESUME_FILE', 'The operation file is not valid JSON. Preserve it and inspect it before retrying.'); }
  return validateOperation(value, config);
}

async function saveOperation(path, operation, config) {
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, JSON.stringify(operation, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return operation;
  } catch (error) {
    if (error.code === 'EEXIST') return await readOperation(path, config);
    fail('RESUME_FILE', 'Cannot save the restart identity. No restart request was sent.');
  }
}

function validateReceipt(value, operation) {
  if (!value || value.reviewerPack !== operation.reviewerPack || value.mode !== 'restart' || value.requestId !== operation.requestId || value.expectedRunId !== operation.expectedRunId || !UUID.test(value.runId ?? '') || !GENERATION(value.profileGeneration) || !GENERATION(value.targetGeneration)) fail('INVALID_RECEIPT', 'The server returned an invalid or mismatched restart receipt. Stop and inspect the saved operation; do not start another request.');
  const phases = { pending: ['preparing', 'uploading', 'verifying'], completed: ['completed'], failed: ['failed'] };
  if (!phases[value.status]?.includes(value.phase) || (value.status === 'completed'
    ? value.runId === operation.expectedRunId || value.profileGeneration !== value.targetGeneration || value.clearBrowserIdentity !== true
    : value.runId !== operation.expectedRunId || value.targetGeneration <= value.profileGeneration || value.clearBrowserIdentity !== false)) fail('INVALID_RECEIPT', 'The server returned an inconsistent restart receipt. Preserve the operation file and inspect its status before proceeding.');
  // Return only reviewed fields. Never print response messages, headers or payloads.
  return Object.fromEntries(['reviewerPack', 'mode', 'requestId', 'expectedRunId', 'status', 'phase', 'runId', 'profileGeneration', 'targetGeneration', 'clearBrowserIdentity'].map((key) => [key, value[key]]));
}

function terminalError(code) {
  if (code === 'UPLOAD_UNCERTAIN') fail(code, 'The native upload outcome is uncertain. The current pack has not switched. Preserve this request identity and inspect the native import before explicitly starting any new attempt.');
  if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') fail('AUTHORIZATION', 'Operator authorization failed. Check PORTAL_OPERATOR_SECRET for this host; no automatic new request will be made.');
  if (code === 'RESTART_PENDING') fail(code, 'This pack already has a restart in progress. Resume its existing restart before resetting saved work.');
  if (code === 'VERSION_CONFLICT' || code === 'IDEMPOTENCY_CONFLICT') fail(code, 'The pack run or request identity has changed. Preserve the operation file and inspect the current pack status before explicitly choosing another request.');
  if (code === 'CONFIGURATION_REQUIRED') fail(code, 'The server restart service needs configuration. Ask the operator to check its server-only credentials; preserve the operation file.');
  if (code === 'PROFILE_IMPORT_FAILED' || code === 'IMPORT_VERIFICATION_FAILED') fail(code, 'The seven-profile native import did not verify. The pack has not switched. Inspect the retained operation and native import result before explicitly choosing another attempt.');
  fail('RESTART_STOPPED', 'The server stopped this operation. Preserve the request identity and inspect the operator status/native import before deciding whether to start a new attempt.');
}

/** The operator key is sent only in the Authorization header and is never persisted. */
export async function runReset(args, {
  env = process.env, fetchImpl = fetch, now = Date.now,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  operationDirectory = join(homedir(), '.sitecore', 'liberty-mutual-portal-operations'),
  timeoutMs = MAX_WAIT_MS, requestIdFactory = randomUUID, onProgress = () => {},
} = {}) {
  const config = options(args);
  if (!env.PORTAL_OPERATOR_SECRET) fail('AUTHORIZATION', 'Set PORTAL_OPERATOR_SECRET in your shell.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_WAIT_MS) fail('ARGUMENTS', 'The operation wait must be between zero and fifteen minutes.');
  const deadline = now() + timeoutMs;
  const target = new URL('/api/portal/operator/reset', config.origin);
  const digest = createHash('sha256').update(config.origin).digest('hex').slice(0, 16);
  const path = config.operationFile ? resolve(config.operationFile) : join(operationDirectory, `${digest}-${config.reviewerPack}.json`);
  const timedOut = () => fail('TIMEOUT', 'The fifteen-minute wait ended before verification. Resume the same command and operation file; do not create a new request.');
  const pause = async (seconds = 2) => {
    const remaining = deadline - now();
    if (remaining <= 0) timedOut();
    await sleep(Math.min(remaining, Math.max(1, Math.min(Number(seconds) || 2, 30)) * 1000));
  };
  const request = async (method, body, query = '') => {
    if (now() >= deadline) timedOut();
    try {
      const response = await fetchImpl(`${target}${query}`, {
        method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.min(20000, deadline - now()))),
        headers: { Authorization: `Bearer ${env.PORTAL_OPERATOR_SECRET}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      let data;
      try { data = await response.json(); } catch { data = null; }
      return { status: response.status, data, retryAfter: response.headers.get('retry-after') };
    } catch { return { status: 0, data: null }; }
  };
  const transient = (status) => status === 0 || status === 429 || status >= 500;

  if (config.mode === 'saved-work') {
    const { status, data } = await request('POST', { reviewerPack: config.reviewerPack, mode: 'saved-work' });
    if (status !== 200) {
      if (transient(status)) fail('SAVED_WORK_UNCERTAIN', 'The saved-work response was unavailable. Check the pack status before retrying; this command did not automatically repeat the reset.');
      terminalError(data?.error?.code);
    }
    if (!data || data.reviewerPack !== config.reviewerPack || data.mode !== 'saved-work' || !UUID.test(data.runId ?? '') || !GENERATION(data.profileGeneration) || data.clearBrowserIdentity !== false) fail('INVALID_RECEIPT', 'The saved-work response could not be verified. Check the pack status before repeating the reset.');
    return { reviewerPack: data.reviewerPack, mode: data.mode, runId: data.runId, profileGeneration: data.profileGeneration, clearBrowserIdentity: false };
  }

  let operation = await readOperation(path, config);
  if (!operation) {
    let requestId = config.requestId;
    let expectedRunId = config.expectedRunId;
    if (!requestId) {
      let state;
      for (;;) {
        const response = await request('GET', undefined, `?reviewerPack=${config.reviewerPack}`);
        if (response.data?.error?.code === 'CONFIGURATION_REQUIRED') terminalError('CONFIGURATION_REQUIRED');
        if (transient(response.status)) { await pause(response.retryAfter); continue; }
        if (response.status !== 200) terminalError(response.data?.error?.code);
        state = response.data;
        if (!state || state.reviewerPack !== config.reviewerPack || !UUID.test(state.runId ?? '') || !GENERATION(state.profileGeneration) || !Object.hasOwn(state, 'pendingRestart') || !Object.hasOwn(state, 'operation')) fail('INVALID_RECEIPT', 'Cannot verify the current pack status. No new restart was started.');
        break;
      }
      if (state.pendingRestart) {
        const pending = state.pendingRestart;
        const identity = { reviewerPack: config.reviewerPack, requestId: pending.requestId, expectedRunId: pending.expectedRunId };
        if (!UUID.test(identity.requestId ?? '') || identity.expectedRunId !== state.runId) fail('INVALID_RECEIPT', 'The pending restart does not match the current pack. No new restart was started.');
        if (validateReceipt(pending, identity).status !== 'pending' || pending.profileGeneration !== state.profileGeneration) fail('INVALID_RECEIPT', 'The pending restart status is inconsistent. No new restart was started.');
        requestId = identity.requestId;
        expectedRunId = identity.expectedRunId;
      } else {
        requestId = requestIdFactory();
        expectedRunId = state.runId;
      }
    }
    operation = validateOperation({ schemaVersion: 1, origin: config.origin, reviewerPack: config.reviewerPack, mode: 'restart', requestId, expectedRunId }, config);
    operation = await saveOperation(path, operation, config);
  }
  onProgress(`Restart identity saved. Resume file: ${path}`);
  onProgress(`Request ${operation.requestId}; expected run ${operation.expectedRunId}.`);
  const body = { reviewerPack: config.reviewerPack, mode: 'restart', requestId: operation.requestId, expectedRunId: operation.expectedRunId };
  let lastPhase;
  for (;;) {
    const response = await request('POST', body);
    if (response.data?.error?.code === 'CONFIGURATION_REQUIRED') terminalError('CONFIGURATION_REQUIRED');
    if (transient(response.status)) { await pause(response.retryAfter); continue; }
    if (![200, 202, 409].includes(response.status) || response.data?.error) terminalError(response.data?.error?.code);
    const receipt = validateReceipt(response.data, operation);
    if (receipt.status === 'failed') {
      if (response.status !== 409) fail('INVALID_RECEIPT', 'The response status does not match the failed restart receipt. Preserve the operation file and inspect the operation.');
      terminalError(response.data.code);
    }
    if (receipt.status === 'completed' && response.status === 200) {
      const stored = await readOperation(path, config);
      if (stored?.requestId === operation.requestId) await unlink(path).catch((error) => { if (error.code !== 'ENOENT') fail('RESUME_FILE', 'Restart completed, but its resume file could not be removed. Preserve it; repeating the same request remains safe.'); });
      return receipt;
    }
    if (receipt.status !== 'pending' || response.status !== 202) fail('INVALID_RECEIPT', 'The response status does not match the restart receipt. Preserve the operation file and inspect the operation.');
    if (receipt.phase !== lastPhase) onProgress(`Restart pending: ${receipt.phase}. The current pack remains active until verification completes.`);
    lastPhase = receipt.phase;
    await pause(response.data.retryAfterSeconds ?? response.retryAfter);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const result = await runReset(process.argv.slice(2), { onProgress: (message) => console.log(message) });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof OperatorResetError ? `${error.code}: ${error.message}` : 'Reset could not complete. Preserve the operation file and inspect the operator status before retrying.');
    process.exitCode = 1;
  }
}
