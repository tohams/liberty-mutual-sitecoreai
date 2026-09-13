# Product affinity spotlight — runtime QA

**September 13, 2026 UTC.** The ProductSpotlight implementation and native configuration are complete, but browsing-driven personalization has not passed runtime acceptance. Two identified synthetic agents visited pages assigned to different topics; both returned to the neutral Products headline, and neither inspected profile showed populated affinities. The unresolved step is native affinity-score population and its subsequent decision output; a platform root cause has not been established.

## Verified configuration and application

The check used the [designated preview portal](https://liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app/login), connected to the existing `liberty-mutual-agent-portal` site. Application commit `de30ff301acdb32621138d75db6d4db672a6e428` in [PR #21](https://github.com/tohams/liberty-mutual-sitecoreai/pull/21) passed 93 tests, lint, typecheck and a production build under Node 24. GitHub CI passed; the preview and its stable alias were Ready at that commit. This record covers preview affinity journeys; it does not establish production application deployment or production affinity acceptance.

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

## Observed journeys

Both journeys used ordinary authenticated browsing with each agent's known attributes retained. No operational work was changed, no pack was reset and no affinity score was injected.

| Journey | Actual sequence | Result |
| --- | --- | --- |
| Workers-compensation interest | Neutral Products baseline; actual visits to `/resources/illinois-workers-compensation` and `/resources/texas-workers-compensation`, including a later Illinois visit; return to Products | Products retained **Protection built around the business you know.** The inspected native profile had `traits.affinities: {}`; no topic-score population was observed |
| Household interest | Neutral Products baseline; `/products/personal?state=TX` → `/resources/prepare-a-household-renewal?state=TX` → `/products?state=TX` | Products retained the same neutral headline and Texas state selection. A fresh native profile Overview still showed **No affinities** |

For the household journey, native Engagement showed seven events in the inspected open web session. The displayed `requested_at` values place the personal-products event at **04:46 UTC** and the household-renewal and return-to-Products events at **04:47 UTC**. The personal-products event carried language `EN` and the expected core page-variant identifier. These are minute-level timestamps displayed in native event data.

The Illinois Search link was also checked after an initially stale browser-automation snapshot suggested a navigation problem. Its actual anchor and bootstrap href were `/resources/illinois-workers-compensation`; fresh visual verification reached that exact URL and article. No application link defect was reproduced and no URL-handling change was made.

## Diagnostic boundary

The native **Top Affinity** built-in source was inspected: it selects the highest numeric score across `profile.traits.affinities` groups and retains the first encountered value on a tie. The UI exposes no affinity-name parameter for this custom-value input. The [component contract](affinity-personalization.md#saved-native-decision-and-built-in-contract) records the algorithm and its scope limits. No runtime input/decision receipt has yet been correlated with a populated score and an authored topic variant; the neutral screen alone does not establish a specific `null` fallback decision.

An initial Channels navigation displayed a warning about missing analytics identifiers, including this site. The registry and English assignment were present and enabled, and the warning did not recur after a fresh reload. No restore action was performed. This observation has not established the cause of the missing affinity scores.

Native page events are visible, but no processing interval, visit threshold, session-boundary requirement or backend failure has been established. Investigation should trace the recorded tagged-page events through the site's affinity assignments into profile-score population, then inspect the built-in output and native decision for the subsequent Products request.

## Remaining acceptance

1. Establish why the observed tagged-page events have not produced visible profile affinities, using native configuration and processing evidence.
2. Observe one same-agent topic-score change, matching `top_affinity_value`, accepted native decision and rendered ProductSpotlight datasource without changing known attributes or forcing a variant.
3. Verify the other topic and an identified comparison; correlate the `null`/unmatched fallback with its actual native result. The current two neutral journeys are evidence of the gap, not positive topic coverage.
4. Follow a natively selected CTA with risk state retained and verify that catalog/transaction eligibility remains independent. Focused component/state tests already pass; the native topic journey must still reach this step.

Loop 9 remains a configuration walkthrough pending these checks. Keep the feature in review until the runtime gap is resolved and recorded. The final journey was signed out normally and its browser tab closed; native browsing history remains available for investigation.

## Evidence provenance

The implementation owner observed native setup, profile/Engagement views and browser journeys. Supporting local evidence is retained outside Git in the operator's `audits/` directory, including `product-affinity-page-assignments-2026-09-13.json`, `product-affinity-site-page-identifiers-2026-09-13.json`, `product-affinity-browser-link-parity-2026-09-13.json`, `affinity-native-profile-inspection-2026-09-13.json`, `product-affinity-native-regression-comparison-2026-09-13.json` and `final-native-personalization-verification-2026-09-13.json`. A private support-request draft contains the correlation references; it has not been sent. This public record omits profile/client identifiers, author metadata and credentials.
