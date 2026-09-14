# Component placement acceptance — September 14, 2026

The portal uses four named placeholders and four page layouts to control component placement. Each placeholder allows exactly one component. These settings are deployed to the dedicated SitecoreAI environment, and the matching frontend is deployed to production and the stable editing host.

## Page Builder checks

The actual **Layers → Insert into** picker was checked in a fresh Page Builder session. Each picker offered only the component shown below; the other portal components and shared library components were absent.

| Page | Placeholder | Only available component |
| --- | --- | --- |
| Home | `headless-agent-guidance` | `AgentGuidance` |
| Learning & resources | `headless-resource-search` | `ResourceSearch` |
| Learning & resources | `headless-agent-guidance` | `AgentGuidance` |
| Products & appetite | `headless-products-spotlight` | `ProductSpotlight` |
| Products & appetite | `headless-agent-guidance` | `AgentGuidance` |
| Build a stronger BOP submission | `headless-resource-article` | `ResourceArticle` |

The existing Resources guidance retained its A/B-test indicator. Products retained the personalized ProductSpotlight instance. Article content remained editable through ResourceArticle. Temporary browser tabs were closed after verification.

## Native and published checks

- The native editing-metadata check passed for all **27 latest English page versions**, including Products v2, Resources v2 and the Texas resource article v7. Every expected placeholder returned exactly one allowed rendering.
- The published Experience Edge check passed for all **27 routes**, including their component composition, editable fields, native Search configuration and resource template projection.
- The migration audit verified all **249 existing items and 257 versions**, ten new definitions and six supplemental definitions. All **38 final-layout values** across pages and standard values remained byte-identical. Editorial content, workflow, creation dates, rendering UIDs, datasources, personalization, experiments and the editing-host assignment were preserved.
- Sitecore generated thumbnails for previously blank page-thumbnail fields. Each accepted image reference was verified against that page's own generated media path. Existing nonblank thumbnails were preserved.

The native authoring resolver initially returned a stale list of 17 components despite the saved allowlists. A guarded save and restoration of an owned placeholder key refreshed that cache. Native metadata and all six Page Builder checks then returned the correct singleton lists. The diagnostic insertion made before that correction was undone, and Home's exact protected fields were restored and verified against the saved baseline. No diagnostic component remains.

## Repeat the acceptance checks

From the repository root, with the existing authenticated Sitecore CLI environment and the approved application environment configuration:

```sh
node authoring/scripts/verify-placeholder-permissions.cjs demo
node authoring/scripts/verify-edge-content.cjs
node --test authoring/scripts/*.test.cjs
```

The native verifier is read-only, disables tracking and reports identifiers and permissions without logging credentials or content. Its regression fixture includes the original broad-list failure, so simply including the correct component among extra choices cannot pass. See the [placement matrix](content-model.md#component-placement) and [release and maintenance procedure](developer-handoff.md#native-page-builder-insertion-permission-check).
