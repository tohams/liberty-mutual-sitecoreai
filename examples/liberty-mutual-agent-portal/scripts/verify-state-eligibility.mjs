#!/usr/bin/env node
// Deployed eligibility acceptance. Successful transactional writes require the explicit preview flag.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const PREVIEW = 'https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app';
const PRODUCTION = 'https://liberty-mutual-agent-portal.vercel.app';
const { reviewerPacks } = JSON.parse(await readFile(new URL('../fixtures/manifest.json', import.meta.url), 'utf8'));
const { values } = parseArgs({ options: {
  origin: { type: 'string' }, pack: { type: 'string' },
  'exercise-preview': { type: 'boolean', default: false },
} });
assert.ok([PREVIEW, PRODUCTION].includes(values.origin), 'Choose the exact reviewed preview or production origin.');
assert.ok(reviewerPacks.includes(values.pack), `Choose a configured reviewer pack: ${reviewerPacks.join(', ')}.`);
assert.ok(!values['exercise-preview'] || values.origin === PREVIEW, 'Fixture creation is permitted only on the preview host.');
const origin = values.origin;
const credentials = JSON.parse(await readFile(new URL('../fixtures/portal-logins.json', import.meta.url), 'utf8')).logins;
const sessions = new Map();
const results = [];
const previewCases = {};
function passed(check) { results.push(check); console.log(`PASS ${check}`); }

async function request(agent, path, body) {
  const cookie = sessions.get(agent) ?? '';
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'manual', signal: AbortSignal.timeout(30_000),
    headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';', 1)[0];
    if (pair.startsWith('lm_portal_session=')) sessions.set(agent, pair);
  }
  assert.ok(response.headers.get('content-type')?.includes('application/json'), 'Expected a portal API response.');
  const data = await response.json();
  return { status: response.status, data };
}
async function login(agent) {
  const account = credentials.find((item) => item.agentId === agent && item.reviewerPack === values.pack && item.enabled);
  assert.ok(account, 'Fictional login is unavailable.');
  const response = await request(agent, '/api/auth/login', { username: account.username, password: account.password });
  assert.equal(response.status, 200, `Login failed for ${agent}.`);
  assert.ok(sessions.get(agent)?.startsWith('lm_portal_session='));
  return bootstrap(agent);
}
async function bootstrap(agent) {
  const response = await request(agent, '/api/portal/bootstrap');
  assert.equal(response.status, 200);
  assert.equal(response.data.agent.id, agent);
  return response.data;
}
async function action(agent, body) {
  const before = await bootstrap(agent);
  const response = await request(agent, '/api/portal/actions', {
    ...body, expectedVersion: before.session.stateVersion, runId: before.session.runId, idempotencyKey: randomUUID(),
  });
  return { before, ...response };
}
async function denied(agent, body, label) {
  const response = await action(agent, body);
  assert.equal(response.status, 403, label);
  assert.equal(response.data.error?.code, 'FORBIDDEN', label);
  const after = await bootstrap(agent);
  assert.equal(after.session.stateVersion, response.before.session.stateVersion, 'A denied request changed saved work.');
  assert.deepEqual(after.submissions, response.before.submissions, 'A denied request changed a submission.');
  assert.deepEqual(after.bondRequests, response.before.bondRequests, 'A denied request changed a bond.');
  passed(label);
}
const date = new Date();
date.setUTCDate(date.getUTCDate() + 30);
const effectiveDate = date.toISOString().slice(0, 10);
const draft = (state, accountName) => ({
  type: 'save-submission', productId: 'bop', state, industry: 'Retail', effectiveDate,
  accountName, employeeCount: 4, annualRevenueCents: 10000000, notes: '',
});

try {
  const jordan = await login('jordan');
  assert.deepEqual(new Set(jordan.agent.licensedStates), new Set(['TX', 'IL']));
  assert.equal(jordan.eligibility?.schemaVersion, 1);
  assert.ok(jordan.eligibility.agentAuthorities.every((record) => record.agentId === 'jordan'));
  assert.ok(jordan.submissions.every((record) => typeof jordan.actionEligibility?.submissions?.[record.id]?.allowed === 'boolean'));
  passed('Jordan bootstrap exposes current licenses and server action decisions');
  await denied('jordan', draft('FL', 'Cedar Bay Retail'), 'Jordan cannot create a Florida submission');
  const daniel = await login('daniel');
  assert.deepEqual(new Set(daniel.agent.licensedStates), new Set(['IL', 'TX']));
  assert.ok(daniel.eligibility.agentAuthorities.every((record) => record.agentId === 'daniel'));
  passed('Daniel retains Illinois/Texas authority without unrelated producer records');
  await login('maya');
  await denied('maya', { ...draft('IL', 'Lakeview Household'), productId: 'recreation', industry: 'Households' }, 'Unavailable Illinois recreational coverage is blocked despite an active state license');

  if (values['exercise-preview']) {
    await login('avery');
    const suffix = randomUUID().slice(0, 8);
    const floridaName = `Cedar Bay Retail ${suffix}`;
    const floridaBody = draft('FL', floridaName);
    const created = await action('avery', floridaBody);
    assert.equal(created.status, 200);
    const florida = created.data.submissions.find((item) => item.accountName === floridaName);
    assert.ok(florida && florida.state === 'FL' && florida.assignedAgentId === 'avery');
    previewCases.floridaSubmission = florida.id;
    const colleague = await bootstrap('jordan');
    assert.equal(colleague.submissions.find((item) => item.id === florida.id)?.state, 'FL');
    assert.equal(colleague.actionEligibility.submissions[florida.id].allowed, false);
    passed('Shared Florida draft remains visible with a blocked Jordan action decision');
    await denied('jordan', { type: 'complete-requirement', submissionId: florida.id, requirement: florida.requirements[0] }, 'Jordan cannot complete a Florida requirement');
    await denied('jordan', { type: 'submit-submission', submissionId: florida.id }, 'Jordan cannot submit Avery’s Florida draft');
    await denied('jordan', { ...floridaBody, submissionId: florida.id, state: 'TX' }, 'Jordan cannot relabel an unauthorized Florida risk as Texas');

    const texasName = `Prairie Lane Retail ${suffix}`;
    const texasBody = draft('TX', texasName);
    const texasResult = await action('jordan', texasBody);
    assert.equal(texasResult.status, 200);
    const texas = texasResult.data.submissions.find((item) => item.accountName === texasName);
    assert.ok(texas && texas.assignedAgentId === 'jordan');
    previewCases.texasSubmission = texas.id;
    await denied('avery', { ...texasBody, submissionId: texas.id, state: 'FL' }, 'Principal cannot leave Jordan assigned to an unauthorized Florida risk');
    for (const requirement of florida.requirements) {
      const response = await action('avery', { type: 'complete-requirement', submissionId: florida.id, requirement });
      assert.equal(response.status, 200);
    }
    const submitted = await action('avery', { type: 'submit-submission', submissionId: florida.id });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.submissions.find((item) => item.id === florida.id)?.status, 'Submitted');
    passed('Eligible Avery can complete the state checklist and submit');
  }
  console.log(JSON.stringify({ status: 'passed', origin, checks: results.length, previewCases,
    savedWork: values['exercise-preview'] ? 'Two newly created fictional preview records retained; no existing records edited or reset.' : 'No successful transactional writes.' }, null, 2));
} finally {
  for (const agent of sessions.keys()) {
    const response = await request(agent, '/api/auth/logout', {});
    assert.equal(response.status, 200, `Logout failed for ${agent}.`);
  }
}
