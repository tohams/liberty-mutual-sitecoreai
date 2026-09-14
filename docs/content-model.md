# Liberty Mutual Sitecore content model

The portal uses native Sitecore pages and editable datasource fields. Operational account, policy, submission and identity data remain in the authorized application data layer. Native UDL audiences personalize content; they do not authorize business records.

Native custom-value source and test evidence are maintained separately in [authoring/personalization](../authoring/personalization/README.md). The published small-business growth role value has native test evidence; its decision-table connection and complete browser personalization journey require separate acceptance records. CMS serialization does not deploy that configuration.

## Native scope and ownership

- Site collection: `/sitecore/content/LibertyMutual`
- Site: `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal`
- Templates: `/sitecore/templates/Project/LibertyMutual`
- Renderings: `/sitecore/layout/Renderings/Project/LibertyMutual`
- Placeholder settings: `/sitecore/layout/Placeholder Settings/Project/LibertyMutual`
- Dedicated layouts: `/sitecore/layout/Layouts/Project/LibertyMutual`

`LibertyMutual.Model` permits **CreateAndUpdate** only for the four model roots. `LibertyMutual.Content` permits **CreateOnly** for initial site scaffolding and editorial content. Neither permits deletion. Normal releases push the model module only; existing marketer content is never overwritten by the seed deployment script. No upstream starter module is pushed.

The root `sitecore.json` discovers only the default rendering-host module and the two Liberty Mutual modules. The upstream Click Click Launch files remain in Git as reference, outside this portal's serialization configuration. None of its 55 rendering definitions is used by the portal. The native dependency audit also found no references from Liberty Mutual content or model items to the Starter Kit's templates, branches, settings, placeholders, scripts or media.

`xmcloud.build.json` explicitly packages only `nextjs-starter` and `LibertyMutual.Model` for an authoring-environment deployment. `LibertyMutual.Content` stays outside Items as Resources (IAR); seed it deliberately using the guarded CreateOnly procedure. Resource-backed Starter Kit components cannot be deleted in Content Editor. Rebuild and deploy the authoring environment with this configuration to remove the old resources, then verify the component library and retained page layouts. Keep Sitecore's shared Foundation/Feature components intact. See [Sitecore's build configuration](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/the-sitecoreai-build-configuration/the-sitecoreai-build-configuration.html).

All initial content comes from the source-reviewed brand pack in `docs/brand`. Native IDs, field IDs, route pages and datasource relationships are recorded in `authoring/items/liberty-mutual/content-manifest.json`.

## Component contracts

| Rendering | Editable datasource fields | Variants |
|---|---|---|
| `AgentGuidance` | `eyebrow`: Single-Line Text; `headline`: Single-Line Text; `body`: Rich Text; `actionLink`: General Link | `Default`, `Highlight` |
| `ProductSpotlight` | `eyebrow`: Single-Line Text; `headline`: Single-Line Text; `body`: Rich Text; `actionLink`: General Link | `Default` |
| `ResourceSearch` | `search`: Multi-Line Text containing the native source ID and field-mapping JSON | `Default` |
| `ResourceArticle` | `Title`: inherited Single-Line Text; `summary`: Multi-Line Text; `body`: Rich Text; `resourceType`: Single-Line Text; `state`: Single-Line Text; `reviewedAt`: Date; `sourceLink`: General Link | `Default` |

Field titles and short help text make the authoring form understandable while retaining predictable developer field names. Rich text fields use the site's rich text profile. General Links provide both label and destination. The renderings use Sitecore's standard flat datasource-field serialization; no custom component GraphQL query is needed. Front-end components use the Content SDK field controls so Page builder can edit them.

`PortalRenderingParameters` inherits the installed SXA headless parameter bases, including rendering variants. Each portal component has its own root placeholder under `/sitecore/layout/Placeholder Settings/Project/LibertyMutual`. Each placeholder's nonempty **Allowed Controls** list contains exactly one rendering. The site's Available Renderings group and Headless Variants items expose the four matching components and named exports. Adding a new rendering requires the component code, model item, datasource contract and allowed-controls update together.

### Component placement

| Page | Owned layout | Placeholder → allowed rendering |
|---|---|---|
| Home, workspace, quote, clients, agency growth, support and product-family pages | `PortalLayout` | `headless-agent-guidance` → `AgentGuidance` |
| Learning & resources landing (`/resources`) | `ResourcesLayout` | `headless-resource-search` → `ResourceSearch`; `headless-agent-guidance` → `AgentGuidance` |
| Products landing (`/products`) | `ProductsLayout` | `headless-agent-guidance` → `AgentGuidance`; `headless-products-spotlight` → `ProductSpotlight` |
| Resource articles (`/resources/<slug>`) | `ResourceArticleLayout` | `headless-resource-article` → `ResourceArticle` |

Each owned layout explicitly lists only its applicable root placeholder items in **Layout Service Placeholders**. That field determines which placeholder data is delivered; **Allowed Controls** determines which renderings authors may insert. The application renders those same named placeholders in the appropriate page sections. A component being available in the site library does not make it eligible for every page or position. An empty Allowed Controls list would remove restrictions, so these lists must remain explicit. See [Sitecore's placeholder restrictions](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/sitecoreai-for-developers/content-editor-items/layout/set-placeholder-restrictions.html) and [rendering availability requirements](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/forms/enable-forms-in-the-page-builder.html).

The rendering definitions also record versioned **Allowed on templates** values: `AgentGuidance` permits the tenant's `Page` template used by Home and `PortalPage`; `ResourceSearch` and `ProductSpotlight` permit `PortalPage`; `ResourceArticle` permits `ResourcePage`. These template allowlists supplement the explicit placeholder contract. They do not replace it: the two landing pages share `PortalPage` with other routes, and `ResourcePage` derives from `PortalPage`. The distinct layout and placeholder bindings keep Search, Spotlight and article content in their intended locations without relying on template inheritance to exclude pages.

These are root placeholders, so they do not require dynamic placeholder suffixes. Shared Sitecore Foundation placeholders and the shared Headless Layout remain unchanged. The old project-owned `headless-main` definition is retired from source; no current portal layout or rendering placement should reference it. Normal CreateAndUpdate model releases do not delete obsolete items. Existing environments require the explicit presentation migration described below, followed by verification in Page builder and Experience Edge.

The portal components pass through the native rendering identifier and style classes. Eight style options have scoped CSS mappings: `position-left`, `position-center`, `position-right`, `indent-top`, `indent-bottom`, `indent`, `container-dark-background`, and `sxa-bordered`. The six generic alignment/spacing styles retain their native applicability. The site's Dark background and Bordered style items add only the three portal renderings to their existing Allowed Renderings lists. Other preset styles remain restricted to their upstream renderings, which are not in this portal's component allowlist. This follows [Sitecore's style applicability guidance](https://doc.sitecore.com/xp/en/developers/sxa/101/sitecore-experience-accelerator/recommendations--working-with-themes.html).

For an existing target that already has the initial scaffold, `node authoring/scripts/enable-portal-styles.cjs ENVIRONMENT` performs this explicit additive migration on only those two owned style items and verifies their paths and values first. It preserves existing allowed renderings and never publishes automatically. Publish each of the two exact style paths afterward, without related-item or subtree expansion. Fresh targets receive the same configuration through the CreateOnly seed. This migration does not relax the seed module's content protection.

## Pages and composition

`PortalPage` inherits the tenant-generated `Page`, preserving the installed SXA headless behaviors. Its standard values select the owned `PortalLayout` and a native default workflow. `ResourcePage` overrides the inherited layout with `ResourceArticleLayout`. Home uses the tenant's project-owned `Page` template directly and explicitly selects `PortalLayout`; that Page template's standard values also select `PortalLayout` for newly created direct Page items. Shared Sitecore templates remain unchanged. The Resources and Products landing pages remain `PortalPage` items with explicit `ResourcesLayout` and `ProductsLayout` assignments. No additional page templates are required.

Direct composition in the named placeholders above is visible and editable in Page builder. Every rendering keeps a stable unique ID and its existing datasource. To apply the placement contract to an existing environment, migrate the exact page layout and placeholder attributes in both shared and final presentation fields across all page versions. Preserve rendering UIDs, datasources, parameters, personalization rules, A/B test configuration and other authored values. Publishing the new model alone does not migrate existing page presentation. The CreateOnly content module deliberately leaves existing pages unchanged. See the [Products affinity contract](affinity-personalization.md).

The existing Home item and `/workspace` share the neutral workspace promotion datasource. Other top-level routes are `/quote`, `/clients`, `/products`, `/growth`, `/resources`, and `/support`. Seven family pages sit below `/products`. Twelve resource articles sit below `/resources/<slug>`.

`ResourcePage` derives from `PortalPage`, with route-level `summary`, `body`, `resourceType`, `state`, `reviewedAt`, `sourceLink`, `businessFamily`, `product`, and `channel`. Its inherited page title is `Title` (capital T). Each resource page is its own `ResourceArticle` rendering datasource, so Page builder and native Search read the same authoritative fields. The component accepts `Title` with a `title` fallback for standalone reusable articles. **Search should index resource route pages under Home/resources, not the Data folder.** The rendering datasource picker points to Home/resources and creates/selects ResourcePage items. A marketer edits the resource once; there is no metadata mirror to synchronize.

Resource state is `TX`, `FL`, `IL`, or `All`. It denotes risk-state applicability, not the visitor's office. Native Search configuration can map these stable field IDs to facets. More complex multi-state applicability should replace this initial string with a taxonomy reference before expansion beyond the three selected jurisdictions.

`Data/ProductSpotlight` holds the neutral, workers-compensation and household spotlight datasources. Their native publication and affinity decision mapping are separate from serialization. `Data/Guidance` holds reusable workspace guidance, product guidance and campaign promotions. `Data/Resources` retains the 12 unused initial standalone article datasources from the first bootstrap. These are preserved without deletion, are no longer referenced by resource-page layouts, and are excluded from Search. Their IDs are listed as `unusedInitialResourceDatasources` in the manifest. Author active resource content under `Home/resources`; do not edit the unused copies expecting portal changes. Each folder has an insert-options template for its allowed datasource type. Portal page insert options expose `PortalPage` and `ResourcePage`.

## Workflow and publication

The installed **Basic Workflow** is used for pages (`B4F49B23-4BBA-4C79-BA22-F89F5F0D4E4F`). The installed **Basic Datasource Workflow** is used for datasources (`A053ED9F-4099-4682-9411-2B4C98E481E4`). These native workflows were read and referenced; their global definitions and role security were not modified. Their existing Draft/Approve behavior is the sandbox editorial baseline. Customer-specific separation of duties requires assigning and testing customer users and roles later.

The original source-reviewed bootstrap content was imported in each workflow's Approved state so it could be published. The later ProductSpotlight seeds instead start in Draft; their three live datasources were separately approved and published on September 13, as recorded in the [affinity runbook](affinity-personalization.md). This is a recorded sandbox editorial decision by the implementation process, not a claim that Liberty Mutual corporate reviewers approved the content or that a named customer executed a workflow command. New content receives the existing native workflow through standard values and begins in its configured Draft state. Subsequent approval should be performed through native authoring workflows.

Publication is scoped to the Liberty Mutual model roots and customer content root, in English, to the `Edge` target. The script never omits the path, never requests a whole-database publish and never enables related-item expansion. Experience Edge does not enforce private content ACLs: published items contain reusable synthetic/general guidance only. Agency financial details, briefs, cohort inputs, login credentials and client records must not be placed here.

## Reproduce and maintain

Prerequisites: repository-pinned .NET Sitecore CLI and authenticated environment with required write access. Authentication belongs in ignored local CLI configuration, never in scripts or git. Python 3 plus `authoring/scripts/requirements.txt` is needed only to regenerate YAML from the initial source pack.

```bash
# Validate and inspect a normal model release without making changes.
authoring/scripts/deploy-content.sh ENVIRONMENT --what-if

# Release model changes. Existing author content is untouched.
authoring/scripts/deploy-content.sh ENVIRONMENT

# On an explicitly selected new target, create missing seed items and publish owned content.
authoring/scripts/deploy-content.sh ENVIRONMENT --seed --publish
```

The script verifies that the seed module remains CreateOnly with no override rules before allowing a seed push. The generator `authoring/scripts/build-content-seed.py` writes deterministic UUIDv5 items from `docs/brand/portal-content-seeds.json` and records all generated files. Run it deliberately for seed development, not on every application build; it can rewrite the local seed snapshot. It never pushes or publishes. It can replace locally captured page versions, including Resources v2; preserve and compare the current native exports before deliberately regenerating the initial seed. The separate `build-product-spotlight-seed.py` generator adds only the spotlight model and seeds. Use the guarded placement procedure in the [developer handoff](developer-handoff.md#productspotlight-release-path) for an existing site, rather than regenerating its authored pages.

When deliberately regenerating an initial seed in an isolated checkout, use the Python environment with `authoring/scripts/requirements.txt` installed and run this complete sequence from the repository root:

```bash
python authoring/scripts/build-content-seed.py
python authoring/scripts/build-product-spotlight-seed.py
python authoring/scripts/build-product-spotlight-seed.py --check
python authoring/scripts/validate-content-seed.py
```

The base generator selects the owned page layouts and writes their canonical component positions. The additive generator supplies `ProductsLayout` and the ProductSpotlight model. Run both before validation; the base generator alone is not a complete portal seed. The validator checks each page's effective shared and versioned final layout, each layout's root placeholders, and the allowed component in every position. Regeneration does not install native personalization, experiments or affinity placement. After publication, `node authoring/scripts/verify-edge-content.cjs` checks the canonical placeholders and editable field payloads delivered by Experience Edge.

For the original tenant, the already-created Home item needed a one-time scoped update to install its initial composition. That temporary update rule was removed immediately after the successful seed push. A scoped bootstrap correction repaired GUID scalar serialization and changed resource composition to page-backed datasources; all temporary update rules were removed. A fresh target with the same IDs receives Home through CreateOnly. If a target already has conflicting scaffold IDs or existing authored Home content, perform a reviewed migration; do not weaken the seed module to overwrite it.

Sources: [Sitecore serialization configuration](https://doc.sitecore.com/sai/en/developers/sitecoreai/sitecore-content-serialization/configuration/sitecore-content-serialization-configuration-reference.html); brand and regulator references are recorded in `docs/brand/source-manifest.json`.

After scoped publication, run `node authoring/scripts/verify-edge-content.cjs` with the active application dependencies installed and local Edge environment configured. It checks 27 native page payloads and the ResourcePage GraphQL type projection for the expected component and editable fields, prints only content identifiers, and exits nonzero on failure. It does not use fixtures or an application fallback to prove Edge delivery.

## Verified delivery and schema maintenance

On September 10, 2026, the authenticated Content SDK verified all 27 native routes: Home, seven workspace/navigation pages, seven product hubs and twelve resource articles. Resource pages delivered their own editable Title, summary, rich-text body and taxonomy fields through ResourceArticle. The GraphQL schema projected ResourcePage with typed title, summary, body, state, resourceType, reviewedAt, sourceLink, businessFamily, product and channel. These checks used native Edge content, not fixtures.

Native Sitecore field `Title` becomes the typed GraphQL property `title`; generic `field(name: "Title")` retains the original spelling. Resource listing queries should paginate at ten items per request to stay within the tenant's query complexity budget.

The seed generator emits Sitecore-compatible YAML: double-quoted GUID scalars, literal `|` blocks, long unwrapped lines and language-level fields before versions. Generic YAML single-quoted scalars and `|-` blocks are not accepted consistently by the installed serializer. The generated model is verified again with Sitecore serialization, native template inheritance and Edge field payloads.

If Edge returns an `UnknownItem` for a newly serialized template even though generic fields are present, use the narrowly scoped `node authoring/scripts/refresh-template-schema.cjs ENVIRONMENT` command to re-save only this project's template metadata through the normal Authoring API. It preserves field definitions. Then republish `/sitecore/templates/Project/LibertyMutual` with subitems to Edge. The initial bootstrap used this native template-save path and a scoped republish to verify ResourcePage projection. The normal CLI token is read from ignored local configuration; it is never displayed or persisted by the helper.

Allow 30–90 seconds after the final publishing job for Edge cache invalidation before interpreting stale schema results. See Sitecore's [publishing process](https://doc.sitecore.com/sai/en/developers/sitecoreai/experience-edge/publishing-to-experience-edge/the-publishing-process.html), [template projection](https://doc.sitecore.com/sai/en/developers/sitecoreai/experience-edge/experience-edge-apis/the-experience-edge-schema.html) and [Authoring API authorization](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/sitecore-authoring-and-management-graphql-api/walkthrough--enabling-and-authorizing-requests-to-the-authoring-and-management-api.html).

## Native resource search composition

`ResourceSearch` occupies `headless-resource-search` on `/resources`; AgentGuidance follows in `headless-agent-guidance`. Only `ResourcesLayout` exposes the Search placeholder. Its datasource is `Data/Search/AgentResources`; the `search` field stores source `b5e24aff-8b5b-4653-bf66-deef52c1241a` with title=Title, description=summary, state=state, type=resourceType and family=businessFamily mappings. This is editable native CMS configuration for the native Search source. The data adapter and React rendering do not maintain a second configuration constant.

The native content source is **Liberty Mutual Agent Resources**. Its indexed fields are a snapshot of published ResourcePage content, not a live read of each article. After publishing resource changes, open **Content → Search Sources**, confirm the source ID above, and choose **Reindex Content**. Verify job completion and the changed result fields before recording Search acceptance. Repeat that refresh after publishing restored rehearsal wording. The repository does not configure an automatic publish trigger or ingestion schedule for this source. [Sitecore's content-source documentation](https://doc.sitecore.com/sai/en/users/sitecoreai/design-components/search-experiences/manage-content-sources.html) specifies an initial ingestion when a source is created and an explicit reindex for subsequent content changes. This source refresh is separate from Edge cache invalidation and from the internal CMS core/master indexes.

The authored `state` values are `TX`, `FL`, `IL` or `All` (nationwide guidance). The signed-in Search default combines the agent's licensed states with `All` in one native OR facet filter. An explicit All states choice removes that restriction. This behavior is application query composition; no content or native campaign rule change is needed. See the [developer handoff](developer-handoff.md#licensed-state-content-relevance).

The initial field type is Multi-Line Text so the JSON remains editable while Search Configuration Manager is not yet enabled. The official starter's Search Experience uses a **Plugin** field with Source `pub-958f3b66-0fb0-4675-8808-a5dc40949051`. After enabling and verifying that app in the target environment, change only the ResourceSearch/search model field to that Type/Source; keep its stable field ID and JSON value. Verify the editor and delivery payload before publishing the model. The SDK component must support the equivalent string or object configuration payload. See [Sitecore's JSON template contract](https://doc.sitecore.com/sai/en/developers/sitecoreai/bring-your-own-components/copy-the-search-component-from-the-starter-kit/add-a-json-template-to-a-content-item.html) and the preserved upstream `Search Experience/Data/search.yml` template.

The initial installation updated only the `/resources` page presentation and the site's Available Renderings group through the normal Authoring API. Every other existing content item remained protected by CreateOnly. The source's indexing status and rendered Search response are tracked separately from CMS configuration delivery.
