import type { PersonalizeData, PersonalizeOpts } from '@sitecore-content-sdk/personalize';
import type { PortalBootstrap } from '../../contracts/portal';
import { readPortalBrowserProfileRef } from '../../lib/portal-identity-link';
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
  let verifiedProfile: Promise<{ identityPresent: boolean; ref: string | null }> | undefined;

  return async (data: BrowserDecisionData, options?: PersonalizeOpts): Promise<{ variantId: string }> => {
    const browserId = requestContext.browserId;
    if (!browserId || !browserIdPattern.test(browserId) || !requestContext.contextId ||
        !requestContext.siteName || !data.friendlyId.trim() || !data.pageVariantIds?.length) return neutral();

    const started = performance.now();
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let httpStatus: number | undefined;
    let timedOut = false;
    try {
      const url = new URL('/v1/personalize', requestContext.edgeUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return neutral();
      url.searchParams.set('siteId', requestContext.siteName);
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          abort.abort();
          reject(new Error('Native decision deadline exceeded'));
        }, decisionTimeout(options?.timeout));
      });
      const execute = async () => {
        // Share a fresh lookup only among components in this HTTP request. A personalize
        // cookie can still refer to an anonymous profile from before the explicit login.
        verifiedProfile ??= (async () => {
          const identityStarted = performance.now();
          let available = false;
          try {
            const identity = await resolveIdentity();
            if (abort.signal.aborted) return { identityPresent: false, ref: null };
            available = identity?.provider === 'liberty-mutual-agent' && Boolean(identity.id);
            reportPersonalizationDiagnostic({
              stage: 'identity', identityPresent: available, outcome: available ? 'available' : 'missing',
              elapsedMs: performance.now() - identityStarted,
            });
          } catch {
            if (abort.signal.aborted) return { identityPresent: false, ref: null };
            reportPersonalizationDiagnostic({
              stage: 'identity', identityPresent: false, outcome: 'resolver-error',
              elapsedMs: performance.now() - identityStarted,
            });
          }
          if (!available || abort.signal.aborted) return { identityPresent: false, ref: null };
          const profileStarted = performance.now();
          const ref = await readPortalBrowserProfileRef({ ...requestContext, browserId }, abort.signal, transport);
          if (abort.signal.aborted) return { identityPresent: true, ref: null };
          reportPersonalizationDiagnostic({
            stage: 'profile', outcome: ref ? 'available' : 'unavailable', elapsedMs: performance.now() - profileStarted,
          });
          return { identityPresent: true, ref };
        })();
        const profile = await verifiedProfile;
        if (abort.signal.aborted) return neutral();
        if (!profile.ref) {
          reportPersonalizationDiagnostic({
            stage: 'decision', receiptType: 'undefined', selectedVariant: false, selection: 'none',
            outcome: profile.identityPresent ? 'profile-unavailable' : 'identity-unavailable',
            elapsedMs: performance.now() - started,
          });
          return neutral();
        }
        const headers = new Headers({
          'Content-Type': 'application/json',
          'x-sitecore-contextid': requestContext.contextId,
        });
        if (requestContext.userAgent) headers.set('User-Agent', requestContext.userAgent);
        // The pinned SDK sends BOTH values: native A/B tests require guestRef, while
        // UDL browser-based decisions require browserId. External identifiers differ.
        const body = JSON.stringify({
          channel: data.channel,
          clientKey: '',
          currencyCode: data.currency,
          friendlyId: data.friendlyId,
          language: data.language ?? '',
          params: data.geo && Object.keys(data.geo).length ? { ...data.params, geo: { ...data.geo } } : data.params,
          pointOfSale: '',
          variants: data.pageVariantIds,
          browserId,
          guestRef: profile.ref,
        });
        const response = await transport(url, {
          method: 'POST', headers, body, signal: abort.signal, cache: 'no-store', redirect: 'error',
        });
        if (abort.signal.aborted) return neutral();
        httpStatus = response.status;
        const receipt: unknown = response.ok ? await response.json() : undefined;
        if (abort.signal.aborted) return neutral();
        const candidate = receipt && typeof receipt === 'object' &&
          'variantId' in receipt && typeof receipt.variantId === 'string' ? receipt.variantId : '';
        const variantId = candidate && data.pageVariantIds!.includes(candidate) ? candidate : '';
        const isControl = variantId === '_default' || variantId.endsWith('_default');
        reportPersonalizationDiagnostic({
          stage: 'decision', receiptType: decisionReceiptType(receipt), httpStatus,
          selectedVariant: Boolean(variantId) && !isControl,
          selection: variantId ? isControl ? 'accepted-control' : 'accepted-variant' : response.ok ? 'invalid' : 'none',
          outcome: response.ok ? 'completed' : 'http-error', elapsedMs: performance.now() - started,
        });
        return { variantId };
      };
      return await Promise.race([execute(), deadline]);
    } catch {
      reportPersonalizationDiagnostic({
        stage: 'decision', receiptType: 'undefined', selectedVariant: false, selection: 'none', httpStatus,
        outcome: timedOut ? 'timeout' : 'execution-error', elapsedMs: performance.now() - started,
      });
      return neutral();
    } finally {
      clearTimeout(timer);
    }
  };
}
