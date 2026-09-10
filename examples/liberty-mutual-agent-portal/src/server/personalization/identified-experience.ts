import type { PersonalizeData, PersonalizeOpts } from '@sitecore-content-sdk/personalize';
import type { PortalBootstrap } from '../../contracts/portal';

type IdentityResolver = () => Promise<PortalBootstrap['udlIdentity']>;
type ExperienceExecutor = (data: PersonalizeData, options?: PersonalizeOpts) => Promise<unknown>;

/** One closure per request. A missing verified identity must never fall back to a previous browser profile. */
export function createIdentifiedExperienceExecutor(resolveIdentity: IdentityResolver, execute: ExperienceExecutor) {
  let identity: ReturnType<IdentityResolver> | undefined;
  return async (data: PersonalizeData, options?: PersonalizeOpts): Promise<{ variantId: string }> => {
    identity ??= resolveIdentity().catch(() => null);
    const identifier = await identity;
    if (!identifier) return { variantId: '' };
    const result = await execute({ ...data, identifier }, options);
    if (!result || typeof result !== 'object' || !('variantId' in result) || typeof result.variantId !== 'string') {
      return { variantId: '' };
    }
    return { variantId: result.variantId };
  };
}
