import assert from 'node:assert/strict';
import test from 'node:test';
import { reportPersonalizationDiagnostic } from './diagnostics';
import { createBrowserProfileDecisionExecutor } from './browser-profile-decision';

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
    const request = { friendlyId: sensitive, channel: 'WEB', params: { query: sensitive }, pageVariantIds: [sensitive, 'component_default'] };
    const identity = { provider: 'liberty-mutual-agent' as const, id: sensitive };
    const context = { browserId: 'a1111111-1111-4111-8111-111111111111', siteName: sensitive, contextId: sensitive, edgeUrl: 'https://edge.example' };
    const cases = [
      createBrowserProfileDecisionExecutor(context, async () => null, async () => Response.json(null)),
      createBrowserProfileDecisionExecutor(context, async () => { throw new Error(sensitive); }, async () => Response.json(null)),
      createBrowserProfileDecisionExecutor(context, async () => identity, async () => { throw new Error(sensitive); }),
      createBrowserProfileDecisionExecutor(context, async () => identity, async () => Response.json(null)),
      createBrowserProfileDecisionExecutor(context, async () => identity, async () => Response.json({ variantId: 'component_default' })),
      createBrowserProfileDecisionExecutor(context, async () => identity, async () => Response.json({ variantId: sensitive, profileId: sensitive })),
      createBrowserProfileDecisionExecutor(context, async () => identity, async () => Response.json({ message: sensitive }, { status: 500 })),
    ];
    for (const execute of cases) await execute(request);
    const entries = logs.map((entry) => entry[1]) as Record<string, unknown>[];
    assert.ok(entries.some((entry) => entry.stage === 'identity' && entry.outcome === 'missing'));
    assert.ok(entries.some((entry) => entry.stage === 'identity' && entry.outcome === 'resolver-error'));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.outcome === 'execution-error'));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.receiptType === 'null' && entry.selectedVariant === false));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.receiptType === 'object' && entry.selectedVariant === true));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.receiptType === 'object' && entry.selectedVariant === false));
    assert.ok(entries.some((entry) => entry.stage === 'decision' && entry.outcome === 'http-error' && entry.httpStatus === 500));
    assert.ok(entries.filter((entry) => entry.stage !== 'proxy').every((entry) => typeof entry.elapsedMs === 'number' && entry.elapsedMs >= 0));
    assert.ok(!JSON.stringify(logs).includes(sensitive));
    assert.ok(!JSON.stringify(logs).match(/profileId|guestRef|identifiers|friendlyId|query|url|message/));
  } finally {
    console.info = originalInfo;
    if (previous === undefined) delete process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS;
    else process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS = previous;
  }
});
