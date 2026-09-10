import type { PersonalizeData, PersonalizeOpts } from '@sitecore-content-sdk/personalize';
import type { PortalBootstrap } from '../../contracts/portal';
import { decisionReceiptType, reportPersonalizationDiagnostic } from './diagnostics';

type IdentityResolver = () => Promise<PortalBootstrap['udlIdentity']>;
type ExperienceExecutor = (data: PersonalizeData, options?: PersonalizeOpts) => Promise<unknown>;

/** One closure per request. A missing verified identity must never fall back to a previous browser profile. */
export function createIdentifiedExperienceExecutor(resolveIdentity: IdentityResolver, execute: ExperienceExecutor) {
  let identity: ReturnType<IdentityResolver> | undefined;
  return async (data: PersonalizeData, options?: PersonalizeOpts): Promise<{ variantId: string }> => {
    identity ??= (async () => {
      const started = performance.now();
      try {
        const resolved = await resolveIdentity();
        reportPersonalizationDiagnostic({
          stage: 'identity', identityPresent: Boolean(resolved), outcome: resolved ? 'available' : 'missing',
          elapsedMs: performance.now() - started,
        });
        return resolved;
      } catch {
        reportPersonalizationDiagnostic({ stage: 'identity', identityPresent: false, outcome: 'resolver-error', elapsedMs: performance.now() - started });
        return null;
      }
    })();
    const identifier = await identity;
    if (!identifier) return { variantId: '' };
    const started = performance.now();
    try {
      const result = await execute({ ...data, identifier }, options);
      const variantId = result && typeof result === 'object' && 'variantId' in result && typeof result.variantId === 'string' ? result.variantId : '';
      reportPersonalizationDiagnostic({
        stage: 'decision', receiptType: decisionReceiptType(result),
        selectedVariant: Boolean(variantId) && variantId !== '_default' && !variantId.endsWith('_default'), outcome: 'completed',
        elapsedMs: performance.now() - started,
      });
      return { variantId };
    } catch {
      reportPersonalizationDiagnostic({ stage: 'decision', receiptType: 'undefined', selectedVariant: false, outcome: 'execution-error', elapsedMs: performance.now() - started });
      return { variantId: '' };
    }
  };
}
