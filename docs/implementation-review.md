# Implementation review — September 10, 2026

This bounded review checked starter cleanup, brand-asset integrity, CMS field contracts and content-deployment safeguards. It does not replace the connected browser acceptance journeys recorded in the developer handoff.

## Corrections completed

- Removed the unused starter layout, bootstrap analytics path, empty BYOC bundles, utility helpers, unused global/Sass styles and obsolete configuration examples. The active route uses the portal shell, its own analytics integration and native Sitecore placeholders. Native editing handlers, Providers and the partial-design helper remain registered.
- Removed Tailwind and its PostCSS plugin through npm because no active component uses them. Updated the lockfile and app package metadata. The upstream examples and Apache-2.0 attribution remain intact.
- Removed the inherited starter favicon, which Next.js automatically exposed despite the explicit Liberty Mutual icon metadata. The app now uses the official-source Liberty Mutual symbol.
- Replaced runtime logo variants with the verified portable SVGs from the brand pack. All visible path geometry matches the official public source snapshots; explicit fills and dimensions make the assets work outside their source website. Original snapshots remain in `docs/brand/assets`, outside the public bundle. Roboto and its OFL license remain together.
- Added rendering identifier/style support to AgentGuidance and ResourceArticle. ResourceArticle keeps the reviewed-date editing control available even when its value is empty. The frontend review added equivalent Search support and eight deliberately scoped CMS style mappings.
- Added the portal's three rendering IDs to only the site's Dark background and Bordered style applicability lists, preserving existing native applicability. The other six supported options are the native generic alignment/spacing styles. No shared SXA template was changed.
- Replaced the copied starter app README with application-specific startup, verification, editing and handoff guidance.

## Native content contract

`ResourcePage` owns each resource's title, summary, body, taxonomy, source and review date. It is also its own ResourceArticle datasource. The native field `Title` is capitalized; the typed Edge property is `title`. The public resource adapter reads this native metadata, while operational bookmarks and activities use stable IDs. Twelve initial standalone Data/Resources items remain intentionally unused and excluded from Search; their status is documented rather than hidden.

Rich text uses the native rich-text profile, links use General Link fields, and dates use Date fields. Components render them through Content SDK field controls. AgentGuidance exposes Default and Highlight variants. Headless placeholder settings, available renderings and variant names match the registered exports. Earlier connected checks verified all 27 route payloads, editable field values, the ResourcePage typed projection and Search configuration delivery.

The model module permits non-deleting CreateAndUpdate only within the project's templates, renderings and placeholder settings. Initial content remains CreateOnly with no override rules. The seed generator is separate from application builds; explicit additive migrations preserve existing fields. Scoped publishing scripts never select the entire tenant or expand related items.

## Verification

| Check | Result |
|---|---|
| Node.js 24 TypeScript check | Passed after cleanup and date-field correction |
| ESLint | Passed |
| Full SDK map generation and Next.js production build | Passed |
| Canonical brand manifest | All eight file sizes/checksums verified |
| Runtime brand assets | Three portable SVGs plus font/license match canonical assets |
| SVG integrity | All visible paths present in the original official source; no script or foreignObject elements |
| Content seed validator | 229 scoped items, 12 resources and 112 UDL identities passed |
| Sitecore serialization validation | Both scoped modules passed |

## Acceptance boundaries

- A successful Edge response proves published content delivery. The customer-facing Page builder round trip must also confirm selecting a datasource, editing empty and populated fields, switching variants, applying styles, previewing and approving/publishing with the intended customer role. This review does not claim that browser journey was completed.
- ResourceSearch currently stores its configuration in an editable Multi-Line Text JSON field. Enabling the native Search Configuration Manager Plugin field is a tenant follow-up documented in the content model. The initial implementation does not claim that the native plugin editor is enabled.
- The content templates use the tenant's existing Basic workflows. Customer user provisioning, role separation and approval responsibilities need verification with actual handoff users.
- State, product and business-family values are controlled by documented conventions, not yet taxonomy-reference fields. Expand to managed taxonomy references before introducing many jurisdictions or multiple state values per resource.
- Public source review and a sourced logo are not a corporate brand/legal approval. The brand pack distinguishes official facts from original portal design direction, provides source dates, and keeps fictional account data out of published CMS content.

See [the native content model](content-model.md), [brand provenance](brand/README.md) and [developer handoff](developer-handoff.md) for the reproducible commands and remaining tenant acceptance evidence.
