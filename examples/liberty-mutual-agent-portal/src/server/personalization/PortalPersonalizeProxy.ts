import 'server-only';
import { PersonalizeProxy, type PersonalizeProxyConfig } from '@sitecore-content-sdk/nextjs/proxy';
import { createGraphQLClientFactory } from '@sitecore-content-sdk/content/client';
import { createBrowserProfileDecisionExecutor, type VerifiedIdentityResolver } from './browser-profile-decision';
import { PortalPersonalizeService } from './PortalPersonalizeService';
import { createGuestProfileCookieStore } from './guest-profile-cookie';
import type { PortalSession } from '../auth/session';

/** Keep native discovery and rewrites; decisions use a request-local, already-linked browser profile. */
export class PortalPersonalizeProxy extends PersonalizeProxy {
  private executeBrowserDecision?: ReturnType<typeof createBrowserProfileDecisionExecutor>;

  constructor(
    config: PersonalizeProxyConfig,
    private readonly resolveIdentity: VerifiedIdentityResolver,
    private readonly transport: typeof fetch = fetch,
    private readonly session?: PortalSession,
  ) {
    super({
      ...config,
      ...(config.contextId && {
        personalizeService: config.personalizeService ?? new PortalPersonalizeService({
          clientFactory: createGraphQLClientFactory({
            api: { edge: { contextId: config.contextId, clientContextId: config.clientContextId, edgeUrl: config.edgeUrl } },
          }),
          timeout: config.edgeTimeout,
          scope: config.scope,
          fetch,
        }),
      }),
    });
  }

  /** Share only native campaign discovery/cache; never use the SDK's global analytics context. */
  forRequest(resolveIdentity: VerifiedIdentityResolver, session?: PortalSession) {
    return new PortalPersonalizeProxy({
      ...this.config,
      ...(this.personalizeService && { personalizeService: this.personalizeService }),
    }, resolveIdentity, this.transport, session);
  }

  protected override async initPersonalizeServer({ siteName, request, response }: Parameters<PersonalizeProxy['initPersonalizeServer']>[0]) {
    const contextId = this.config.clientContextId || this.config.contextId || '';
    const browserId = request.cookies.get('sc_cid')?.value;
    this.executeBrowserDecision = createBrowserProfileDecisionExecutor({
      siteName,
      browserId,
      userAgent: request.headers.get('user-agent') || undefined,
      contextId,
      edgeUrl: this.config.edgeUrl || 'https://edge-platform.sitecorecloud.io',
    }, this.resolveIdentity, this.transport, this.session && browserId ? createGuestProfileCookieStore({
      request, response, session: this.session, browserId, contextId, siteName,
      hostname: request.nextUrl.hostname,
    }) : undefined);
  }

  protected override async personalize({ params, friendlyId, language, timeout, variantIds, geo }: Parameters<PersonalizeProxy['personalize']>[0]) {
    if (!this.executeBrowserDecision) return { variantId: '' };
    return this.executeBrowserDecision({
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
