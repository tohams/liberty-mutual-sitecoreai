import type { PersonalizeData, PersonalizeOpts } from '@sitecore-content-sdk/personalize';
import type { PortalBootstrap } from '../../contracts/portal';
import { decisionReceiptType, reportPersonalizationDiagnostic } from './diagnostics';

export type VerifiedIdentityResolver = () => Promise<PortalBootstrap['udlIdentity']>;
export type BrowserDecisionData = Omit<PersonalizeData, 'identifier' | 'email'>;
export interface BrowserDecisionContext {
  browserId: string | undefined;
  siteName: string;
  contextId: string;
  edgeUrl: string;
  userAgent?: string;
}

const neutral = () => ({ variantId: '' });
const defaultTimeoutMs = 2000;
const maximumTimeoutMs = 10000;
const browserIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decisionTimeout(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? Math.min(value, maximumTimeoutMs)
    : defaultTimeoutMs;
}

/** One closure per HTTP request; native identity linking happens at login, never in this executor. */
export function createBrowserProfileDecisionExecutor(
  context: BrowserDecisionContext,
  resolveIdentity: VerifiedIdentityResolver,
  transport: typeof fetch = fetch,
) {
  const requestContext = Object.freeze({ ...context });
  let verifiedIdentity: Promise<boolean> | undefined;

  return async (data: BrowserDecisionData, options?: PersonalizeOpts): Promise<{ variantId: string }> => {
    if (!requestContext.browserId || !browserIdPattern.test(requestContext.browserId) ||
        !requestContext.contextId || !requestContext.siteName) return neutral();

    verifiedIdentity ??= (async () => {
      const started = performance.now();
      try {
        const identity = await resolveIdentity();
        const available = identity?.provider === 'liberty-mutual-agent' && Boolean(identity.id);
        reportPersonalizationDiagnostic({
          stage: 'identity', identityPresent: available, outcome: available ? 'available' : 'missing',
          elapsedMs: performance.now() - started,
        });
        return available;
      } catch {
        reportPersonalizationDiagnostic({
          stage: 'identity', identityPresent: false, outcome: 'resolver-error', elapsedMs: performance.now() - started,
        });
        return false;
      }
    })();
    if (!await verifiedIdentity || !data.friendlyId.trim() || !data.pageVariantIds?.length) return neutral();

    const started = performance.now();
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let httpStatus: number | undefined;
    let timedOut = false;
    try {
      const url = new URL('/v1/personalize', requestContext.edgeUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return neutral();
      url.searchParams.set('siteId', requestContext.siteName);
      const headers = new Headers({
        'Content-Type': 'application/json',
        'x-sitecore-contextid': requestContext.contextId,
      });
      if (requestContext.userAgent) headers.set('User-Agent', requestContext.userAgent);

      // The pinned SDK's browser-based payload. UDL links this browser to the imported profile.
      // External identifiers suppress browserId in the SDK and are not accepted by this UDL endpoint.
      const body = JSON.stringify({
        channel: data.channel,
        clientKey: '',
        currencyCode: data.currency,
        friendlyId: data.friendlyId,
        language: data.language ?? '',
        params: data.geo && Object.keys(data.geo).length ? { ...data.params, geo: { ...data.geo } } : data.params,
        pointOfSale: '',
        variants: data.pageVariantIds,
        browserId: requestContext.browserId,
      });
      const response = (async () => {
        const result = await transport(url, {
          method: 'POST', headers, body, signal: abort.signal, cache: 'no-store', redirect: 'error',
        });
        httpStatus = result.status;
        if (!result.ok) return { receipt: undefined, ok: false };
        return { receipt: await result.json() as unknown, ok: true };
      })();
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          abort.abort();
          reject(new Error('Native decision deadline exceeded'));
        }, decisionTimeout(options?.timeout));
      });
      const result = await Promise.race([response, deadline]);
      const receipt = result.receipt;
      const candidate = result.ok && receipt && typeof receipt === 'object' &&
        'variantId' in receipt && typeof receipt.variantId === 'string' ? receipt.variantId : '';
      const variantId = candidate && data.pageVariantIds.includes(candidate) ? candidate : '';
      reportPersonalizationDiagnostic({
        stage: 'decision', receiptType: decisionReceiptType(receipt), httpStatus,
        selectedVariant: Boolean(variantId) && variantId !== '_default' && !variantId.endsWith('_default'),
        outcome: result.ok ? 'completed' : 'http-error', elapsedMs: performance.now() - started,
      });
      return { variantId };
    } catch {
      reportPersonalizationDiagnostic({
        stage: 'decision', receiptType: 'undefined', selectedVariant: false, httpStatus,
        outcome: timedOut ? 'timeout' : 'execution-error', elapsedMs: performance.now() - started,
      });
      return neutral();
    } finally {
      clearTimeout(timer);
    }
  };
}
