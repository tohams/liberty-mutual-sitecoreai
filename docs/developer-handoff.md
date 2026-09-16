# Developer and platform handoff

This guide explains how to operate, change and transfer the Liberty Mutual agent portal. It distinguishes compiled application behavior from tenant configuration and runtime verification. The portal uses native Sitecore content; operational account, policy, submission and production records are fictional fixtures with durable, isolated workspaces.

New to the repository? Begin with the [developer quickstart](developer-quickstart.md). It covers a clean machine setup, isolated local state, native content/Search, and a reversible `ResourceSearch` heading edit in VS Code. The local exercise keeps portal tracking disabled and requires no authoring change or deployment. Return here for model ownership, release, runtime acceptance and transfer.

Use the [presenter runbook](demo-loops.md) for nine capability walkthroughs. Loops 3, 4 and 7 cover operational workflows, state authority and the development/release model; loop 8 adds a native Resources A/B test with its own [configuration and acceptance record](ab-testing.md). Loop 9 covers the separate Products affinity spotlight, verified on production and preview through actual browsing, native scores, both topic variants and a neutral comparison. See the [affinity record](affinity-personalization.md). The shared preparation and reset sections explain pack coordination and environment boundaries.

For optional assistant access to this SitecoreAI tenant and current documentation, follow [Sitecore tools in VS Code](vscode-sitecore-mcp.md). Each developer authorizes their own account. The initial exercise uses read-only tools and is separate from the portal runtime.

## Ownership and architecture

The active rendering host is `liberty-mutual-agent-portal`, at `examples/liberty-mutual-agent-portal`. It uses Next.js App Router, React, TypeScript and the Sitecore Content SDK. Other `examples/` directories retain upstream starter reference code and are not additional customer applications.

| Layer | Responsibility | Change owner |
| --- | --- | --- |
| Native pages and datasources | Page layout, guidance, resource copy, imagery, reusable component variants | Marketing with editorial review |
| Templates, rendering definitions and placeholders | Field contracts and what authors can compose | Sitecore implementers |
| Public contracts and feature UI | Agent workflows, form behavior and presentation | Frontend developers |
| Server adapters | Session validation, agency and reviewer-pack scope, operational actions, native resource metadata | Application developers |
| Redis state provider | Durable state, atomic changes, namespace isolation and expiry | Platform administrators |
| Unified Data Layer | Imported agent identities, profile attributes, native decisions and events | Marketing operations and developers |
| Native Search | Content source, field mappings, indexing and relevance | Search/content administrators |
| Design Studio and Agentic Studio | Brand Kit, approved campaign inputs, agent workflow and review | Marketing operations |

`src/contracts/portal.ts` defines the safe API payload. Server modules never export credentials, Redis configuration or operator keys through bootstrap responses. Protected APIs enforce their own session and agency scope. UI filtering is not the authorization boundary.

`ResourcePage` is the single authority for resource title, summary, body, type, risk state and taxonomy. The native resource item is also its article datasource. Bootstrap hydrates current published metadata from Experience Edge, with small paginated queries; favorites use the stable native item ID. Marketer edits appear through the normal publish workflow, without maintaining a duplicate resource catalog in application code. The explicit local fixture adapter is reserved for isolated engineering tests.

### Licensed-state content relevance

The authenticated agent adapter supplies `licensedStates`; home `state` is not a substitute. Workspace recommendations and the local resource listing share `src/features/resources/resource-state-scope.ts`. Recommendations preserve specialization and relevance, with license diversity as a tie-break. Native `ResourceSearch` composes the same default through `resource-search-facets.ts`: one `Risk state` equality filter whose array contains every license plus the CMS value `All`. The installed Content SDK defines this array as OR. Native Search applies it before pagination and total calculation; the client does not filter a fetched page or invent counts.

The selector defaults to **My licensed states** and offers only active licensed states plus **Nationwide guidance only**, which matches raw `All`. An individual licensed state includes nationwide guidance; there is no broader **All states** override. Other facets intersect this scope. Changing scope or other filters returns to page one; clearing filters restores the licensed default. An empty license list yields nationwide guidance only. Profile/license changes remount Search with the new default. The authenticated resource bootstrap, saved-resource views and direct article delivery also apply the active licensed-state scope. Native verified authoring is a separate context and can edit all resource pages. Transaction actions retain their additional server-side licensing, appointment and agency checks.

This is custom profile-aware query composition using native SitecoreAI Search. The current signed profile comes from the synthetic agent adapter, whose licenses are also represented in the imported UDL profile booleans; this change does not add a native UDL decision rule or duplicate resource copy. A future identity/agent-system adapter should supply the same contract. Published resource metadata stays authoritative. The current three-state resource contract expands CMS `All` to TX/FL/IL; update that mapping, supported-state contract and shared scope helper together when adding another jurisdiction.

Run `node --import tsx scripts/verify-resource-state-search.mjs --public-context PUBLIC_CONTEXT --index NATIVE_INDEX` from the application directory for read-only native Search acceptance. It verifies every page, licensed and explicit scopes, nationwide inclusion, other facets, a text query and empty results against the actual index. Browser acceptance additionally covers login, filter/reset controls, saved articles and contrasting agents.

### Transaction eligibility

Products, submission preparation and bond requests use the shared dated state-eligibility adapter. Every state-sensitive server action rechecks the acting agent, relevant assigned producer, current authority, carrier appointment and product/state rule. UI decisions are explanatory projections; they cannot authorize an action. The [state eligibility runbook](state-eligibility.md) documents the contract, risk-state navigation, saved-work handling, illustrative state differences and deployed acceptance commands. UDL remains the personalization layer; operational authority comes from the server adapter.

The [September 11 eligibility evidence](qa-evidence-2026-09-11.md) records automated checks, deployed cross-agent cases, browser journeys and native platform regression results.

### Products affinity spotlight

The [ProductSpotlight component](../examples/liberty-mutual-agent-portal/src/components/product-spotlight/ProductSpotlight.tsx) replaces the formerly static Products hero with editable `eyebrow`, `headline`, rich-text `body` and General Link `actionLink` fields. Its original artwork is retained. Native Sitecore supplies the datasource/variant; no browser scoring, history-based copy selection or forced treatment is implemented.

`ProductsLayout` exposes only `headless-agent-guidance` and `headless-products-spotlight`. Only the Products landing page receives this layout assignment; shared Sitecore layouts remain unchanged. The server passes the spotlight's native `AppPlaceholder` through `PortalApp.productsSpotlight` into `ProductsScreen.spotlight`. Guidance has its separate `headless-agent-guidance` region; product-detail pages expose that guidance region through `PortalLayout`. See the [component placement matrix](content-model.md#component-placement). The original hero remains when no published placement exists; missing datasource fields retain it in normal rendering and show a selection prompt in editing mode.

The CTA uses the same selected/initial risk-state resolution as Products and the existing authored-link adapter. It preserves valid state context, authored query parameters and anchors; it does not rewrite editor/preview fields or substitute a home state for an invalid state hint. Catalog filtering and server eligibility are independent of spotlight content.

Keep three native stories separate: Workspace `AgentGuidance` selects known role/imported-cohort guidance; Resources `AgentGuidance` remains the existing A/B CTA experiment; Products `ProductSpotlight` is the affinity placement. Products version 2, its dedicated layout/placement, the three approved datasources and the decision table are live. Five `insurance_interest` assignments cover `workers_compensation` and `household`; the Products landing page is untagged. The corrected September 13 journeys used the CMS page name in native page-view data. Actual workers-compensation and household browsing populated native scores and selected both topic variants on preview and production; Elena’s no-affinity profile retained the neutral hero. Earlier failed journeys remain historical evidence. See the [component contract](affinity-personalization.md) and [runtime QA record](qa-affinity-personalization-2026-09-13.md).

The saved **Liberty Mutual - Product interest spotlight** table uses a single built-in **Top Affinity** custom-value String column (`top_affinity_value`) and exact matches for `workers_compensation` and `household`, mapped to their existing datasources. Its inspected UI exposes no affinity-name parameter; it is not explicitly scoped to `insurance_interest`. That is currently the site's only configured affinity name. The documented empty result is `null`; Elena’s no-affinity profile verified neutral delivery on both hosts. A separate raw null-input receipt was not captured. The built-in source inspected in the native UI iterates `profile.traits.affinities` across groups, selects the highest numeric score and retains the first encountered value on equal scores. The published documentation does not specify this tie behavior, and no stable topic ordering or business priority is established. The optional affinity-name parameter belongs to the separate boolean Top Affinity condition, not this saved custom-value input. See the [saved decision contract and runtime checkpoint](affinity-personalization.md#saved-native-decision-and-built-in-contract).

## Environment configuration

Start with the application's `.env.remote.example`. Keep real values out of Git. Separate production, preview and local configuration; do not import a developer's entire environment file indiscriminately.

| Setting | Scope and purpose |
| --- | --- |
| `NEXT_PUBLIC_DEFAULT_SITE_NAME` | `liberty-mutual-agent-portal` |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`; enable another locale only with matching CMS content and application routing |
| `SITECORE_EDGE_CONTEXT_ID` | Server-only SDK context: Live delivery access in production; Preview content access on the dedicated editing host |
| `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID` | Public-scoped child context containing only the required browser resources; never a master Live or Preview context |
| `NEXT_PUBLIC_SITECORE_EDGE_PLATFORM_HOSTNAME` | Approved Edge platform URL, normally `https://edge-platform.sitecorecloud.io` |
| `SITECORE_EDITING_SECRET` | Server-only editing endpoint secret, matching the authorized Sitecore rendering host |
| `PORTAL_SESSION_SECRET` | Server-only random signing secret of at least 32 characters; independently provision per environment |
| `PORTAL_OPERATOR_SECRET` | Separate server-only random reset secret of at least 32 characters; never available to portal users |
| `PORTAL_ENVIRONMENT` | Unique state namespace, for example `liberty-mutual-production` or `liberty-mutual-preview`; production and previews must not share it |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel-connected HTTP Redis credentials; aliases `PORTAL_REDIS_REST_URL` and `PORTAL_REDIS_REST_TOKEN` are also supported |
| `PORTAL_CONTENT_ADAPTER` | `sitecore` for connected environments; `fixtures` is allowed only outside Vercel and production |
| `PORTAL_VERIFIED_PROFILE_GENERATIONS` | Comma-separated generations actually imported and verified in this tenant; never infer from the presence of a JSONL file |
| `NEXT_PUBLIC_PORTAL_TRACKING_ENABLED` | Enable only after profile import, consent handling and native identity/event verification |
| `PERSONALIZE_MIDDLEWARE_EDGE_TIMEOUT` | Positive milliseconds for native campaign discovery; portal default `1500` |
| `PERSONALIZE_MIDDLEWARE_CDP_TIMEOUT` | Positive milliseconds for identity validation, browser-profile lookup and native decision together; portal default `2000`, capped at `10000` |
| `PORTAL_PERSONALIZATION_DIAGNOSTICS` | Opt-in safe stage diagnostics; disabled unless exactly `true`. Reports booleans, fixed outcome/selection categories, receipt type, elapsed milliseconds and an optional numeric HTTP status only |

The portal gives native campaign discovery 1.5 seconds and each decision invocation 2 seconds, replacing the SDK's 400 ms defaults. The decision's single deadline covers the signed-session/profile-generation check, guest-cookie verification or required browser-profile lookup, and native decision, including response-body decoding. The supported timeout environment variables override these values; blank, invalid or nonpositive values use the portal defaults. These are bounded invocation budgets, not a fixed delay or a total page-response deadline. When native personalization cannot complete, the portal keeps neutral guidance and allows operational work to continue. Revalidate both cold and warm request latency, positive and neutral campaign outcomes, and these budgets in the customer's destination hosting region before handoff.

After the signed portal identity and current profile generation are verified, the decision transport follows the pinned SDK's `sc_cid_personalize` guest-ID persistence contract. An HttpOnly signed companion binds that native reference to the current portal session, UDL identity, browser, site, host and Edge context. A valid pair retains the guest reference across navigation; an absent, unbound or invalid pair requires one uncached `browser/show` GET for the current request's `sc_cid`. The response must match that browser before its native `customer.ref` is stored, with expiry capped to the portal login. The resulting profile promise is shared only among component decisions within that HTTP request. Each discovered campaign still receives at most one native decision POST containing this `guestRef` and the same `browserId`; no selected variant is cached, forced or locally assigned. The adapter sends no external agent identifier or email and initializes no shared server analytics state. An unavailable native profile or failed binding remains neutral.

When verifying native engagement, search **Performance → Profiles** by the observed **Client ID**, then inspect the canonical profile's **Engagement**. A `browser/show` `customer.ref` can open a retired alias without sessions; an empty alias view is insufficient evidence of a failed identity link. The adapter follows the pinned SDK's returned-reference contract and does not implement custom alias resolution. Compare the browser/client ID and expected events on the profile found by the native UI.

The shared invocation deadline aborts native transport and is capped at 10 seconds even when a larger timeout is configured. Missing or mismatched browser/profile data, invalid JSON, HTTP failures, unavailable identity and variants outside the native discovery allowlist produce neutral content, without lookup polling or decision retries. Optional diagnostics distinguish `accepted-control`, `accepted-variant`, `invalid` and `none`; they remain disabled by default and do not log profile references, cookies, raw responses or exception messages. `PortalPersonalizeService` preserves the SDK's separate campaign-discovery cache while containing GraphQL failures before the base proxy can log an exception. Discovery diagnostics report only the fixed discovery-unavailable outcome.

Agent navigation and authored resource links use the shared [PortalLink and PortalContentLink wrappers](../examples/liberty-mutual-agent-portal/src/components/ui/portal-link.tsx), which enforce `prefetch={false}`. Use these wrappers for new portal links so speculative framework navigation does not invoke native experiments before a person opens the destination. `PortalContentLink` preserves the SDK field rendering and editing metadata. This policy prevents link prefetch requests; it neither caches nor pins a visitor's native treatment. Preview and production each passed two normal B-to-guide-and-back journeys without extra Resources prefetch requests. The earlier production treatment change did not recur in these journeys, but its exact cause remains unproven. Production also passed an accepted native A-to-guide-and-back journey. Those journeys remain in the [historical A/B runtime record](qa-ab-testing-2026-09-11.md). The replacement Guide CTA experiment had credited goals for both variants in the [September 15 native aggregate report](ab-testing.md#native-configuration-and-acceptance-record). It remained in progress with a small sample; the report does not establish a winner or attribute a goal to a particular earlier journey.

Sitecore master Live and Preview context IDs are secrets. The tenant's Context IDs UI also marks the Edge resource as private. The scoped `liberty-mutual-agent-portal-browser` context contains the Liberty Mutual Site Analytics identifier plus Files and Forms, which the UI automatically adds as required dependencies. It excludes Edge and DemoSite. The separate `liberty-mutual-agent-portal-server-live` and `liberty-mutual-agent-portal-server-preview` contexts include the corresponding private Edge resource and the same portal dependencies. Keep their values in protected server configuration. CI uses the private scoped Live context as a GitHub Actions secret, never as a public variable. See [Sitecore Context IDs](https://doc.sitecore.com/portal/en/developers/sitecore-cloud-portal/context-ids.html) and [scoped context management](https://doc.sitecore.com/portal/en/developers/sitecore-cloud-portal/context-ids/manage-scoped-context-ids.html).

The owner confirmed that the SitecoreAI `Demo` environment is dedicated entirely to this POC. Both original master Context IDs were regenerated on September 10, 2026 at 20:55 UTC. Subsequent content requests using either old master returned `404`; the existing scoped Live and Preview contexts returned `200` with native Home content. All three scoped child values remained unchanged, so Vercel and GitHub configuration required no value changes. Nine ignored local environment files were migrated from old masters to the appropriate server or public browser scope and restricted to mode `0600`. No credential values were committed.

**Credential retirement and functional recovery are verified.** The required SitecoreAI deployment completed with failed CM warm-up, schema population and reindex post actions. Its managed hostname returned Cloudflare error `1000`, then authoritative `NXDOMAIN` after one standard restart was initiated. DNS subsequently recovered; scoped Live/Preview content, the native Page builder canvas and all 37 unchanged production acceptance assertions passed. Both native indexes were successfully repopulated and rebuilt through supported management operations, and direct indexed searches returned the portal Home and populated core/master results at 21:40:58 UTC. The original failed deployment stages and failed acceptance run remain recorded. Index metadata still reports inconsistent counts, and local operating-system DNS lookup retained a negative result during recovery; no DNS configuration was changed. The active authoring outage is resolved and the support draft was not submitted. Customer-role editorial acceptance remains open. Separate native Agentic drafting from complete authored Brand Kit text was verified on September 14. The [consumption repair record](agentic-studio/brand-kit-consumption-repair-2026-09-14.md) preserves the remaining metadata/array projection issue; it does not claim a vendor repair. See the [rotation and recovery evidence](qa-evidence-2026-09-10.md#master-context-id-retirement).

For future master-only regeneration, replace any remaining consumers of the revoked masters and build and deploy the affected SitecoreAI environment. The scoped children survived unchanged in this observed rotation; this is not a guarantee for other tenants or rotation procedures. [Full Deploy secret rotation](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/deploy-app/manage-an-environment/rotate-deploy-secrets-for-your-environments.html) also changes the editing secret and underlying Edge token and explicitly requires updating scoped contexts. It is separate from the [master-only procedure](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/deploy-app/manage-an-environment/context-id-environment-variables.html) performed here.

The provisioned free Redis integration is connected to Vercel Production and Preview. Local development must receive its own provider configuration or explicitly use `PORTAL_STATE_ADAPTER=local-json`. Deployed instances fail clearly when no durable provider is configured; they never fall back to memory or an ephemeral filesystem. Shared preview namespaces are isolated from production but shared among previews; use a separate namespace per preview project when independent review sessions are required.

Do not enable verbose Sitecore editing diagnostics on a shared deployment: the upstream SDK's editing debug path can log secret comparisons. Keep secrets in protected configuration and review logging changes before enabling them.

## Build and continuous integration

The application's `.nvmrc` pins Node.js 24.19.0; the validation workflow reads that same file. The local setup helper has separate preservation and state-isolation checks in `npm run test:setup`, also run by CI.

Node.js 24 is required. `npm ci` installs the committed dependency graph. The app's `npm run build` generates the actual Sitecore component maps and SDK metadata before compiling Next.js. Generated `.sitecore` files are ignored build artifacts, not source files to edit by hand. The component-map configuration excludes tests, fixtures and pure helpers; regeneration must retain the five intended native portal components—`AgentGuidance`, `ResourceArticle`, `ResourceImage`, `ResourceSearch` and `ProductSpotlight`—plus `PartialDesignDynamicPlaceholder` and SDK built-ins. Verify the registration set when adding modules so utility code does not become a CMS rendering.

The active [workflow](../.github/workflows/portal-validation.yml) runs on feature pull requests to `main`, pushes to `main`, and manual dispatch. It pins third-party actions to reviewed commits, grants read-only repository permission and does not retain checkout credentials.

* **Offline validation** runs strict lint and `npm test` across all source tests, including identity readiness, domain/authorization/state/routing tests, followed by read-only seed and UDL contract checks and native CLI validation of the five owned serialization modules. Dependency and CLI restoration use public package networks; no tenant login is needed.
* **Connected production build** generates real SDK artifacts, typechecks and compiles against published Sitecore content. It requires repository **secret** `SITECORE_SERVER_EDGE_CONTEXT_ID` for the private scoped Live context and **variable** `SITECORE_PUBLIC_EDGE_CONTEXT_ID` for the scoped browser context. The optional variable `SITECORE_EDGE_PLATFORM_HOSTNAME` supplies a nondefault Edge URL. No editing, session, Redis or operator credentials are given to PR builds.

Missing public context fails the connected job explicitly. Offline checks do not produce a substitute build, and a skipped or unavailable connected build is not release approval. Configure GitHub branch protection to require both named jobs; configure one approving reviewer, approval of the latest push and resolved conversations. These repository settings must be checked after transfer.

The private scoped context used by CI can read published environment content; it is not browser-safe. Review workflow changes and repository collaborator access accordingly. Fork PRs do not receive repository secrets and cannot pass the connected build without an authorized build context. Never solve a failing PR build by exposing private Edge access, a master context, a Preview context or an administrative token in a public variable.

## Vercel release process

Configure the project root as `examples/liberty-mutual-agent-portal`, framework Next.js, Node.js 24, install command `npm ci`, build command `npm run build`, and production branch `main`. The platform generates output directories automatically.

1. Validate application and model changes in a feature branch. Deploy a preview using preview credentials and its own state namespace.
2. When model changes are needed, use the scoped CLI release below. Review the `--what-if` output before applying a schema change.
3. Publish approved CMS content through the native editorial process. Content publication is separate from Git deployment.
4. Verify preview behavior with the affected personas and reviewer packs, including native editing when its contract changed.
5. Merge the approved PR to `main`. Confirm the resulting Vercel deployment, then run the deployed acceptance checks below.

For a model release, run from the repository root with an authorized CLI environment already configured:

```sh
authoring/scripts/deploy-content.sh ENVIRONMENT --what-if
authoring/scripts/deploy-content.sh ENVIRONMENT
```

Normal scoped releases push `LibertyMutual.Model` and `LibertyMutual.SitePresentation` with `CreateAndUpdate`. Model is limited to four owned roots: templates, renderings, placeholder settings and layouts, each under its `Project/LibertyMutual` path. The layout root contains `PortalLayout`, `ResourcesLayout`, `ResourceArticleLayout`, `ProductsLayout` and `CampaignLayout`; it does not expand scope to the shared layout tree. The [component placement matrix](content-model.md#component-placement) records their exact placeholder and component contracts. The separate `LibertyMutual.SitePresentation` module has nine exact `SingleItem` includes for the site's matching SXA placeholder restrictions, also with `CreateAndUpdate`. The release script pushes Model first, optionally pushes the CreateOnly content, taxonomy and resource-branch seeds when `--seed` is selected, then pushes SitePresentation after its parent folder exists. `--seed-taxonomy` seeds only missing managed-list items on an existing site; `--seed-branch` seeds only the missing blank Resource page structure. The Campaign page branch and API-created editable campaign pages have a separate [explicit provisioning procedure](../authoring/CAMPAIGN-AUTHORING.md#provision-another-environment). The content module excludes the nine exact restriction paths, the separately owned `Data/Taxonomy` subtree, both page branches and the API-created campaign subtrees. All seed modules preserve existing authored items. `--publish` explicitly publishes the owned site and all four model roots. It does not include related items outside that scope. Never run a broad starter-wide serialization push for this portal.

This scoped CLI procedure supports focused model updates. For authoring-environment deployments, `xmcloud.build.json` explicitly includes only `nextjs-starter`, `LibertyMutual.Model` and `LibertyMutual.SitePresentation` as Items as Resources. Initial editorial content, managed taxonomy lists and the editable Resource page branch remain outside that package and use the guarded seed procedure above. The root serialization configuration excludes unused Click Click Launch modules while retaining their files as upstream reference. Removing resource-backed Starter Kit definitions requires rebuilding and deploying the authoring environment; a frontend build or CLI item deletion cannot remove those resource files. Verify all five portal components and existing page layouts after an authoring deployment. The current frontend uses Git-connected Vercel deployment; a SitecoreAI Vercel Deploy App or hosting-provider connection is a separate configuration and acceptance check, not proof supplied by the authoring deployment.

`renderingHosts` is empty in the authoring build configuration because Vercel hosts both the portal and its editing alias. An authoring deployment must not build a second frontend inside Sitecore or change the existing dedicated Liberty Mutual rendering-host item. To deploy authoring source from an authenticated local checkout, use `dotnet sitecore cloud deployment create --environment-id ENVIRONMENT_ID --upload`; use the existing dedicated environment and verify the deployment completes before checking native components. Ordinary frontend commits continue through Vercel.

### Guarded component-placement migration

Existing page presentation needs a separate migration when adopting the four restricted layouts. A normal model release cannot update those authored pages because the content module is CreateOnly. Use [configure-portal-placeholders.cjs](../authoring/scripts/configure-portal-placeholders.cjs) with a reviewed private native baseline, rather than regenerating or overwriting the content seed.

1. Coordinate a pause in author editing. Capture Home and every descendant, plus the owned `Page`, `PortalPage` and `ResourcePage` standard-values items, from the native Authoring API. The baseline must include item identity, path, parent, template, every language/version, and all fields including standard fields. Keep that complete snapshot outside Git; the source seed is not a substitute for a fresh native baseline.
2. Deploy the compatible frontend to production and preview, and update the stable editing alias. Verify the alias still uses Preview context and the editing secret. The compatible delivery code can read the previous published composition during the migration.
3. Release the scoped model containing all four layouts, global component placeholders, the matching site-specific SXA restrictions and versioned template allowlists. Retain the dedicated Vercel rendering host and shared Sitecore Foundation items.
4. Review the read-only placement plan, then apply the same reviewed baseline during the coordinated editing pause:

```sh
node authoring/scripts/configure-portal-placeholders.cjs ENVIRONMENT --baseline /absolute/path/to/reviewed-portal-before.json
node authoring/scripts/configure-portal-placeholders.cjs ENVIRONMENT --baseline /absolute/path/to/reviewed-portal-before.json --apply --journal /absolute/path/to/placeholder-migration-journal.json
```

The helper changes only layout IDs and component placeholder attributes in `__Renderings` and, where needed, `__Final Renderings`. It retains rendering UIDs, datasources, parameters, personalization and experiment rules. It preserves existing creation timestamps and checks all other fields and the version inventory against the baseline before and after each write. When Sitecore materializes a resource-backed page, the first save can reset its creation timestamp. The helper restores only that field in a separate write after matching the reset to the same item, version, exact layout hashes and recent write intent in the private journal. It verifies every protected field again after restoration; an unrelated or unjournaled change stops the migration. Sitecore can generate a thumbnail when saving a page whose thumbnail was blank; the helper accepts and journals only an exact image reference to that same page's generated `System/…/thumbnail_<PAGE_ID>` media item. Existing thumbnails and standard-values thumbnails cannot change. All other content, workflow, version and rule changes remain blocked. It stops on locked items or unexpected changes, journals progress, and can resume only exact reviewed before/after values. The Authoring API does not provide an atomic revision guard, so the coordinated editing pause remains necessary. After an uncertain response, inspect the private journal and rerun the read-only plan before applying again. The helper does not approve, publish, reset experiments or modify workflow.

5. Publish the approved owned pages and four owned model roots through the scoped publication procedure. Confirm completion and allow Edge caches to refresh.
6. Run `validate-content-seed.py` against the updated source snapshots and `node authoring/scripts/verify-edge-content.cjs` against the destination context. Run the [native insertion permission check](#native-page-builder-insertion-permission-check) as well; correct serialized fields and published composition do not prove the editor's resolved permissions. In Page builder, check Home, Products, Learning & resources and an article against the [placement matrix](content-model.md#component-placement): each visible insertion position offers only its assigned component. Verify existing Workspace personalization, the Resources A/B test and the Products affinity spotlight still render with their retained rules.

If native insertion permissions remain broad despite correct placeholder settings, investigate the authoring resolver cache before changing component names or widening the allowlist. During this sandbox's September 14 acceptance, the native editing response offered 17 components even though the guidance setting allowed only AgentGuidance. A guarded native save and restoration of that owned global setting's `Placeholder Key` refreshed the cache; the next response allowed only AgentGuidance, and the other three slots also resolved their correct singleton permissions. Publishing and reloading Page Builder alone had not corrected the stale response. Sitecore documents placeholder-cache refresh behavior in [KB0706490](https://support.sitecore.com/kb?id=kb_article_view&sysparm_article=KB0706490); that older product-specific article is diagnostic context, not a requirement to change SitecoreAI configuration.

Treat a cache refresh as coordinated maintenance with a platform administrator, not an automatic deployment step. Pause authoring, capture every field and version of the exact owned setting, journal each save, preserve its creation timestamp, and restore its exact original key immediately. Verify all fields and versions afterward, allowing only normal update/revision metadata. If a response is uncertain or a save is interrupted, inspect the current value and journal before recovery; never leave a temporary key or retry blindly. Repeat the read-only native permission check and Page Builder acceptance before resuming authoring. Keep this procedure out of normal content editing and never apply it to shared Foundation settings.

### ProductSpotlight release path

After the scoped model and initial datasource seeds are available, apply the Products placement separately from serialization. The [placement helper](../authoring/scripts/configure-product-spotlight.cjs) requires a reviewed, bounded native Products baseline snapshot. Its default is a read-only plan:

```sh
node authoring/scripts/configure-product-spotlight.cjs ENVIRONMENT --baseline /absolute/path/to/reviewed-products-before.json
node authoring/scripts/configure-product-spotlight.cjs ENVIRONMENT --baseline /absolute/path/to/reviewed-products-before.json --apply
```

The helper adds only `ProductSpotlight` to the owned Available Renderings list and creates/resumes the named **Product affinity spotlight** English draft version. In that original feature release, its final-layout delta selected `ProductsLayout` and added the neutral spotlight in `headless-products-spotlight`, while preserving the then-current shared layout, prior page version and existing guidance. The later component-placement migration above establishes the restricted shared layout baseline for all page versions; it retains the existing spotlight instance and affinity rules in the final layout. These are separate migrations. The ProductSpotlight helper journals apply stages, stops on unexpected author changes and makes no automatic remote retries. If a response is uncertain, inspect the journal and run the read-only plan before applying again.

The helper does not approve or publish the page, alter the shared layout, or configure the affinity decision table. Datasource approval is a separate `--approve-datasources` operation with its own read-only preview. For a destination setup, review and approve the native page/datasources, publish the scoped items, then configure and activate the table deliberately. Inspect the current Products page's personalization/A/B status first and retain Workspace and Resources behavior. Record the native IDs, saved Top Affinity mappings, observed scores, neutral behavior and selected variants. Raw custom-value output is optional advanced diagnostics; do not treat tie order as a promised topic priority. App deployment, model release, content publication, native activation and runtime acceptance are separate checks. The current tenant's setup is live. The [affinity QA record](qa-affinity-personalization-2026-09-13.md) records successful production and preview journeys after the event-page-name correction, alongside earlier failures and the unchanged surrounding authoring items.

### Dedicated editing host

The SDK's editing request headers select the page, language, version and edit mode; they do not replace its configured server context ID. The deployed editing host therefore needs a Preview server context, while production uses Live content. A Preview context was verified to return `pageEditing: true` with editable metadata for the owned home page; Live returned normal delivery fields.

Use the [published portal](https://liberty-mutual-agent-portal.vercel.app/login) to verify publication, expiration, personalized delivery and A/B behavior. The editing host can show unpublished and expired CMS items, including in a normal authenticated browser outside Page builder. On September 16, the completed scheduling exercise was absent from Live Experience Edge and returned 404 on production while the editing preview still rendered it. Both HTTP responses were uncached. That difference is expected from the content context, not evidence of a failed unpublish. Use preview for draft authoring and isolated operational work, and validate its content separately from published delivery.

Use a stable editing deployment alias and a separate state namespace. Allow Sitecore to reach that alias; other previews can retain Vercel Authentication. Both `/api/editing/config` and `/api/editing/render` remain protected by the editing secret. Tracking is suppressed for the verified editor route, whose operational data is a safe fixture without an agent identity.

The configuration script defaults to read-only and mutates only the dedicated rendering host and the owned site grouping:

```sh
node authoring/scripts/configure-portal-host.cjs ENVIRONMENT https://EDITING_HOST https://DELIVERY_HOST
node authoring/scripts/configure-portal-host.cjs ENVIRONMENT https://EDITING_HOST https://DELIVERY_HOST --apply
dotnet sitecore publish item -n ENVIRONMENT -p '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Settings/Site Grouping/liberty-mutual-agent-portal' -l en --pt Edge
```

It configures the application, rendering and configuration URLs; assigns that named host to the site; lists the delivery/editing hostnames; and preserves the existing analytics mapping. Regenerate SDK site metadata after publication. The initial CreateOnly seed stays environment-neutral; apply this host configuration after seeding a new tenant. Verify a real native editing canvas before recording editing acceptance.

Keep an environment-to-tenant mapping in the team's private operations inventory. The current UDL verification ledger is scoped to the Safeco Insurance Company of America POC organization and its actual tenant ID; importing its files into another tenant requires new verification and configuration.

## Canonical Home route

My workspace is the existing Sitecore Home item at `/`. Login, the brand link and navigation all use this root URL. The former `/workspace` child is removed and has no redirect or alias. Native workspace personalization must target Home’s existing item and component, and native verification now covers 26 page routes. The seed manifest and validator reject the removed child so a later CreateOnly seed cannot recreate it.

Dated QA records retain their original route names and page counts. They describe the deployment tested on that date; use the current verification commands for the consolidated Home implementation.

## Reviewer accounts, profile identity and reset

There are seven named personas across four agency profiles and four isolated reviewer packs. All 28 fictional portal accounts use the shared password `Sitecore`. The JSON credentials are intentionally fictional handoff material. The provisioning script converts them into salted scrypt hashes for server-only runtime verification. Rotate them by regenerating the hash file and redeploying; never re-use them for customer employees or real insureds.

Each action is scoped to the authenticated agency, reviewer pack and active run. Mutations require an idempotency key and expected state version. A stale tab receives a conflict and must refresh; retrying an identical successful action does not duplicate the work. Eight-hour signed HttpOnly sessions are distinct from native SDK cookies. Login and logout clear only the intended Sitecore identity cookies and the signed guest-reference companion so another persona does not inherit the former browser identity. Saved-work resets keep the same login and profile generation; restarting a pack invalidates its old sessions, so a new login must establish a new binding.

After Page Builder use on the editing alias, an explicit `/login` remains available even in verified Next.js Draft Mode. Successful portal authentication clears the two intended draft cookies before entering the agent workspace; rejected credentials preserve the editor session.

Native campaign targeting follows the browser profile linked by the login's `IDENTITY` event. `PortalPersonalizeProxy` retains the public SDK's campaign discovery, variant grouping and URL rewrites, but its initialization and decision overrides never initialize the SDK's shared analytics context on the server. Each request captures its own existing `sc_cid`, resolved site name and User-Agent, checks that the portal session has an active verified UDL identity, and calls the native decision endpoint using that browser ID. The external agent identifier is used by identity linking, not sent as an alternative decision lookup. The public-scoped browser context is preferred for decisions; the server context remains responsible for content discovery.

After successful app authentication, optional native identity preparation has an **eight-second overall budget**, including authenticated bootstrap fetch and JSON parsing, waiting for previous SDK work, clearing the supported event queue, fresh browser initialization and profile readiness. Timeout or failure still navigates to the workspace. Ordinary tracking has a separate **two-second identity-wait budget** and does not require an existing identified profile to change.

Within the login budget, the native profile-link helper gets **at most six seconds** for its baseline browser/show read, one IDENTITY receipt and bounded browser/show polling until the profile reference changes. It stops as soon as linkage is observed. This observes asynchronous linkage; it never retries a campaign decision or adds a fixed navigation delay. The public analytics adapter is wrapped without mutating it, forcing a fresh browser through its supported `setClientId()` method after prior SDK work has settled. Superseded generations cannot initialize the shared SDK, send an identity or activate a late result. Since the SDK identity transport does not accept an AbortSignal, timeout bounds the caller's wait without claiming the HTTP request was canceled: actual in-flight SDK work remains tracked and blocks another fresh initialization until it settles.

A successful identity-event response alone does not prove that the imported profile is already visible to decisioning. Verify a fresh login and subsequent navigation in the native tenant; neutral content remains valid when linking or decisioning is not ready. The server does not create an anonymous browser, search for another profile, or use fixture attributes to select a native campaign variant. Operational authorization continues to use the signed session and server-owned records regardless of the content variant.

The operator-only reset has two deliberate modes:

* `saved-work` starts a fresh operational run for the selected pack, retaining its native profile generation and prior native history.
* `restart` starts fresh operational work, advances to the next already-verified native profile generation and invalidates that pack's older application sessions. It does not erase native CDP history.

Use the [auth/data runbook](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md) for exact reset commands, state expiry behavior and credential distribution. Reviewers should coordinate pack assignments: agents in one agency and pack intentionally share agency work.

The native import ledger records 112 successfully imported profiles for generations 0–3 in the current tenant. The import's correlation UUID differs from its opaque business identifier. Keep the `liberty-mutual-agent` provider and runtime identity mapping aligned. Do not re-run the export merely to refresh timestamps: new correlation IDs change the verified artifact checksum. Future imports require their own result record before enabling new reset generations.

## Runtime acceptance and evidence

Record the deployment URL, commit, tenant, tester, time, persona, pack and result for each check. Use native platform records or browser/network observations to substantiate native behavior.

| Area | Acceptance evidence |
| --- | --- |
| Access | Logged-out protected routes redirect; APIs return 401; fabricated editing flags do not disclose private data; unknown tenant/locale is rejected |
| Persona isolation | Principal, producer, account-manager and specialty views use the intended scope; another agency or reviewer pack cannot read or mutate the same record |
| Durable work | Create/save/submit, requirements, follow-up, service request and bond workflows survive reload and a new deployment; duplicate requests do not duplicate state |
| Native resource editing | Change an authored title or summary, publish, and verify browse/search/article views agree; favorites survive the metadata change |
| New resource pages and Media | Create two independent Resource page branches with blank fields and local image items; select Media BETA images, verify restricted placement and per-page independence, then publish the intended page subtree and verify the native image URL, alt text and responsive delivery. Recycle only owned practice pages afterward |
| Native UDL | Log in, resolve the intended imported provider identity, observe an event on that profile, and verify switching personas creates the correct association |
| Native personalization | Inspect the published native rule/table, its actual profile context and the resulting component variant for positive and negative profiles |
| Native affinity spotlight | Verify the five tagged pages and untagged Products root; observe the same identified agent's topic-score change and native ProductSpotlight selection with known attributes/state unchanged; verify neutral/comparison behavior and retained eligibility. Production and preview acceptance is recorded in the [affinity record](affinity-personalization.md); verify the actual destination tenant and starting profile for a new run |
| Native A/B testing | Verify the current experiment, A/B copy, goal and allocation; observe normal treatment delivery and accepted native decisions, distinguish control from fallback, and verify same-browser goal events plus native aggregate attribution when processed. Record host-specific results; no statistical winner is required for functional acceptance |
| Native Search | Confirm the owned source indexes authored resource fields and returns relevant state/product guidance from native queries |
| Native Agentic Studio | Verify the campaign workflow and Brand Kit in the tenant, with inputs, generated output and human review recorded; no outbound delivery is implied |
| Session/reset | Logout clears the application session and intended SDK cookies; saved-work and restart resets behave as documented and cannot affect a different pack |
| Usability | Desktop/mobile, keyboard navigation, visible focus, form errors and empty states work; no dead action, placeholder label or unhandled server error remains |

Passing CI verifies code and content contracts. It does not prove that a customer tenant has the correct live decision table, source index or campaign configuration. Keep those acceptance results with the release record rather than treating configuration screens as automatic proof of an end-to-end outcome.

## Recovery and maintenance

For an application regression, promote the previous known-good Vercel deployment and verify its configuration remains compatible with the current model. Revert the code change through a PR. Rollback does not reset Redis work or unpublish CMS changes.

For an editorial regression, restore the appropriate native content version and republish after review. The CreateOnly seed is not a restore mechanism. For a model regression, apply a reviewed compatible correction; do not delete fields or widen module scopes as an emergency shortcut. Export durable state before a schema migration, and keep schema versions backward compatible across adjacent deployments.

`authoring/scripts/build-content-seed.py` regenerates the initial seed and can overwrite the locally captured Resources version 2 experiment layout. Before deliberately running it, preserve the current native authored export; afterward, compare and retain the approved page versions and experiment datasource snapshots. Run the base generator, then `build-product-spotlight-seed.py`, then its `--check` mode and `validate-content-seed.py`, as shown in the [content-model regeneration sequence](content-model.md). The taxonomy generator is also required for the complete seed; run `python authoring/scripts/build-resource-taxonomy-seed.py --check` to verify it. Do not use seed regeneration to capture or restore live experiment configuration.

Dependency updates arrive through Dependabot for the active app and GitHub Actions. Review SDK and Next.js changes together, run the normal checks, and repeat the affected native acceptance paths. Keep the lockfile committed. Monitor Vercel runtime failures, Redis availability/limits, native publishing/indexing status and session errors without logging passwords or full profile payloads.

## Customer ownership transfer

Transfer this repository and this Vercel project to the customer's chosen organization/team using the platforms' supported transfer flows. Re-check the current transfer prerequisites before execution. Transfer or recreate the Redis integration under customer ownership; project transfer alone must not be assumed to transfer its database or billing relationship.

Verify repository access, GitHub App installation scope, project linkage, branch protection, environment configuration, domains and deployment protection after transfer. Check that the customer controls the Sitecore organization, rendering host settings, Brand Kit, Search source, native decision tables, A/B experiment settings/results and Agentic workflow. Re-import and reverify UDL identities if the destination tenant changes. Native A/B configuration, allocation and history are not proven to transfer through item YAML; recreate and verify the test in a new tenant from the [experiment runbook](ab-testing.md), including assignment and goal attribution.

Provision fresh session, operator and integration secrets through the customer's approved channel, update the linked systems, verify operation and then revoke the former access. Deliver the synthetic credential list privately with reviewer-pack assignments and the reset runbook. Complete the same acceptance checks from a customer-owned account before closing handoff.

## Native Page Builder insertion permission check

After releasing layouts or placeholder settings, verify the permissions that Sitecore actually sends to Page Builder. The saved model and published page composition have separate checks; this command reads the native editing metadata used by the component insertion picker.

From the repository root, use an existing authenticated Sitecore CLI environment. The sandbox's environment alias is `demo`; replace that alias if your local CLI configuration uses a different name.

```sh
node authoring/scripts/verify-placeholder-permissions.cjs demo
```

The check resolves the latest native English version of each of the portal's 26 routes, then requests its editing layout with tracking disabled. Every expected placeholder must have exactly one allowed rendering: AgentGuidance in guidance, ResourceSearch in search, ResourceArticle in articles, and ProductSpotlight in the Products spotlight. An extra component, an empty allowlist, missing editing metadata, the wrong page version, or an unexpected placeholder makes the command fail. A broad component list is a failure even when the correct component is also listed.

The output contains page IDs, versions, placeholder keys and allowed rendering IDs. To retain that evidence, add `--report /absolute/path/to/placeholder-permissions.json`; the file must not already exist. The check reads the bearer token from the selected CLI environment, makes no retries or authentication changes, and does not log credentials, raw layouts or editable content. It does not change or publish items. Finish with a Page Builder insertion check on Home, Products, Learning & resources and a resource article, and confirm their existing personalized and tested component instances remain intact.


## Resource metadata lists

The managed vocabularies, custom **Resource metadata** Marketplace app and installation procedure are documented in [resource metadata authoring](resource-metadata-authoring.md). The app ships in the portal repository and preserves the existing scalar text fields used by native Search. The taxonomy seed creates only editable CMS choices; Marketplace registration, installation and access are separate. Keep initial access limited to administrators/owners until restricted-author acceptance and security review approve broader access. The app checks draft workflow, current permissions, field definitions, managed values and revisions, saves only changed fields and verifies readback. Approval, publication and Search **Reindex Content** remain separate operations. Check the guide and registration manifest for the actual installation status before promising the panel is available.

## Resource page creation and images

The [resource authoring guide](resource-page-authoring.md) walks through **Learning & resources → Create a subpage → Resource page**, blank authoring fields and **Browse media library → Media BETA**. Each page receives its own **Data/Resource image** datasource. The article's existing fields remain the sole content and native Search source; there is no second metadata copy or application image catalog to maintain.

`ResourceArticle` contains the restricted SXA dynamic placeholder `headless-resource-image-{*}`. Its `DynamicPlaceholderId=1` resolves the child placement to `/headless-resource-article/headless-resource-image-1`; only `ResourceImage` is permitted there. The native Content SDK Image field retains the Modern Media public-delivery URL and its rendition parameters. The optional caption is local CMS content. Changing a branch affects future page creation, not previously created articles.

Model/rendering changes follow the authoring deployment path, and React/CSS changes follow GitHub and Vercel. The editable blank branch uses the separate **LibertyMutual.ResourcePageBranch** CreateOnly module and is excluded from resource packages. Never replace existing articles with the branch or reseed customer content as part of a routine release. Publishing a new image requires the article's local datasource to be published as well; image-only changes do not require Search reindexing. Use the guide's scoped acceptance and reset steps before recording customer handoff acceptance.
