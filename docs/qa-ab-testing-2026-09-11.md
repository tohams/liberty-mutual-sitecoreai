# Resources A/B test evidence — September 11, 2026 UTC

**Native test in progress; functional delivery and native goal-page ingestion verified.** PR #18 fixed the missing `guestRef`. PR #19 preview and production each retained B through two guide-and-back journeys without extra Resources prefetch requests, and production also completed an accepted native A journey. The native report now contains **3** control and **1** B unique visits, while aggregate goal attribution remains open. The earlier production treatment change did not recur, and its exact cause remains unproven. This record preserves the earlier failure alongside configuration, delivery and event evidence. It supports [loop 8](demo-loops.md#loop-8-a-clearer-next-step), with the definition and remaining checks in [ab-testing.md](ab-testing.md). It does not establish a winner or business lift.

## Release and native configuration

The tracking-readiness change in [PR #17](https://github.com/tohams/liberty-mutual-sitecoreai/pull/17) merged as `0d240f4cdc70d4b81ce185a9c32be6bc44cf102e`, after **88 application tests passed**. [Main CI run 34608891336](https://github.com/tohams/liberty-mutual-sitecoreai/actions/runs/34608891336) passed Offline validation and Connected production build. Production deployment `6394915923` reached success at **14:14:27 UTC**.

The initial native Performance inspection showed **Test is in progress**, A and B, and **No Data Available** for **Liberty Mutual Small Business Resource CTA**. Resources English version **2**, named **Small-business CTA experiment**, and its B datasource were approved and published. The exact activation timestamp was not captured; the dashboard's Published label reflected test creation and is not used as an activation timestamp.

| Native setting | Observed configuration |
| --- | --- |
| A / B | **Start with small business** / **Build your small-business practice** |
| Goal | **Increase page views**, `/resources/expand-small-business-practice` |
| Allocation and participation | **50/50**, **100%**, **All visitors**; normal portal access requires authentication |
| Automated outcomes | Return traffic to the control for both a winning and an inconclusive result |
| Statistical settings | **2%** base rate, **20%** minimum detectable difference, **95%** confidence; **21,110 visits per variant** under [Sitecore's documented defaults](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/configure-a-b-n-test-settings.html) |

No additional role, agency, state or growth-cohort targeting was configured. The native experiment's flow-definition ID was not exposed by the inspected Authoring API or item fields. Component, rule and variation identifiers must not be presented as that ID.

## Published content and preservation

At **14:17:15 UTC**, **18/18** read-only native Edge checks passed. The control and explicitly requested B layout each delivered the expected AgentGuidance datasource, headline, label and shared destination. ResourceSearch remained the first component, with exactly one AgentGuidance after it; the goal page remained published with its ResourceArticle. The native SDK discovered the B variant.

The comparison of control and B found only the action-link text changed. Search's effective parameters, rendering, datasource, order and rules were unchanged; Page Builder normalized parameter encoding in the Resources final layout. The original guidance, goal article and workspace fields were preserved. These checks establish published content availability and scope; explicit variant requests do not prove native traffic assignment.

Exactly two native serialized items were copied into the repository: Resources with approved version 2 and `resources-guidance_var2`. Resources shared fields and version 1 were preserved. Content-module serialization validation passed, and the read-only seed validator passed **230 scoped items, 12 resources and 112 UDL identities**. Content push behavior remains **CreateOnly**. Capturing these items does not establish transfer of the cloud test definition or its reporting history to another environment.

## Normal browser and native profile observations

The implementation owner used production **Avery, pack `01`, generation `0`**. The native profile was `5295e6b4-7d26-451c-80ff-1b6883dd15d1`, with observed browser/client `fda26bc9-ad91-4ea4-9486-551e8ec103d9`.

| Time UTC | Observation |
| --- | --- |
| 14:18:38 | Resources displayed A's **Start with small business** copy |
| 14:19:10 | First growth-guide page view visible in the actual native profile |
| 14:19:24 | Returning to Resources displayed the same A copy |
| 14:19:43 | A second visit to the growth guide appeared as another native page view |

The native profile needed a full refresh to reveal the recent events. The goal's observed page-variant identifier was `2bf3a728a6315a90a3238922aca62f23_en_default`. These observations verify that repeat destination visits reached Sitecore for the same browser/profile. They do not establish attributed experiment conversions. Fresh post-publication checks of Avery, Jordan, Maya, Priya and Marcus all displayed A. No operational records were written during those browser checks. The later diagnostic below explains the A-only behavior; it must not be reported as successful control assignment.

## Native decision failure and second correction

The actual Vercel trace for Maya's Resources request at **14:21:39.794 UTC** showed the middleware calling native `/v1/personalize`; this established execution, not a successful decision. Two bounded diagnostic calls followed: HTTP **400** at **14:25:17 UTC**, then the actionable error **Missing required parameter: guestRef** at **14:26:24 UTC**. No automatic retries, browser/profile creation, view events, saved-work writes or tenant-configuration changes occurred in these diagnostics. They are not retrospective traces of every earlier browser request.

The custom decision adapter supplied `browserId` but omitted the linked native profile's `guestRef`. The pinned SDK includes both. The adapter's error handling returned neutral content, which on this unpersonalized Resources component is visually identical to A. This is a diagnosed request-contract failure, not a conclusion about the probability of five control allocations.

The separate correction in [PR #18](https://github.com/tohams/liberty-mutual-sitecoreai/pull/18), head `86a7c227cddcbf9aa3e80e7d73bd8e2074b0cdee`, passed **92 application tests** and CI, then merged as `7c2973a15396426d279d6804f1434085c5ccc99f`. It reads the profile reference returned for the current browser without caching across requests, supplies `guestRef` and `browserId` together, and applies one deadline across identity resolution, lookup and decision. [Main CI run 34611375054](https://github.com/tohams/liberty-mutual-sitecoreai/actions/runs/34611375054) passed. Production deployment `6395387814` (`J44c2er5a441SxnahECVKLG8k4Fp`) reached Ready at **14:39:29 UTC**. The first PR's 88-test and repeat-view evidence remains a separate page-view-ingestion result.

## Corrected preview observations

Normal preview visits used pack `02`, generation `0`, without forced-variant parameters.

| Person/time UTC | Observed result |
| --- | --- |
| Daniel, 14:37:48 | Resources displayed A, **Start with small business**, using browser `22ef20ab-9cc2-405c-8b1f-4158484c9c39` |
| Daniel diagnostic, 14:39:07 | A separate unforced native decision for that browser returned HTTP **200** and `accepted-control`; the current-browser profile lookup also returned **200** |
| Maya, 14:39:08 | Resources displayed B, **Build your small-business practice**, with the intended goal destination |
| Maya, 14:39:30 | Clicking B opened the guide; the same native browser/profile recorded its goal-page view |
| Maya, 14:39:43 | Returning to Resources retained B |

Maya's browser/client was `014c32a4-7637-4736-92e6-5811820a4c68`, native profile `036b6327-dddc-4dd8-a08b-689b3a817352`. Its Engagement history showed the Resources and goal views; the goal page-variant ID was `2bf3a728a6315a90a3238922aca62f23_en_default`. The preview browser was signed out afterward.

The Daniel diagnostic performed one decision and no portal page GET or VIEW event. It proves an accepted unforced control receipt for the current browser, not the exact earlier page's decision or a conversion. Maya's normal navigation proves B delivery and same-browser goal-event ingestion. Native aggregate experiment attribution remains a separate pending check.

## Corrected production observations

Production Daniel, pack `01`, displayed A at **14:40:52 UTC**, opened the guide with a native VIEW at **14:41:38**, and retained A after returning at approximately **14:42**. The browser/client was `66dbe56b-be47-4881-a6ee-f14dfde89ad3`; the goal event used the expected page-variant ID.

A separate unforced native decision for that browser at **14:42:13 UTC** returned HTTP **200**, `accepted-control`, with variant `e144a961809e570f9e26c1cdd5d4e99b_default`. That diagnostic submitted no VIEW event and does not retrospectively identify the exact earlier request's decision.

Production Maya, pack `02`, displayed B at **14:42:57 UTC**, opened its linked guide and recorded a native goal VIEW at **14:43:30**. Her browser/client was `01416204-9b90-4e7c-9586-17a67edda26f`, linked to profile `036b6327-dddc-4dd8-a08b-689b3a817352`. Returning to Resources at **14:44:14** visibly showed A. The initial B delivery and same-browser goal event passed; production B did not remain stable on this return.

The actual return navigation's Vercel request at **14:44:13.434 UTC** (`m69vz-1789137853434-40064b6ebaef`) made a native browser GET and decision POST, completed middleware in **253 ms**, and rewrote with the component's explicit default variant. The corrected code emits that explicit default only for an accepted native control receipt; errors return an empty variant. This return was a fresh accepted native A, not the earlier timeout/error fallback. Later requests at **14:44:13.788** and **14:44:14.053** for the same browser rewrote to B, and a separate diagnostic at **14:45:47** accepted B. These observations remain as historical evidence; the treatment change did not recur in the later PR #19 journeys, but its exact cause remains unproven. They do not establish persistent allocation or aggregate conversion attribution.

## Speculative-navigation readiness and verified preview

Vercel marked background requests as **Prefetch Yes**, and those requests invoked the native experiment. Commit `3dc4d12` introduces shared `PortalLink` and `PortalContentLink` wrappers that enforce `prefetch={false}` at 12 portal navigation/content call sites. Commit `4da38ea` also excludes tests, fixtures and two pure helpers from generated CMS component registration; regeneration retained the three intended native portal components, required placeholder and SDK built-ins. [PR #19](https://github.com/tohams/liberty-mutual-sitecoreai/pull/19) passed the existing **92 tests**, typecheck, lint and CI, then merged as `e3fc3401f9c2855e718ee98b106a909c79a39411` at **15:07:10 UTC**. [Post-merge CI run 34614216825](https://github.com/tohams/liberty-mutual-sitecoreai/actions/runs/34614216825) also passed. The navigation policy prevents speculative link requests from entering native decisioning. It does not establish a causal explanation for the earlier genuine accepted-A return or prove persistent assignment.

A native Performance inspection at **14:54–14:55 UTC** still showed **Test is in progress**, **0** for A and **0** for B, with **No Data Available**. The observed dashboard test selector is a friendly definition key, recorded in the [configuration table](ab-testing.md#native-configuration-and-acceptance-record), not an exposed flow UUID. The creation timestamp encoded in that key is not used as an activation timestamp.

Preview deployment `7J9CVu9pdvjWpStpMZo94xGNwvti`, head `4da38eaf6c7d18056dba0984c4bc929c24f0d0e1`, reached Ready at **15:03:21 UTC**. Maya, pack `02`, generation `0`, used a new browser/client `4120f29e-f496-452f-97b5-a18b1baadcce`, linked to native profile `036b6327-dddc-4dd8-a08b-689b3a817352`. Normal navigation showed B at **15:05:13**, reached the goal with a native VIEW at **15:05:31**, returned to B at **15:05:55**, reached the goal again with a VIEW at **15:06:16**, and returned to B at **15:06:32**. The goal used the expected native page-variant ID `2bf3a728a6315a90a3238922aca62f23_en_default`.

The Vercel trace contained exactly five matching page GETs for that journey: three Resources requests and two goal requests, with no extra Resources prefetch. The first Resources request performed the same-browser native GET and decision POST within **273 ms** of middleware execution. Preview Maya signed out afterward. This closes the preview functional check for this release. The observed return consistency is evidence for these journeys, not a guarantee of future native assignment.

## PR #19 production B verification

Production deployment `BEWQRegf2gsHyrQxoakV3yPVNAaC`, GitHub deployment `6395913069`, was Ready by **15:07:47 UTC** for merge `e3fc3401f9c2855e718ee98b106a909c79a39411`. Maya, pack `02`, generation `0`, retained the **same production browser/client** `01416204-9b90-4e7c-9586-17a67edda26f` and native profile `036b6327-dddc-4dd8-a08b-689b3a817352` used during the earlier treatment change. No identity reset intervened.

Normal navigation showed B with a Resources VIEW at **15:08:41 UTC**, reached the guide with a native goal VIEW at **15:08:53**, returned to B at **15:09:07**, reached the guide again with a goal VIEW at **15:09:25**, and returned to B at **15:09:49**. All three Resources renders displayed B. Native UI verified the same browser/profile and the expected goal-page identifier `2bf3a728a6315a90a3238922aca62f23_en_default`.

The Vercel trace again matched exactly three Resources and two goal GETs, with no extra Resources prefetch during the retest period. Maya signed out afterward. Production B delivery, two goal events and both returns passed. The earlier treatment change did not recur; this observation does not prove why it occurred or guarantee permanent assignment. The accepted-control journey below separately verifies A.

## PR #19 production A verification

Daniel, pack `01`, generation `0`, used browser/client `7acbc570-05a9-4876-bdc1-a72bfa91cb3d`. Normal production navigation displayed A with a Resources VIEW at **15:11:13 UTC**, recorded the linked guide VIEW at **15:11:31**, and returned to A with a Resources VIEW at **15:11:54**. The goal event used `2bf3a728a6315a90a3238922aca62f23_en_default`. Native Search also returned Daniel's expected **11** resources, limited to Illinois, Texas and nationwide guidance.

The actual initial Resources request at **15:11:13.017 UTC** (`kr45r-1789139473017-985cfd5eb5c8`) performed a native browser GET for that same client and a decision POST, completed middleware in **293 ms**, and used the explicit native component-default rewrite. The code emits that rewrite only for an accepted native control receipt. This establishes accepted A for the actual page request, independently of the earlier standalone diagnostics.

The public browser/show response returned `customer.ref` `82f5faab-1808-41c9-b052-9497687494a4`, whose direct Performance page was an anonymous retired alias without engagement sessions. Searching **Performance → Profiles → Client ID** for Daniel's observed client located canonical profile `64032145-ab91-46d1-9728-4f84cc6c23ac`. Its **Engagement** showed all three native events under the same client. The empty alias page was therefore not evidence of failed identity or event ingestion. The application follows the pinned SDK's returned-reference contract; it does not add custom alias resolution or infer that aliases caused the earlier treatment change.

Sitecore documents that a matching identity event merges the visitor's session data into the identified profile and retires the duplicate. That supports the observed profile lifecycle; it does not establish a public guarantee that a returned alias will resolve correctly for every A/B metric. The canonical Client ID match and exact event sequence are the evidence for ingestion here; aggregate goal attribution remains a separate check. See [Sitecore identity rules](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/identity-resolution/identity-rules.html).

Production A delivery, accepted-control decision, goal-page ingestion and return passed. Maya and Daniel signed out after their checks, and the temporary QA tabs were closed. No operational records or resets were part of these A/B journeys.

## Final native reporting inspection

At **15:16:30 UTC**, native Performance showed **Test is in progress** and had partially populated its visit counts:

| Native result | A: AgentGuidance (control) | B: Variant B |
| --- | --- | --- |
| Unique visits | **3** | **1** |
| Page-view conversion | **0% ± 0.00%** | **0% ± 0.00%** |
| Confidence | **N/A** | **N/A** |
| Uplift | **N/A** | **N/A ± 0.00%** |

The leading-variant panel still showed **No Data Available**. The goal-over-time chart contained one **0%** point for September 11, and Performance Overview/Details showed **No Search Results**. Native visit aggregates are now visible, but the report does not yet confirm attribution of the goal events already verified in native Engagement. These are partial synthetic-traffic results, not a statistically meaningful 3:1 allocation finding or evidence of a winner. Sitecore documents that reporting can take up to 24 hours to appear; that processing allowance does not prove the pending goal attribution. See [Sitecore's reporting guidance](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/start-an-a-b-n-test.html).

## Regression and remaining acceptance

The PR #17 regression baseline passed **37/37 native personalization assertions on production and 37/37 on preview** for pack `04`, with no decision retries. Native Search passed state filters, nationwide inclusion, other facets, query, six-item pagination and empty results. Totals remained **12 overall, 11 for Daniel, 12 for Maya, 10 for Florida plus nationwide, and 9 nationwide**; Daniel's State guidance facet returned **2**, and his workers-compensation query returned **4**. After PR #18 reached production, the native workspace harness passed **37/37 on each host again**. PR #19 subsequently passed **37/37 on each host** for pack `01`, with no Resources A/B or forced-variant requests in either separate harness; each logged out its four sessions.

Each regression harness performed no saved-work mutations or resets and logged out all of its portal sessions. This does not erase the native page views generated by the checks. Production and preview share native identity/history for matching pack/person/generation, even though operational saved work is isolated.

Functional delivery checks are complete. The remaining measurement check is native aggregate attribution/reporting for the configured goal. The earlier production return-treatment change did not recur on either host; successful new journeys do not establish its cause. No permanent assignment, attributed goal totals, statistical winner or business lift are claimed. A page-view goal does not prove the Resources CTA was the navigation source; the guide also has other entry links.

## Evidence provenance

Machine evidence remains outside Git in the operator's `audits/` directory: `pr17-production-regressions-2026-09-11.json`, `native-ab-published-content-2026-09-11.json`, `native-ab-edge-discovery-2026-09-11.json`, `resources-ab-published-v2-semantic-review-2026-09-11.json`, `resources-ab-two-file-serialization-copy-2026-09-11.json`, `native-ab-one-decision-diagnostic-2026-09-11.json` and `native-ab-second-decision-diagnostic-2026-09-11.json`. The last two contain the bounded decision diagnostics described above; the content checks were read-only.

Post-correction evidence includes `pr19-production-regression-2026-09-11.json`, `pr19-preview-regression-2026-09-11.json`, `pr18-production-regressions-2026-09-11.json`, `native-ab-preview-unforced-receipt-2026-09-11.json`, `native-ab-production-unforced-receipt-2026-09-11.json` and `native-ab-production-maya-return-diagnostic-2026-09-11.json`. The receipt helpers performed new diagnostic decisions and are not retrospective browser traces. Native UI, normal navigation and Vercel observations were recorded by the implementation owner; the initial configuration and failure are retained in `native-ab-browser-observations-2026-09-11.md`. No credentials or cookies are included here.
