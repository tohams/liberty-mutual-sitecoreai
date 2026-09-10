# Liberty Mutual Sitecore content model

The portal uses native Sitecore pages and editable datasource fields. Operational account, policy, submission and identity data remain in the authorized application data layer. Native UDL audiences personalize content; they do not authorize business records.

## Native scope and ownership

- Site collection: `/sitecore/content/LibertyMutual`
- Site: `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal`
- Templates: `/sitecore/templates/Project/LibertyMutual`
- Renderings: `/sitecore/layout/Renderings/Project/LibertyMutual`
- Placeholder settings: `/sitecore/layout/Placeholder Settings/Project/LibertyMutual`

`LibertyMutual.Model` permits **CreateAndUpdate** only for the three model roots. `LibertyMutual.Content` permits **CreateOnly** for initial site scaffolding and editorial content. Neither permits deletion. Normal releases push the model module only; existing marketer content is never overwritten by the seed deployment script. No upstream starter module is pushed.

All initial content comes from the source-reviewed brand pack in `docs/brand`. Native IDs, field IDs, route pages and datasource relationships are recorded in `authoring/items/liberty-mutual/content-manifest.json`.

## Component contracts

| Rendering | Editable datasource fields | Variants |
|---|---|---|
| `AgentGuidance` | `eyebrow`: Single-Line Text; `headline`: Single-Line Text; `body`: Rich Text; `actionLink`: General Link | `Default`, `Highlight` |
| `ResourceSearch` | `search`: Multi-Line Text containing the native source ID and field-mapping JSON | `Default` |
| `ResourceArticle` | `Title`: inherited Single-Line Text; `summary`: Multi-Line Text; `body`: Rich Text; `resourceType`: Single-Line Text; `state`: Single-Line Text; `reviewedAt`: Date; `sourceLink`: General Link | `Default` |

Field titles and short help text make the authoring form understandable while retaining predictable developer field names. Rich text fields use the site's rich text profile. General Links provide both label and destination. The renderings use Sitecore's standard flat datasource-field serialization; no custom component GraphQL query is needed. Front-end components use the Content SDK field controls so Page builder can edit them.

`PortalRenderingParameters` inherits the installed SXA headless parameter bases, including rendering variants. `headless-main` is scoped under the Liberty Mutual placeholder folder and explicitly allows these three renderings. The site's Available Renderings group and Headless Variants items expose the matching components and named exports. Adding a new rendering requires the component code, model item, datasource contract and allowed-controls update together.

## Pages and composition

`PortalPage` inherits the tenant-generated `Page`, preserving the installed SXA headless behaviors. It sets the existing Headless Layout and a native default workflow. Direct page composition in `headless-main` is visible and editable in Page builder. Every page's rendering has a stable unique ID and named datasource.

The existing Home item and `/workspace` share the neutral workspace promotion datasource. Other top-level routes are `/quote`, `/clients`, `/products`, `/growth`, `/resources`, and `/support`. Seven family pages sit below `/products`. Twelve resource articles sit below `/resources/<slug>`.

`ResourcePage` derives from `PortalPage`, with route-level `summary`, `body`, `resourceType`, `state`, `reviewedAt`, `sourceLink`, `businessFamily`, `product`, and `channel`. Its inherited page title is `Title` (capital T). Each resource page is its own `ResourceArticle` rendering datasource, so Page builder and native Search read the same authoritative fields. The component accepts `Title` with a `title` fallback for standalone reusable articles. **Search should index resource route pages under Home/resources, not the Data folder.** The rendering datasource picker points to Home/resources and creates/selects ResourcePage items. A marketer edits the resource once; there is no metadata mirror to synchronize.

Resource state is `TX`, `FL`, `IL`, or `All`. It denotes risk-state applicability, not the visitor's office. Native Search configuration can map these stable field IDs to facets. More complex multi-state applicability should replace this initial string with a taxonomy reference before expansion beyond the three selected jurisdictions.

`Data/Guidance` holds reusable workspace guidance, product guidance and campaign promotions. `Data/Resources` retains the 12 unused initial standalone article datasources from the first bootstrap. These are preserved without deletion, are no longer referenced by resource-page layouts, and are excluded from Search. Their IDs are listed as `unusedInitialResourceDatasources` in the manifest. Author active resource content under `Home/resources`; do not edit the unused copies expecting portal changes. Each folder has an insert-options template for its allowed datasource type. Portal page insert options expose `PortalPage` and `ResourcePage`.

## Workflow and publication

The installed **Basic Workflow** is used for pages (`B4F49B23-4BBA-4C79-BA22-F89F5F0D4E4F`). The installed **Basic Datasource Workflow** is used for datasources (`A053ED9F-4099-4682-9411-2B4C98E481E4`). These native workflows were read and referenced; their global definitions and role security were not modified. Their existing Draft/Approve behavior is the sandbox editorial baseline. Customer-specific separation of duties requires assigning and testing customer users and roles later.

Initial source-reviewed bootstrap content is imported in each workflow's Approved state so it can be published. This is a recorded sandbox editorial decision by the implementation process, not a claim that Liberty Mutual corporate reviewers approved the content or that a named customer executed a workflow command. New content receives the existing native workflow through standard values and begins in its configured Draft state. Subsequent approval should be performed through native authoring workflows.

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

The script verifies that the seed module remains CreateOnly with no override rules before allowing a seed push. The generator `authoring/scripts/build-content-seed.py` writes deterministic UUIDv5 items from `docs/brand/portal-content-seeds.json` and records all generated files. Run it deliberately for seed development, not on every application build; it can rewrite the local seed snapshot. It never pushes or publishes.

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

`ResourceSearch` is the first `headless-main` component on `/resources`, followed by AgentGuidance. Its datasource is `Data/Search/AgentResources`; the `search` field stores source `b5e24aff-8b5b-4653-bf66-deef52c1241a` with title=Title, description=summary, state=state, type=resourceType and family=businessFamily mappings. This is editable native CMS configuration for the native Search source. The data adapter and React rendering do not maintain a second configuration constant.

The initial field type is Multi-Line Text so the JSON remains editable while Search Configuration Manager is not yet enabled. The official starter's Search Experience uses a **Plugin** field with Source `pub-958f3b66-0fb0-4675-8808-a5dc40949051`. After enabling and verifying that app in the target environment, change only the ResourceSearch/search model field to that Type/Source; keep its stable field ID and JSON value. Verify the editor and delivery payload before publishing the model. The SDK component must support the equivalent string or object configuration payload. See [Sitecore's JSON template contract](https://doc.sitecore.com/sai/en/developers/sitecoreai/bring-your-own-components/copy-the-search-component-from-the-starter-kit/add-a-json-template-to-a-content-item.html) and the preserved upstream `Search Experience/Data/search.yml` template.

The initial installation updated only the `/resources` page presentation and the site's Available Renderings group through the normal Authoring API. Every other existing content item remained protected by CreateOnly. The source's crawl status and rendered Search response are tracked separately from CMS configuration delivery.
