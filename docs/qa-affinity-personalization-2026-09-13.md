# Product affinity spotlight — runtime QA

**September 13, 2026 UTC.** The corrected preview now builds native affinities and selects both topic spotlights through ordinary identified-agent journeys. The application had sent URL paths where native affinity assignments expect CMS page names. Daniel’s workers-compensation journey and Maya’s household journey each increased the matching native view count from zero to two and rendered the authored topic hero. An independently checked Elena profile retained the neutral spotlight, and the existing Workspace regression passed all 37 preview checks. Preview runtime acceptance has passed; production verification is recorded separately after deployment. The earlier failed journeys are preserved below.

## Initial configuration and application validation

The check used the [designated preview portal](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login), connected to the existing `liberty-mutual-agent-portal` site. Application commit `de30ff301acdb32621138d75db6d4db672a6e428` in [PR #21](https://github.com/tohams/liberty-mutual-sitecoreai/pull/21) passed 93 tests, lint, typecheck and a production build under Node 24. GitHub CI passed; the preview and its stable alias were Ready at that commit. These initial checks precede the corrected preview journeys recorded below; they do not establish production deployment or acceptance.

| Check | Observed result |
| --- | --- |
| Products page | English version 2 is live with `ProductsLayout` and `ProductSpotlight` in `headless-products-spotlight` |
| Datasources | Neutral, workers-compensation and household items are approved and published |
| Decision table | **Liberty Mutual - Product interest spotlight** is live, with one built-in `top_affinity_value` String input and exact topic matches mapped to the existing datasources |
| Affinity assignments | All five [documented page assignments](affinity-personalization.md#saved-native-affinity-assignments) were visibly saved; `/products` remains untagged |
| Analytics settings | The site's analytics identifier exists, is assigned to English, and analytics/personalization is enabled |
| Native page-event context | The workers-compensation events use site `liberty-mutual-agent-portal`, language `EN`, and the correct Illinois/Texas page-variant identifiers |
| Existing authoring content | Before/after comparison found all fields and metadata unchanged for six surrounding items: Workspace, Resources, its control/challenger guidance, Search configuration and the A/B goal page |
| Existing Workspace personalization | Final native regression passed **37/37 on production and 37/37 on preview**, run sequentially under Node 24.19.0 without resets, decision retries or native configuration changes |

The Workspace regression verifies the existing [known-attribute personalization](../authoring/personalization/README.md); it does not test affinity scoring. The six-item comparison covers authoring state and does not update the Resources experiment's [existing A/B evidence](qa-ab-testing-2026-09-11.md).

## Initial journeys — before the page-name correction

Both journeys used ordinary authenticated browsing with each agent's known attributes retained. No operational work was changed, no pack was reset and no affinity score was injected.

| Journey | Actual sequence | Result |
| --- | --- | --- |
| Workers-compensation interest | Neutral Products baseline; actual visits to `/resources/illinois-workers-compensation` and `/resources/texas-workers-compensation`, including a later Illinois visit; return to Products | Products retained **Protection built around the business you know.** The inspected native profile had `traits.affinities: {}`; no topic-score population was observed |
| Household interest | Neutral Products baseline; `/products/personal?state=TX` → `/resources/prepare-a-household-renewal?state=TX` → `/products?state=TX` | Products retained the same neutral headline and Texas state selection. A fresh native profile Overview still showed **No affinities** |

For the household journey, native Engagement showed seven events in the inspected open web session. The displayed `requested_at` values place the personal-products event at **04:46 UTC** and the household-renewal and return-to-Products events at **04:47 UTC**. The personal-products event carried language `EN` and the expected core page-variant identifier. These are minute-level timestamps displayed in native event data.

The Illinois Search link was also checked after an initially stale browser-automation snapshot suggested a navigation problem. Its actual anchor and bootstrap href were `/resources/illinois-workers-compensation`; fresh visual verification reached that exact URL and article. No application link defect was reproduced and no URL-handling change was made.

## Diagnostic boundary

During the initial failed journeys, the native **Top Affinity** built-in source was inspected: it selects the highest numeric score across `profile.traits.affinities` groups and retains the first encountered value on a tie. The UI exposes no affinity-name parameter for this custom-value input. The [component contract](affinity-personalization.md#saved-native-decision-and-built-in-contract) records the algorithm and its scope limits. At that stage, no populated score had been correlated with an authored topic variant; the neutral screen alone did not establish a specific `null` fallback decision.

An initial Channels navigation displayed a warning about missing analytics identifiers, including this site. The registry and English assignment were present and enabled, and the warning did not recur after a fresh reload. No restore action was performed. This observation has not established the cause of the missing affinity scores.

Sitecore documents near-real-time scoring during a session and persistence to the profile after session closure. A follow-up check found Daniel's earlier session closed with no visible profile affinities, so an open-session display delay does not explain all of the observations. No visit threshold or backend failure has been established. The event-to-assignment mismatch below is the next correction being verified.

## Page-name correction

Read-only inspection of Sitecore's publicly served Affinities editor showed that it saves and reads `siteConfigs[selectedSite.name].pageConfigs[selectedPage.name].tags`. The selected page name is the authoring hierarchy record's `name`; the save lookup does not use its URL, item ID, variant ID or a language subkey.

| Event attribute | Initial implementation | Corrected contract |
| --- | --- | --- |
| Page | URL path, such as `/resources/illinois-workers-compensation` | CMS `route.name`, such as `illinois-workers-compensation` |
| Page variant ID | SDK-generated item/language/variant identifier | Retain the SDK-generated identifier |
| Page language | Fixed `EN` | CMS route language, with the configured default as fallback |
| URL path | Navigation and native page name | Navigation and local event deduplication only |

The page-name mismatch is directly supported by the native save code and the application's tracking code. The language casing is not an independently proven cause. The corrected event follows the SDK's CMS route metadata rather than trying to score interests in the application. No native assignment, known agent attribute or decision table needs to be changed for this correction.

The corrected preview journeys below establish native scoring for both topics and the resulting authored content. Initial failures above remain historical evidence. They were not resolved by resetting the profile, adding scores or changing the agent’s known attributes.

## Corrected preview journey — workers compensation passed

On preview commit `cd96c0d`, the implementation owner used **`daniel.03`**, profile generation **0**, in ordinary browser navigation. The canonical native profile initially showed **No affinities** after its earlier closed session. The same identity and imported attributes were retained throughout.

| UTC time | Action | Observed native or rendered result |
| --- | --- | --- |
| 16:58:58 | Open Products with Illinois selected | Neutral **Protection built around the business you know.** |
| 16:59:08 | Visit the Illinois workers-compensation article | Native `insurance_interest.workers_compensation` appeared with **1 view**, **score 1.00** |
| 16:59:34 | Visit the Texas workers-compensation article | The native profile recorded **2 views**, **score 1.00**; `lastViewAt` was `2026-09-13T16:59:34.204711705Z` |
| 16:59:41 | Return to Products | **Build a stronger workers compensation conversation** and **Review account preparation** rendered |
| After selection | Follow the authored CTA | `/resources/build-a-bop-submission?state=IL`; Illinois context retained |

The native profile inspector confirmed the persisted structure `traits.affinities.insurance_interest.workers_compensation = {views: 2, score: 1, lastViewAt: ...}`. The returned Products page retained 17 catalog results within Daniel’s Illinois/Texas scope. Its native event used page name `products` and the normal SDK-generated default page-variant identifier. Native event inspection displayed language `EN`; the platform normalized the route-derived language, so casing was not the demonstrated cause.

No score was injected, no variant was forced and no known attribute or profile generation was changed. This positively verifies the workers-compensation preview journey and state-preserving CTA. Production delivery remains a separate check.

## Corrected preview journey — household passed

The implementation owner then used **`maya.03`**, profile generation **0**, on the same corrected preview. The native starting profile showed **No affinities**, and Products displayed the neutral hero with Texas selected.

1. Open `/products/personal?state=TX` through ordinary navigation.
2. Follow its preparation link to `/resources/prepare-a-household-renewal?state=TX`.
3. Inspect the same native profile: `traits.affinities.insurance_interest.household` showed **2 views**, **score 1.00**, with `lastViewAt` of `2026-09-13T17:01:35.090831768Z`.
4. Return to Products and verify **Make the next household renewal conversation count** and **Review the household renewal checklist**.
5. Follow the authored CTA and verify the actual household-renewal resource retained `state=TX`.

Maya’s known attributes and generation remained unchanged, and no score or variant was supplied by the application. The 2-view native snapshot was captured before the final CTA visit; opening that tagged resource again can add a subsequent view. This independently verifies the second topic without using Daniel’s workers-compensation history.

## Comparison and preview acceptance

After Daniel and Maya, the implementation owner signed out and used **`elena.04`** in the same browser. Her independently inspected native profile showed **No affinities** before login. Products retained **Protection built around the business you know.**, with Illinois selected and her Illinois/Texas/Florida scope available. The earlier users’ topic selection did not carry over to Elena. The session was then signed out and `/login` confirmed.

The existing known-attribute Workspace personalization verifier passed **37/37 on the corrected preview under Node 24**, with no resets. This checks the surrounding role/cohort experience separately from the two topic journeys.

| Preview acceptance | Result |
| --- | --- |
| Matching native event page names | Passed: CMS page names align with saved affinity keys |
| Native workers-compensation affinity | Passed: 0 → 1 → 2 views; score 1.00 |
| Native household affinity | Passed: 0 → 2 views; score 1.00 |
| Authored topic selection | Passed: corresponding Products hero and CTA rendered for each agent |
| Neutral comparison and user switching | Passed: Elena had no affinities and retained neutral content after the two topic journeys |
| Selected risk state through both CTAs | Passed: Daniel retained Illinois; Maya retained Texas |
| Existing Workspace personalization | Passed: 37/37 preview checks |

These results correlate native profile traits with authored selections on a component whose selector remains native Sitecore decisioning. No client-side topic selector, score insertion or forced variant was introduced. A separate raw decision-input receipt was not captured; the evidence consists of the native profile inspector, saved decision configuration and ordinary rendered journey. The neutral comparison supports the no-affinity fallback; an additional populated-but-unmatched affinity value was not injected merely to manufacture another case.

**Preview runtime acceptance: passed.** The original failure was the mismatch between event page paths and the native CMS page-name keys. The corrected integration demonstrably produces affinities in the SitecoreAI profiles and the matching portal content.

## Production verification

Pending deployment of the accepted correction and a production check. Passing preview acceptance does not establish the deployed production commit or its runtime behavior. Keep this entry separate from the completed preview evidence.

## Evidence provenance

The implementation owner observed native setup, profile/Engagement views and browser journeys. Supporting local evidence is retained outside Git in the operator's `audits/` directory, including `product-affinity-page-assignments-2026-09-13.json`, `product-affinity-site-page-identifiers-2026-09-13.json`, `product-affinity-browser-link-parity-2026-09-13.json`, `affinity-native-profile-inspection-2026-09-13.json`, `product-affinity-native-regression-comparison-2026-09-13.json` and `final-native-personalization-verification-2026-09-13.json`. A private support-request draft contains the correlation references; it has not been sent. The follow-up `affinity-page-name-key-evidence-2026-09-13.json` captures bounded native UI source excerpts and source URLs; `affinity-native-page-fields-2026-09-13.json` records the unchanged approved page identifiers and workflow state. The successful ordinary journeys, native profile values and comparison are consolidated in `affinity-fixed-runtime-evidence-2026-09-13.json`. This public record omits profile/client identifiers, author metadata and credentials.
