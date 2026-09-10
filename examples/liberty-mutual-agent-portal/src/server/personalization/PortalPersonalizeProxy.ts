import 'server-only';
import { PersonalizeProxy, type PersonalizeProxyConfig } from '@sitecore-content-sdk/nextjs/proxy';
import { personalize } from '@sitecore-content-sdk/personalize';
import type { PortalBootstrap } from '../../contracts/portal';
import { createIdentifiedExperienceExecutor } from './identified-experience';

/** Keep native discovery, campaign decisions, variant validation and rewrites; supply the verified login identity. */
export class PortalPersonalizeProxy extends PersonalizeProxy {
  private readonly executeIdentifiedExperience;

  constructor(config: PersonalizeProxyConfig, resolveIdentity: () => Promise<PortalBootstrap['udlIdentity']>) {
    super(config);
    this.executeIdentifiedExperience = createIdentifiedExperienceExecutor(resolveIdentity, personalize);
  }

  /** Share only native campaign discovery/cache; each request gets an isolated identity closure. */
  forRequest(resolveIdentity: () => Promise<PortalBootstrap['udlIdentity']>) {
    return new PortalPersonalizeProxy({
      ...this.config,
      ...(this.personalizeService && { personalizeService: this.personalizeService }),
    }, resolveIdentity);
  }

  protected override async personalize({ params, friendlyId, language, timeout, variantIds, geo }: Parameters<PersonalizeProxy['personalize']>[0]) {
    return this.executeIdentifiedExperience({
      channel: this.config.channel || 'WEB',
      currency: this.config.currency ?? 'USD',
      friendlyId,
      params,
      language,
      pageVariantIds: variantIds,
      ...(geo && { geo }),
    }, { timeout });
  }
}
