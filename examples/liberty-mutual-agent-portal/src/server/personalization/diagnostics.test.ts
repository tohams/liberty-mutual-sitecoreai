import assert from 'node:assert/strict';
import test from 'node:test';
import { reportPersonalizationDiagnostic } from './diagnostics';
import { createIdentifiedExperienceExecutor } from './identified-experience';

test('diagnostics are opt-in, allowlisted, and distinguish failures without sensitive values', async () => {
  const previous = process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS;
  const originalInfo = console.info;
  const logs: unknown[][] = [];
  console.info = (...args: unknown[]) => { logs.push(args); };
  const sensitive = 'MUST-NOT-APPEAR-IN-DIAGNOSTICS';
  try {
    delete process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS;
    reportPersonalizationDiagnostic({ stage: 'proxy', enabled: true, draft: false, signedSessionPresent: true });
    assert.equal(logs.length, 0);
    process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS = 'true';
    reportPersonalizationDiagnostic({
      stage: 'proxy', enabled: true, draft: false, signedSessionPresent: true,
      profileId: sensitive, url: sensitive, query: sensitive,
    } as Parameters<typeof reportPersonalizationDiagnostic>[0]);
    assert.deepEqual(logs[0][1], { stage: 'proxy', enabled: true, draft: false, signedSessionPresent: true });
    const request = { friendlyId: sensitive, channel: 'WEB', params: { query: sensitive } };
    const identity = { provider: 'liberty-mutual-agent' as const, id: sensitive };
    const cases = [
      createIdentifiedExperienceExecutor(async () => null, async () => null),
      createIdentifiedExperienceExecutor(async () => { throw new Error(sensitive); }, async () => null),
      createIdentifiedExperienceExecutor(async () => identity, async () => { throw new Error(sensitive); }),
      createIdentifiedExperienceExecutor(async () => identity, async () => null),
      createIdentifiedExperienceExecutor(async () => identity, async () => ({ variantId: 'component_default' })),
      createIdentifiedExperienceExecutor(async () => identity, async () => ({ variantId: sensitive, profileId: sensitive })),
    ];
    for (const execute of cases) await execute(request);
    const entries = logs.map((entry) => entry[1]) as Record<string, unknown>[];
    assert.ok(entries.some((entry) => entry.stage === 'identity' && entry.outcome === 'missing'));
    assert.ok(entries.some((entry) => entry.stage === 'identity' && entry.outcome === 'resolver-error'));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.outcome === 'execution-error'));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.receiptType === 'null' && entry.selectedVariant === false));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.receiptType === 'object' && entry.selectedVariant === true));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.receiptType === 'object' && entry.selectedVariant === false));
    assert.ok(entries.filter((entry) => entry.stage !== 'proxy').every((entry) => typeof entry.elapsedMs === 'number' && entry.elapsedMs >= 0));
    assert.ok(!JSON.stringify(logs).includes(sensitive));
    assert.ok(!JSON.stringify(logs).match(/profileId|guestRef|identifiers|friendlyId|query|url|message/));
  } finally {
    console.info = originalInfo;
    if (previous === undefined) delete process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS;
    else process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS = previous;
  }
});
