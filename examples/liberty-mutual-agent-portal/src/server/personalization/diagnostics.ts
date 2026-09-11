type ReceiptType = 'null' | 'array' | 'object' | 'undefined' | 'string' | 'number' | 'boolean' | 'other';
type Diagnostic =
  | { stage: 'proxy'; enabled: boolean; draft: boolean; signedSessionPresent: boolean }
  | { stage: 'discovery'; outcome: 'unavailable'; elapsedMs: number }
  | { stage: 'identity'; identityPresent: boolean; outcome: 'available' | 'missing' | 'resolver-error'; elapsedMs: number }
  | { stage: 'profile'; outcome: 'available' | 'unavailable'; elapsedMs: number }
  | { stage: 'decision'; receiptType: ReceiptType; selectedVariant: boolean; selection: 'accepted-control' | 'accepted-variant' | 'invalid' | 'none'; outcome: 'completed' | 'execution-error' | 'http-error' | 'timeout' | 'identity-unavailable' | 'profile-unavailable'; elapsedMs: number; httpStatus?: number };

const elapsed = (milliseconds: number) => Number.isFinite(milliseconds) ? Math.max(0, Math.round(milliseconds)) : 0;

/** Explicit allowlist: never log native request/response objects or exception messages. Disabled by default. */
export function reportPersonalizationDiagnostic(diagnostic: Diagnostic): void {
  if (process.env.PORTAL_PERSONALIZATION_DIAGNOSTICS !== 'true') return;
  if (diagnostic.stage === 'proxy') {
    console.info('Portal personalization', {
      stage: 'proxy', enabled: Boolean(diagnostic.enabled), draft: Boolean(diagnostic.draft),
      signedSessionPresent: Boolean(diagnostic.signedSessionPresent),
    });
  } else if (diagnostic.stage === 'discovery') {
    console.info('Portal personalization', {
      stage: 'discovery', outcome: 'unavailable', elapsedMs: elapsed(diagnostic.elapsedMs),
    });
  } else if (diagnostic.stage === 'identity') {
    console.info('Portal personalization', {
      stage: 'identity', identityPresent: Boolean(diagnostic.identityPresent),
      outcome: diagnostic.outcome === 'available' ? 'available' : diagnostic.outcome === 'missing' ? 'missing' : 'resolver-error',
      elapsedMs: elapsed(diagnostic.elapsedMs),
    });
  } else if (diagnostic.stage === 'profile') {
    console.info('Portal personalization', {
      stage: 'profile', outcome: diagnostic.outcome === 'available' ? 'available' : 'unavailable',
      elapsedMs: elapsed(diagnostic.elapsedMs),
    });
  } else if (diagnostic.stage === 'decision') {
    const allowedTypes: ReceiptType[] = ['null', 'array', 'object', 'undefined', 'string', 'number', 'boolean', 'other'];
    const allowedOutcomes = ['completed', 'execution-error', 'http-error', 'timeout', 'identity-unavailable', 'profile-unavailable'];
    const allowedSelections = ['accepted-control', 'accepted-variant', 'invalid', 'none'];
    const httpStatus = diagnostic.httpStatus;
    console.info('Portal personalization', {
      stage: 'decision', receiptType: allowedTypes.includes(diagnostic.receiptType) ? diagnostic.receiptType : 'other',
      selectedVariant: Boolean(diagnostic.selectedVariant),
      selection: allowedSelections.includes(diagnostic.selection) ? diagnostic.selection : 'none',
      outcome: allowedOutcomes.includes(diagnostic.outcome) ? diagnostic.outcome : 'execution-error',
      elapsedMs: elapsed(diagnostic.elapsedMs),
      ...(typeof httpStatus === 'number' && Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? { httpStatus } : {}),
    });
  }
}

export function decisionReceiptType(receipt: unknown): ReceiptType {
  if (receipt === null) return 'null';
  if (Array.isArray(receipt)) return 'array';
  const type = typeof receipt;
  return ['object', 'undefined', 'string', 'number', 'boolean'].includes(type) ? type as ReceiptType : 'other';
}
