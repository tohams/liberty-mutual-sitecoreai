#!/usr/bin/env node
// Local source checks; native profile and decision evidence is recorded separately.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'custom-values/small-business-growth-opportunity.js'), 'utf8');
const base = {
  type: 'identified', identifiers: [{ provider: 'liberty-mutual-agent' }],
  extensions: { role: 'principal', agencyPersonalWrittenPremiumCents: 287500000, agencySmallCommercialWrittenPremiumCents: 48600000 },
};
const attrs = (changes) => ({ ...base, extensions: { ...base.extensions, ...changes } });
const cases = [
  ['Cedar Ridge principal, 14.46%', base, true],
  ['Cedar Ridge producer', attrs({ role: 'producer' }), true],
  ['Prairie Oak, 36.86%', attrs({ agencyPersonalWrittenPremiumCents: 68000000, agencySmallCommercialWrittenPremiumCents: 39700000 }), false],
  ['account manager', attrs({ role: 'account-manager' }), false],
  ['20% boundary', attrs({ agencyPersonalWrittenPremiumCents: 80, agencySmallCommercialWrittenPremiumCents: 20 }), false],
  ['zero total', attrs({ agencyPersonalWrittenPremiumCents: 0, agencySmallCommercialWrittenPremiumCents: 0 }), false],
  ['string premium', attrs({ agencyPersonalWrittenPremiumCents: '287500000' }), false],
  ['negative premium', attrs({ agencySmallCommercialWrittenPremiumCents: -1 }), false],
  ['missing premium', attrs({ agencySmallCommercialWrittenPremiumCents: undefined }), false],
  ['NaN premium', attrs({ agencyPersonalWrittenPremiumCents: NaN }), false],
  ['infinite premium', attrs({ agencyPersonalWrittenPremiumCents: Infinity }), false],
  ['anonymous', { ...base, type: 'anonymous' }, false],
  ['wrong identity provider', { ...base, identifiers: [{ provider: 'unrelated' }] }, false],
  ['invalid identifiers', { ...base, identifiers: {} }, false],
  ['null profile', null, false],
];
for (const [label, profile, expected] of cases) assert.equal(vm.runInNewContext(source, { profile }, { timeout: 1000 }), expected, label);
assert.equal(vm.runInNewContext(source, {}, { timeout: 1000 }), false, 'missing profile');
console.log(`Passed ${cases.length + 1} calculated-audience source cases.`);
