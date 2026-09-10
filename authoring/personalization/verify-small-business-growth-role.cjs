#!/usr/bin/env node
// Local contract check only. Does not call Sitecore or prove native decision execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'custom-values/small-business-growth-role.js'), 'utf8');

function agentProfile(role, attributes = {}) {
  return {
    type: 'identified',
    identifiers: [{ provider: 'liberty-mutual-agent', id: 'synthetic-local-contract-test' }],
    extensions: { smallBusinessGrowthAudience: true, role, ...attributes },
  };
}

const cases = [
  ['missing profile', {}, 'neutral'],
  ['null profile', { profile: null }, 'neutral'],
  ['principal', { profile: agentProfile('principal') }, 'principal'],
  ['producer', { profile: agentProfile('producer') }, 'producer'],
  ['account manager', { profile: agentProfile('account-manager') }, 'account-manager'],
  ['outside agency cohort', { profile: agentProfile('principal', { smallBusinessGrowthAudience: false }) }, 'neutral'],
  ['string cohort flag is not boolean true', { profile: agentProfile('principal', { smallBusinessGrowthAudience: 'true' }) }, 'neutral'],
  ['unrecognized role', { profile: agentProfile('underwriter') }, 'neutral'],
  ['anonymous', { profile: { ...agentProfile('principal'), type: 'anonymous' } }, 'neutral'],
  ['unrelated provider', { profile: { ...agentProfile('principal'), identifiers: [{ provider: 'unrelated-test-provider' }] } }, 'neutral'],
  ['missing identifiers', { profile: { type: 'identified', extensions: { smallBusinessGrowthAudience: true, role: 'principal' } } }, 'neutral'],
  ['missing extensions', { profile: { type: 'identified', identifiers: [{ provider: 'liberty-mutual-agent' }] } }, 'neutral'],
];

for (const [name, context, expected] of cases) {
  assert.equal(vm.runInNewContext(source, context, { timeout: 1000 }), expected, name);
}
console.log(`Passed ${cases.length} local custom-value contract cases. Native test evidence is recorded separately.`);
