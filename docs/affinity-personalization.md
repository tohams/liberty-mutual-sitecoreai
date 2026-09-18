# Products spotlight affinity personalization

**Status — September 13, 2026 (UTC):** affinity personalization is working on production and the designated preview. Ordinary Daniel and Maya journeys built workers-compensation and household affinities in their native SitecoreAI profiles, then selected the matching authored Products spotlights. Both topic snapshots reached 2 views and score 1.00, with the same known attributes and selected risk states. Elena’s no-affinity comparison remained neutral on both hosts. The correction sends the CMS page name in the native page-view event. See the [runtime QA record](qa-affinity-personalization-2026-09-13.md).

[PR #21](https://github.com/tohams/liberty-mutual-sitecoreai/pull/21) merged on September 13, 2026 at 17:08:16 UTC as `b99e3ca07ee2932ee69cd5531dda7004e6fd4213`. Vercel deployed that commit to the [production portal](https://liberty-mutual-agent-portal.vercel.app/login), where both actual topic journeys, the neutral comparison and all 37 existing Workspace personalization checks passed. The [designated preview](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login) had already passed both topics, a neutral comparison and the same 37-check regression on `cd96c0d`. Application validation and historical failures are retained in the QA record.

## Three independent capabilities

For a new live demonstration, use the [production portal](https://liberty-mutual-agent-portal.vercel.app/login) and an assigned reviewer pack. The historical preview observations below remain evidence for those deployments; the current editing host has Preview content access and is intended for draft inspection and isolated saved work. A rendered preview variant does not establish current published targeting. Original seed identities can share native history across hosts. New on-demand restart sets are scoped to the selected environment, so always read the active identifier rather than infer it from a username and generation.

| Capability | Surface | Selection input | Current evidence |
| --- | --- | --- | --- |
| Known-attribute personalization | Workspace `AgentGuidance` | Native UDL identity, imported growth-cohort boolean and agent role | Existing live decision table and connected delivery evidence; see [native configuration](../authoring/personalization/README.md). |
| A/B optimization | Resources `AgentGuidance` CTA | Native experiment allocation | Existing Resources test; see [A/B record](ab-testing.md). Its allocation and results are independent of affinity targeting. |
| Affinity personalization | Products `ProductSpotlight` hero | Built-in Top Affinity custom value derived from visits to tagged pages | Production and preview: both native topic scores, authored selections, state-preserving CTAs and the neutral comparison verified. |

`ProductSpotlight` replaces the formerly static Products hero. It is a separate component and placement from either `AgentGuidance` use. Keep the existing Workspace rules and Resources experiment intact. The [Resources A/B setup](ab-testing.md#native-setup-and-verification) records the native restriction on testing a personalized page; a second component on Resources would not create an independent page.

## Component and layout contract

The registered component name is **`ProductSpotlight`**, with the standard `Default` export. [ProductSpotlight.tsx](../examples/liberty-mutual-agent-portal/src/components/product-spotlight/ProductSpotlight.tsx) renders the fields in [its sidecar props contract](../examples/liberty-mutual-agent-portal/src/components/product-spotlight/product-spotlight.props.ts):

| Field | Sitecore type | Rendering |
| --- | --- | --- |
| `eyebrow` | Single-Line Text | Editable eyebrow above the headline |
| `headline` | Single-Line Text | Editable `h2` |
| `body` | Rich Text | Authored explanatory content |
| `actionLink` | General Link | Optional resource/action CTA |

The component retains the existing Products artwork. Sitecore supplies authored fields and native variant selection. The browser does not calculate affinity scores, inspect page history to choose copy, or force a treatment. The existing personalization proxy continues to discover and validate native selections.

The dedicated [ProductsLayout](../authoring/items/liberty-mutual/items/layouts/LibertyMutual/ProductsLayout.yml) (`75cfc4f6-9a69-52b3-97c3-11a6f1fabe89`) declares only **`headless-agent-guidance`** and **`headless-products-spotlight`**. The spotlight's [placeholder settings](../authoring/items/liberty-mutual/items/placeholders/LibertyMutual/headless-products-spotlight.yml) allow only `ProductSpotlight`. Products English version 2 has this dedicated layout and spotlight placement, and the owned Available Renderings list includes the component. Shared Sitecore layouts remain unchanged. The [manifest](../authoring/items/liberty-mutual/content-manifest.json) records the page, layout, rendering, placeholder and datasource identifiers; live delivery must be verified separately from model definitions and saved native placement.

On `/products`, the server creates the spotlight `AppPlaceholder` and passes it through `PortalApp.productsSpotlight` into `ProductsScreen.spotlight`. Guidance uses `headless-agent-guidance` and retains its separate position. Product detail pages use `PortalLayout`, which exposes only that guidance region. Until a published spotlight placement exists, the original static hero remains. An empty datasource also retains that fallback in normal rendering; editing mode shows a datasource-selection prompt.

The action link carries valid selected risk state, including the same initial home-state fallback used by Products. Invalid state hints do not silently switch to the home state. Authored query parameters, anchors and editing metadata are preserved; editor/preview links are not rewritten. Portal links continue to disable speculative prefetch. These are navigation behaviors, not affinity inputs or eligibility decisions.

The three datasource seeds under `Data/ProductSpotlight` are:

| Datasource | Headline | CTA destination |
| --- | --- | --- |
| `neutral` | Protection built around the business you know. | No CTA |
| `workers_compensation` | Build a stronger workers compensation conversation | `/resources/build-a-bop-submission` — “Review account preparation” |
| `household` | Make the next household renewal conversation count | `/resources/prepare-a-household-renewal` — “Review the household renewal checklist” |

Seeds start in workflow Draft. All three native datasources have now been approved through the verified datasource workflow and published; both topic variants map to these existing items. Approval, publication and decision mapping remain separate operations when reproducing the setup. The workers-compensation CTA currently leads to the general account-preparation resource shown above; it should not be described as a dedicated workers-compensation checklist.

## Saved native affinity assignments

Native Affinities was available and the following assignments were saved for `liberty-mutual-agent-portal`. Names and values must match exactly when conditions are configured.

| Page | Affinity name | Affinity value |
| --- | --- | --- |
| `/resources/texas-workers-compensation` | `insurance_interest` | `workers_compensation` |
| `/resources/illinois-workers-compensation` | `insurance_interest` | `workers_compensation` |
| `/resources/florida-workers-compensation` | `insurance_interest` | `workers_compensation` |
| `/resources/prepare-a-household-renewal` | `insurance_interest` | `household` |
| `/products/personal` | `insurance_interest` | `household` |

The `/products` landing page is intentionally **untagged**. Returning to see the spotlight must not itself add evidence for the interest that selected it. A subsequent visit to a tagged resource is a separate browsing signal.

Sitecore calculates interest scores from visits to pages with assigned affinities. It supports Top Affinity conditions and custom conditions for selecting authored variants. This does not prove reading completion, intent to transact or business eligibility. See [affinity setup](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities/set-up-affinities-for-a-site.html) and [affinity personalization](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities/personalize-a-page-using-affinities.html). Availability is phased across environments; availability observed here is not a deployment guarantee for another tenant.

## Page-event contract

Affinity assignments use the Sitecore site name and the **CMS page name**. The native Affinities editor stores each page under `siteConfigs[site.name].pageConfigs[page.name]`. A route such as `/resources/illinois-workers-compensation` therefore has the affinity lookup name `illinois-workers-compensation`.

[PortalTracking](../examples/liberty-mutual-agent-portal/src/features/analytics/PortalTracking.tsx) obtains that name from `page.layout.sitecore.route.name`. The Sitecore SDK page-view event must send it as `page`, alongside the SDK-generated `pageVariantId` and the route language. The URL path remains useful for navigation and local duplicate-event control; it must not replace the CMS page name in the native event. Content authors can change display titles independently of the underlying item name.

The original integration sent `page: path`. Its events reached the identified UDL profile and carried valid variant identifiers, but the event page name did not match the saved affinity page key. The correction aligns the event with the authored item; it does not add client-side scoring, new affinity tags or synthetic profile scores. Production and preview demonstrated native score population and authored selection for both topics; the [QA record](qa-affinity-personalization-2026-09-13.md) records the actual journeys. Sitecore's [standard page-view implementation](https://doc.sitecore.com/sdk/en/developers/006/cloud-sdk/cloud-sdk-events-browser-pageview.html) likewise sends `route.name`.

Sitecore updates scores during a session and saves them to the profile when the session ends. A closed-session check is useful when diagnosing an empty profile, but closing a session is not a prerequisite for within-session personalization. See [affinity behavior and retention](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities/index.html).

## Saved native decision and built-in contract

The saved table is **Liberty Mutual - Product interest spotlight**. It has one String input column using the built-in **Custom Value → Top Affinity**, native identifier `top_affinity_value`, and two exact-match rules:

| Returned value | Authored datasource |
| --- | --- |
| `workers_compensation` | `Data/ProductSpotlight/workers_compensation` |
| `household` | `Data/ProductSpotlight/household` |

The original component uses `Data/ProductSpotlight/neutral`. A `null` or unmatched string should match neither topic row and retain the original component. Production and preview verified neutral content for an independently checked Elena profile with no affinities. A separate raw `null` input receipt was not captured; acceptance correlates native profile traits, the saved table and the rendered component.

Sitecore documents the built-in custom value as the highest affinity value in the visitor profile, returning `null` when there are no valid affinities. The published documentation does not specify equal-score resolution. [Decision-table input contract](https://doc.sitecore.com/sai/en/users/sitecoreai/component-personalization/decision-tables/decision-table-inputs.html).

The built-in source displayed in the native UI was inspected during the September 13 UTC verification. It iterates the groups and values under `profile.traits.affinities`, reads each score as `value.score ?? value.value ?? 0`, and replaces the selected name only when a numeric score is strictly greater than `topScore`, initially `-1`. Equal scores therefore retain the first value encountered by that iteration. This is observed implementation behavior, not a documented topic-priority guarantee: the saved decision-row order does not resolve the tie, and the source inspection does not establish stable profile-value ordering. Verify the current built-in again when reproducing the setup; no copied expression is installed in the portal.

The inspected native Custom Value input exposes no affinity-name parameter. Treat this as an unscoped profile-level value, not an input explicitly restricted to `insurance_interest`. The current site has only that affinity name configured, so the two values are unambiguous in this setup. If another affinity name is added, review the resulting competition and name-scoping requirement before reusing these assumptions. Cross-site aggregation is not established by the inspected contract.

The separate boolean **Top Affinity condition** supports optional affinity-name scoping; its documented parameter does not establish that the Custom Value accepts it. The native UI prevented adding that condition template twice as separate columns, so it was removed before this single-column table was saved. The final table uses the built-in String custom value and contains no custom JavaScript expression. See the [condition-specific contract](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities/personalize-a-page-using-affinities.html).

## Verified walkthrough

Use an assigned Daniel account. The accepted workers-compensation journeys used **`daniel.03`** on preview and **`daniel.04`** on production, both generation **0**. Daniel's known profile remains a Prairie Oak business-insurance producer with Illinois and Texas licenses and the same imported attributes throughout the journey.

1. Sign in as the assigned Daniel account, copy its active `udlIdentity.id` from [production profile details](https://liberty-mutual-agent-portal.vercel.app/api/portal/bootstrap), then inspect that identifier in **Performance → Profiles**. Record `session.profileGeneration` and existing `insurance_interest` scores before rehearsal. The fixture map contains only the original seed identities. Establish that the intended baseline is actually available. Record the host, identity generation and starting score/variant; do not infer a fresh profile from a new login.
2. Confirm the saved Products configuration is available for normal delivery, then open `/products?state=IL` and record the neutral spotlight. Confirm the selected risk state and catalog. If prior history already selects a topic, resolve the starting profile deliberately rather than calling that a neutral baseline.
3. Open **Learning & resources**, choose **Workers compensation** under **Popular**, then select **Read resource** for **Workers compensation: an Illinois starting point**. After browser **Back**, choose **Workers compensation** under **Popular** again before selecting **Read resource** for **Workers compensation: a Texas starting point**. The return navigation clears the library query; do not assume the focused results persist. Observe native page events and the resulting `insurance_interest.workers_compensation` score. In the accepted journey, the first Illinois visit showed 1 view and score 1.00, and the Texas visit brought the count to 2. These observations do not guarantee a transition time or a fixed visit threshold for a profile with other history.
4. Return to `/products?state=IL`. Inspect the saved **Top Affinity** input and workers-compensation datasource mapping in **Liberty Mutual - Product interest spotlight**, then verify the matching headline and CTA for the same Daniel profile whose score you inspected. Record the native score, saved mapping and rendered result, with Daniel’s known attributes and selected risk state unchanged. If the native score or rendered topic is not ready, record that outcome; do not force a variant to complete the demonstration.
5. Open the preparation CTA and verify retained Illinois context. Confirm product availability and transaction authorization are unchanged. Affinity selects editorial relevance; server authorization still determines whether an account action is permitted.
6. Repeat with an independently checked Maya starting profile: personal-products and household-renewal visits should build her native household affinity, which maps to the household spotlight. Verify its Texas-preserving CTA. Then use an independently checked Elena profile with no affinities and confirm neutral content after signing out the other agents.

The accepted rehearsals on production and preview correlated populated native scores with the two matching authored spotlights and preserved risk state through both CTAs. Elena’s no-affinity comparison retained neutral content on both hosts. The selector remains the saved native table; no local selector or injected score was added. Raw decision diagnostics are optional advanced investigation and are not required presenter steps. Record a new rehearsal against the actual starting profile, because previous history remains. The [QA record](qa-affinity-personalization-2026-09-13.md) preserves both the initial failures and the successful correction.

## Rehearsal identity and reset boundaries

The preview and production portal have separate operational namespaces and share the Sitecore tenant. Their original seed identities can share native history. An on-demand restart creates a new profile set scoped to the selected environment; its identity cannot be inferred from the numeric generation alone. Published content and native decision configuration remain shared.

Logging out does not erase native history. A `saved-work` reset creates a new operational run for the pack while retaining the native identifier and historical events. Neither action resets affinity scores or establishes a clean experiment assignment.

A `restart` affects all seven personas in the **selected host’s reviewer pack**. It creates a fresh native profile set on demand, verifies all seven imports, then activates the set, starts a fresh operational run and invalidates existing application sessions. Earlier profiles and their history remain, and there is no preallocated four-set limit. Coordinate the pack, wait for a completed receipt, sign in again, and inspect the active identifiers and starting scores before tagged browsing. Pending or failed verification leaves the previous pack active. Follow the [operator reset runbook](../examples/liberty-mutual-agent-portal/docs/auth-and-data.md#durable-work-and-resetting); do not reimport the same person as a substitute for deleting native history.

## Acceptance record

| Check | Status |
| --- | --- |
| Component, dedicated Products layout/placeholder model and datasource seeds | Implemented in PR #21 |
| Four focused render scenarios: hero replacement, unchanged catalog, valid/invalid state navigation, datasource fallback/editor behavior and product-detail isolation | Passed within the application test run |
| Application validation | 93 tests, lint, typecheck and connected build/CI passed; initial and corrected evidence are separated in QA |
| Vercel deployments | Corrected preview `cd96c0d` and production merge `b99e3ca` Ready; actual journeys verified separately |
| Existing Workspace native personalization regression | 37/37 on corrected production and 37/37 on corrected preview under Node 24; separate from affinity acceptance |
| Native Affinities availability and five page assignments | Observed and saved |
| Products native layout assignment and spotlight placement | Configured on English version 2; Available Renderings updated |
| Three authored ProductSpotlight datasources | Native workflow approval and publication completed |
| Native decision table and topic variant mapping | Live as Liberty Mutual - Product interest spotlight; one built-in Top Affinity String column |
| Built-in score selection and equal-score algorithm | Native UI source inspected: highest numeric score; equal scores retain first encountered value; no topic-priority guarantee |
| Published Products page/datasources and neutral rendering | Verified; both hosts selected both topic variants after tagged-page visits |
| Page-event naming contract | Deployed correction sends CMS `route.name`; ordinary browsing populates native scores |
| Native profile scoring | Daniel and Maya `.03` on preview and `.04` on production, generation 0, each built 2 views and score 1.00 for their respective topics |
| Neutral comparison and signed-in user switching | Passed on both hosts: Elena `.04` had no affinities and neutral Products content after Daniel and Maya |
| Production and preview affinity runtime acceptance | Passed for both topics, neutral comparison and state-preserving CTAs; raw decision receipt not separately captured |
| Production deployment and verification | Merge `b99e3ca` deployed; both topic journeys, neutral comparison, state-preserving CTAs and 37/37 Workspace checks passed; see [production evidence](qa-affinity-personalization-2026-09-13.md#production-verification) |

Application and serialization checks do not establish transfer of native affinity configuration, personalization decisions or profile history to another environment. Preserve their native setup and runtime evidence independently.
