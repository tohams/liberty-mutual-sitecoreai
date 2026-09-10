import { PersonalizeService } from '@sitecore-content-sdk/content/personalize';
import type { GraphQLClient } from '@sitecore-content-sdk/core';
import { reportPersonalizationDiagnostic } from './diagnostics';

/** Preserve SDK discovery/cache behavior while keeping raw GraphQL failures out of the proxy logger. */
export class PortalPersonalizeService extends PersonalizeService {
  protected override getGraphQLClient(): GraphQLClient {
    // The SDK client owns a mutable timeout handle. Share cached discovery, never that handle.
    return {
      request: <T>(...args: Parameters<GraphQLClient['request']>) => super.getGraphQLClient().request<T>(...args),
    };
  }

  override async getPersonalizeInfo(...args: Parameters<PersonalizeService['getPersonalizeInfo']>) {
    const started = performance.now();
    try {
      return await super.getPersonalizeInfo(...args);
    } catch {
      reportPersonalizationDiagnostic({
        stage: 'discovery', outcome: 'unavailable', elapsedMs: performance.now() - started,
      });
      return undefined;
    }
  }
}
